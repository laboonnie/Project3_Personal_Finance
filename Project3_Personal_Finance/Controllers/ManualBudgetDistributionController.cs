
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Data;
using System.Security.Claims;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/Budgets/manual-distribute")]
    public class ManualBudgetDistributionController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public ManualBudgetDistributionController(
            PersonalFinanceDbContext context)
        {
            _context = context;
        }

        public class JarAllocationDto
        {
            public int JarId { get; set; }
            public decimal Amount { get; set; }
        }

        public class ManualDistributionDto
        {
            public int Month { get; set; }
            public int Year { get; set; }

            public List<JarAllocationDto> Allocations { get; set; }
                = new();
        }

        [HttpPost]
        public async Task<IActionResult> Save(
            [FromBody] ManualDistributionDto request)
        {
            var claim = User.FindFirst(
                ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(claim, out int userId))
                return Unauthorized();

            if (request == null ||
                request.Month < 1 ||
                request.Month > 12 ||
                request.Year < 2000 ||
                request.Year > 2100)
            {
                return BadRequest(new
                {
                    message = "Invalid month or year."
                });
            }

            await using var dbTransaction =
                await _context.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable);

            try
            {
                // 1. Lấy danh sách lọ
                var jars = await _context.FinancialJars
                    .Select(j => j.Id)
                    .ToListAsync();

                var jarIds = jars.ToHashSet();

                // 2. Kiểm tra đủ các lọ
                if (request.Allocations == null ||
                    request.Allocations.Count != jars.Count ||
                    request.Allocations
                        .Select(x => x.JarId)
                        .Distinct()
                        .Count() != jars.Count ||
                    request.Allocations.Any(x =>
                        !jarIds.Contains(x.JarId) ||
                        x.Amount < 0))
                {
                    return BadRequest(new
                    {
                        message =
                            "Enter a non-negative allocation " +
                            "for every jar exactly once."
                    });
                }

                // 3. Khoảng thời gian được chọn
                var start = new DateTime(
                    request.Year,
                    request.Month,
                    1);

                var end = start.AddMonths(1);

                // 4. Tổng thu nhập thực tế
                decimal income = await _context.Transactions
                    .Where(t =>
                        t.UserId == userId &&
                        t.Type == "Income" &&
                        t.TransactionDate >= start &&
                        t.TransactionDate < end)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0m;

                // 5. Tổng ngân sách người dùng muốn chia
                decimal allocated =
                    request.Allocations.Sum(x => x.Amount);

                if (allocated > income)
                {
                    return BadRequest(new
                    {
                        message =
                            $"Allocated amount ({allocated}) " +
                            $"exceeds monthly income ({income})."
                    });
                }

                // 6. Tiền được chuyển từ tháng trước
                var carriedIn = await _context.BudgetCarriedOvers
                    .Where(c =>
                        c.UserId == userId &&
                        c.ToMonth == request.Month &&
                        c.ToYear == request.Year)
                    .GroupBy(c => c.JarId)
                    .Select(g => new
                    {
                        JarId = g.Key,
                        Amount = g.Sum(c => c.CarriedAmount)
                    })
                    .ToListAsync();

                var incoming = carriedIn.ToDictionary(
                    x => x.JarId,
                    x => x.Amount);

                // 7. Tiền đã chuyển sang tháng sau
                var carriedOut = await _context.BudgetCarriedOvers
                    .Where(c =>
                        c.UserId == userId &&
                        c.FromMonth == request.Month &&
                        c.FromYear == request.Year)
                    .GroupBy(c => c.JarId)
                    .Select(g => new
                    {
                        JarId = g.Key,
                        Amount = g.Sum(c => c.CarriedAmount)
                    })
                    .ToListAsync();

                var outgoing = carriedOut.ToDictionary(
                    x => x.JarId,
                    x => x.Amount);

                // 8. Kiểm tra tiền đã chuyển đi
                // Không khóa toàn bộ tháng khi có giao dịch.
                // Chỉ bảo vệ những khoản tiền đã chuyển.
                foreach (var item in request.Allocations)
                {
                    decimal incomingAmount =
                        incoming.GetValueOrDefault(item.JarId);

                    decimal outgoingAmount =
                        outgoing.GetValueOrDefault(item.JarId);

                    if (item.Amount + incomingAmount <
                        outgoingAmount)
                    {
                        return BadRequest(new
                        {
                            message =
                                $"Jar {item.JarId} must retain " +
                                $"enough budget to cover " +
                                $"previously transferred money."
                        });
                    }
                }

                // 9. Lấy ngân sách hiện tại
                var existing = await _context.Budgets
                    .Where(b =>
                        b.UserId == userId &&
                        b.Month == request.Month &&
                        b.Year == request.Year)
                    .ToListAsync();

                // Tránh cập nhật nhầm khi có dữ liệu trùng
                if (existing
                    .GroupBy(b => b.JarId)
                    .Any(g => g.Count() > 1))
                {
                    return Conflict(new
                    {
                        message =
                            "Duplicate budget rows detected."
                    });
                }

                // 10. Lưu lại toàn bộ ngân sách
                foreach (var item in request.Allocations)
                {
                    var budget = existing.FirstOrDefault(
                        b => b.JarId == item.JarId);

                    if (budget == null)
                    {
                        _context.Budgets.Add(new Budget
                        {
                            UserId = userId,
                            JarId = item.JarId,
                            Month = request.Month,
                            Year = request.Year,
                            BudgetAmount = item.Amount
                        });
                    }
                    else
                    {
                        budget.BudgetAmount = item.Amount;
                    }
                }

                // 11. Lưu tất cả trong một transaction
                await _context.SaveChangesAsync();

                await dbTransaction.CommitAsync();

                return Ok(new
                {
                    message =
                        "Budget distribution saved successfully.",
                    totalAllocated = allocated,
                    unallocated = income - allocated
                });
            }
            catch (Exception ex)
            {
                await dbTransaction.RollbackAsync();

                Console.WriteLine(
                    "Budget distribution error: " + ex);

                return StatusCode(500, new
                {
                    message =
                        "Could not save budget distribution."
                });
            }
        }
    }
}
