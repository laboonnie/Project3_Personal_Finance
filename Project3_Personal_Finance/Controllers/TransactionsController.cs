using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public TransactionsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // Hàm hỗ trợ: Lấy UserID của người đang đăng nhập từ Token
        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdString!);
        }

        // ==================== CODE CỦA HOÀNG ====================

        // 1. API THÊM MỚI (POST)
        [HttpPost]
        public async Task<IActionResult> CreateTransaction(TransactionCreateDto request)
        {
            var userId = GetCurrentUserId();

            var transaction = new Transaction
            {
                UserId = userId,
                Amount = request.Amount,
                CategoryId = request.CategoryId,
                TransactionDate = request.TransactionDate,
                Note = request.Note,

            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            var createdTransaction = await _context.Transactions
                .Include(t => t.Category)
                .FirstOrDefaultAsync(t => t.Id == transaction.Id);

            return Ok(createdTransaction);
        }

        // 2. API LẤY DANH SÁCH (GET) - Có phân trang và lọc
        [HttpGet]
        public async Task<IActionResult> GetTransactions([FromQuery] int? month, [FromQuery] int? year, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var userId = GetCurrentUserId();

            var query = _context.Transactions
                .Include(t => t.Category)
                .Where(t => t.UserId == userId)
                .AsQueryable();

            if (month.HasValue && year.HasValue)
            {
                query = query.Where(t => t.TransactionDate.Month == month.Value && t.TransactionDate.Year == year.Value);
            }

            var totalItems = await query.CountAsync();

            var transactions = await query
                .OrderByDescending(t => t.TransactionDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return Ok(new
            {
                TotalItems = totalItems,
                Page = page,
                PageSize = pageSize,
                Data = transactions
            });
        }

        // GET: api/Transactions/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Transaction>> GetTransaction(int id)
        {
            var userId = GetCurrentUserId();

            var transaction = await _context.Transactions
                                            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
            {
                return NotFound("Không tìm thấy giao dịch hoặc bạn không có quyền truy cập.");
            }

            return transaction;
        }

        // PUT: api/Transactions/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutTransaction(int id, TransactionCreateDto request)
        {
            var userId = GetCurrentUserId();

            var existingTransaction = await _context.Transactions
                                                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (existingTransaction == null)
            {
                return NotFound("Cannot find transaction or you do not have permission to edit.");
            }

            existingTransaction.Amount = request.Amount;
            existingTransaction.CategoryId = request.CategoryId;
            existingTransaction.TransactionDate = request.TransactionDate;
            existingTransaction.Note = request.Note;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }

            return Ok(existingTransaction);
        }

        // DELETE: api/Transactions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var userId = GetCurrentUserId();

            var transaction = await _context.Transactions
                                            .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (transaction == null)
            {
                return NotFound("Cannot find transaction or you do not have permission to delete.");
            }

            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Delete transaction successfully" });
        }

        // ==================== CODE CỦA LINH  ====================

        // GET: api/transactions/user/5/monthly?month=3&year=2026
        [HttpGet("user/{userId}/monthly")]
        public async Task<IActionResult> GetUserTransactionsByMonth(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var data = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.UserId == userId
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .OrderByDescending(t => t.TransactionDate)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.Type,
                        t.TransactionDate,
                        t.Note,
                        CategoryId = t.CategoryId,
                        CategoryName = t.Category.Name,
                        JarId = t.Category.JarId,
                        JarName = t.Category.Jar.JarName,
                        JarCode = t.Category.Jar.JarCode
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/5/summary?month=3&year=2026
        [HttpGet("user/{userId}/summary")]
        public async Task<IActionResult> GetMonthlySummary(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var transactions = await _context.Transactions
                    .Where(t => t.UserId == userId
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .ToListAsync();

                var income = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
                var expense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);

                return Ok(new
                {
                    TotalIncome = income,
                    TotalExpense = expense,
                    Balance = income - expense,
                    Month = month,
                    Year = year
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/5/by-jar?month=3&year=2026
        [HttpGet("user/{userId}/by-jar")]
        public async Task<IActionResult> GetExpenseByJarMonthly(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var data = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.UserId == userId
                                && t.Type == "Expense"
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .GroupBy(t => new { t.Category.JarId, t.Category.Jar.JarName, t.Category.Jar.JarCode })
                    .Select(g => new
                    {
                        JarId = g.Key.JarId,
                        JarName = g.Key.JarName,
                        JarCode = g.Key.JarCode,
                        Total = g.Sum(t => t.Amount)
                    })
                    .OrderByDescending(x => x.Total)
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/5/trends?months=6
        [HttpGet("user/{userId}/trends")]
        public async Task<IActionResult> GetSpendingTrends(int userId, [FromQuery] int months = 6)
        {
            try
            {
                var endDate = DateTime.Now;
                var startDate = endDate.AddMonths(-months);

                var monthlyTrend = await _context.Transactions
                    .Where(t => t.UserId == userId &&
                               t.Type == "Expense" &&
                               t.TransactionDate >= startDate &&
                               t.TransactionDate <= endDate)
                    .GroupBy(t => new { t.TransactionDate.Year, t.TransactionDate.Month })
                    .Select(g => new
                    {
                        Period = $"{g.Key.Month}/{g.Key.Year}",
                        Year = g.Key.Year,
                        Month = g.Key.Month,
                        Total = g.Sum(t => t.Amount)
                    })
                    .OrderBy(x => x.Year).ThenBy(x => x.Month)
                    .ToListAsync();

                var topCategories = await _context.Transactions
                    .Include(t => t.Category)
                    .Where(t => t.UserId == userId && t.Type == "Expense")
                    .GroupBy(t => new { t.CategoryId, t.Category.Name })
                    .Select(g => new
                    {
                        CategoryId = g.Key.CategoryId,
                        CategoryName = g.Key.Name,
                        Total = g.Sum(t => t.Amount)
                    })
                    .OrderByDescending(x => x.Total)
                    .Take(5)
                    .ToListAsync();

                return Ok(new
                {
                    MonthlyTrend = monthlyTrend,
                    TopCategories = topCategories
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/5/budget-vs-actual?month=3&year=2026
        [HttpGet("user/{userId}/budget-vs-actual")]
        public async Task<IActionResult> GetBudgetVsActual(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var jars = await _context.FinancialJars.ToListAsync();

                var budgets = await _context.Budgets
                    .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
                    .ToDictionaryAsync(b => b.JarId);

                var result = new List<object>();

                foreach (var jar in jars)
                {
                    var actual = await _context.Transactions
                        .Include(t => t.Category)
                        .Where(t => t.UserId == userId &&
                                   t.Category.JarId == jar.Id &&
                                   t.Type == "Expense" &&
                                   t.TransactionDate.Month == month &&
                                   t.TransactionDate.Year == year)
                        .SumAsync(t => t.Amount);

                    var budgetAmount = budgets.ContainsKey(jar.Id) ? budgets[jar.Id].BudgetAmount : 0;

                    result.Add(new
                    {
                        JarId = jar.Id,
                        JarName = jar.JarName,
                        JarCode = jar.JarCode,
                        Budget = budgetAmount,
                        Actual = actual,
                        Difference = budgetAmount - actual,
                        PercentUsed = budgetAmount > 0 ? Math.Round((actual / budgetAmount) * 100, 2) : 0
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/1/total-income?month=3&year=2026
        [HttpGet("user/{userId}/total-income")]
        public async Task<IActionResult> GetTotalIncome(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var total = await _context.Transactions
                    .Where(t => t.UserId == userId
                        && t.Type == "Income"
                        && t.TransactionDate.Month == month
                        && t.TransactionDate.Year == year)
                    .SumAsync(t => t.Amount);

                return Ok(new { total });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/transactions/user/1/available-years
        [HttpGet("user/{userId}/available-years")]
        public async Task<IActionResult> GetAvailableYears(int userId)
        {
            try
            {
                var years = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .Select(t => t.TransactionDate.Year)
                    .Distinct()
                    .OrderByDescending(y => y)
                    .ToListAsync();

                var currentYear = DateTime.Now.Year;
                if (!years.Contains(currentYear))
                    years.Add(currentYear);
                if (!years.Contains(currentYear + 1))
                    years.Add(currentYear + 1);

                years = years.OrderByDescending(y => y).ToList();

                return Ok(years);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
    }
}