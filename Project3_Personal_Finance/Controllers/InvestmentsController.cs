using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;

namespace Project3_Personal_Finance.Controllers
{
    public class CreateInvestmentDto
    {
        public string AssetName { get; set; } = null!;
        public string AssetType { get; set; } = null!;
        public decimal AmountInvested { get; set; }
        public DateTime InvestDate { get; set; }
        public int JarId { get; set; } // Chọn Hũ (Tự do tài chính hoặc Tiết kiệm dài hạn)
    }

    public class SellInvestmentDto
    {
        public int JarId { get; set; } // Hũ nhận lại tiền bán
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InvestmentsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        public InvestmentsController(PersonalFinanceDbContext context) => _context = context;

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        // HÀM TÍNH SỐ DƯ THỰC TẾ CỦA HŨ (Đã khấu trừ các khoản đang nằm trong Investments)
        private async Task<decimal> GetJarAvailableBalance(int userId, int jarId)
        {
            // Lấy tất cả Category thuộc Hũ này
            var categoryIds = await _context.Categories
                .Where(c => c.JarId == jarId)
                .Select(c => c.Id)
                .ToListAsync();

            // Tổng Thu - Chi từ Transactions thuộc Hũ này
            var txs = await _context.Transactions
                .Where(t => t.UserId == userId && categoryIds.Contains(t.CategoryId))
                .ToListAsync();

            var totalIncome = txs.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount);

            return totalIncome - totalExpense;
        }

        // 1. API LẤY DANH SÁCH HŨ CHO PHÉP ĐẦU TƯ (Tự do tài chính & Tiết kiệm dài hạn) KÈM SỐ DƯ
        [HttpGet("allowed-jars")]
        public async Task<IActionResult> GetAllowedInvestmentJars()
        {
            var userId = GetCurrentUserId();

            // Tìm 2 Hũ: Financial Freedom & Long Term Saving
            var allowedJars = await _context.FinancialJars
                .Where(j => j.JarName.Contains("Financial Freedom")
                         || j.JarName.Contains("Tự do tài chính")
                         || j.JarName.Contains("Long Term")
                         || j.JarName.Contains("Tiết kiệm dài hạn"))
                .ToListAsync();

            var result = new List<object>();

            foreach (var jar in allowedJars)
            {
                var balance = await GetJarAvailableBalance(userId, jar.Id);
                result.Add(new
                {
                    jarId = jar.Id,
                    jarName = jar.JarName,
                    balance = balance
                });
            }

            return Ok(result);
        }

        // 2. LẤY DANH SÁCH TÀI SẢN ĐANG ĐẦU TƯ (Mô phỏng biến động giá)
        [HttpGet]
        public async Task<IActionResult> GetInvestments()
        {
            var userId = GetCurrentUserId();
            var investments = await _context.Investments
                .Include(i => i.Jar)
                .Where(i => i.UserId == userId)
                .OrderByDescending(i => i.InvestDate)
                .ToListAsync();

            foreach (var inv in investments)
            {
                int seed = inv.Id + DateTime.Today.DayOfYear + DateTime.Today.Year;
                Random rnd = new Random(seed);
                double fluctuation = (rnd.NextDouble() * 0.5) - 0.15;
                inv.CurrentValue = inv.AmountInvested + (inv.AmountInvested * (decimal)fluctuation);
            }

            return Ok(investments);
        }

        // 3. MUA / NẠP TÀI SẢN ĐẦU TƯ (Tự động trừ tiền Hũ & Tạo Lịch sử Giao dịch)
        [HttpPost]
        public async Task<IActionResult> CreateInvestment(CreateInvestmentDto request)
        {
            var userId = GetCurrentUserId();

            // Kiểm tra Hũ tồn tại
            var jar = await _context.FinancialJars.FirstOrDefaultAsync(j => j.Id == request.JarId);
            if (jar == null) return BadRequest("Hũ tài chính không hợp lệ!");

            // Kiểm tra Số dư khả dụng của Hũ
            var currentBalance = await GetJarAvailableBalance(userId, request.JarId);
            if (currentBalance < request.AmountInvested)
            {
                return BadRequest($"Hũ {jar.JarName} không đủ số dư để đầu tư (Số dư hiện tại: {currentBalance:N0}đ)!");
            }

            // Lấy hoặc tự tạo Danh mục thuộc Hũ này để lưu Transaction
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.JarId == request.JarId && (c.Name.Contains("Đầu tư") || c.Name.Contains("Invest")));

            if (category == null)
            {
                // Nếu chưa có category thì tạo 1 danh mục mặc định
                category = new Category
                {
                    Name = "Đầu tư tài chính",
                    JarId = request.JarId
                };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // A. Tạo tài sản Đầu tư mới
                var investment = new Investment
                {
                    UserId = userId,
                    JarId = request.JarId,
                    AssetName = request.AssetName,
                    AssetType = request.AssetType,
                    AmountInvested = request.AmountInvested,
                    CurrentValue = request.AmountInvested,
                    InvestDate = DateOnly.FromDateTime(request.InvestDate)
                };
                _context.Investments.Add(investment);

                // B. Tự động tạo Giao dịch Chi tiêu (Trừ tiền Hũ)
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = category.Id,
                    Amount = request.AmountInvested,
                    Type = "Expense",
                    TransactionDate = request.InvestDate,
                    Note = $"Nạp đầu tư tài sản: {request.AssetName} (Hũ: {jar.JarName})"
                };
                _context.Transactions.Add(moneyTransaction);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetJarAvailableBalance(userId, request.JarId);

                return Ok(new
                {
                    message = "Đầu tư thành công!",
                    transactionDetails = new
                    {
                        assetName = request.AssetName,
                        amount = request.AmountInvested,
                        jarName = jar.JarName,
                        remainingBalance = newBalance,
                        time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy")
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Lỗi hệ thống: {ex.Message}");
            }
        }

        // 4. BÁN / RÚT TÀI SẢN ĐẦU TƯ (Tự động cộng lại tiền vào Hũ & Tạo Lịch sử Giao dịch)
        [HttpPost("{id}/sell")]
        public async Task<IActionResult> SellInvestment(int id, SellInvestmentDto request)
        {
            var userId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
            if (investment == null) return NotFound("Không tìm thấy tài sản đầu tư.");

            int targetJarId = request.JarId > 0 ? request.JarId : (investment.JarId ?? 0);
            var jar = await _context.FinancialJars.FirstOrDefaultAsync(j => j.Id == targetJarId);
            if (jar == null) return BadRequest("Hũ nhận tiền không hợp lệ.");

            // Tính giá trị hiện tại lúc bán (có lời/lỗ)
            int seed = investment.Id + DateTime.Today.DayOfYear + DateTime.Today.Year;
            Random rnd = new Random(seed);
            double fluctuation = (rnd.NextDouble() * 0.5) - 0.15;

            decimal amountInvested = investment.AmountInvested ?? 0;
            decimal currentValue = amountInvested + (amountInvested * (decimal)fluctuation);

            // Lấy danh mục thuộc Hũ
            var category = await _context.Categories
                .FirstOrDefaultAsync(c => c.JarId == targetJarId && (c.Name.Contains("Đầu tư") || c.Name.Contains("Invest")));

            if (category == null)
            {
                category = new Category { Name = "Thu nhập đầu tư", JarId = targetJarId };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
            }

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // A. Tạo Giao dịch Thu nhập (Cộng lại tiền vào Hũ)
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = category.Id,
                    Amount = currentValue,
                    Type = "Income",
                    TransactionDate = DateTime.Now,
                    Note = $"Bán tài sản đầu tư: {investment.AssetName} (Lời/Lỗ: {currentValue - amountInvested:N0}đ)"
                };
                _context.Transactions.Add(moneyTransaction);

                // B. Xóa tài sản khỏi danh mục đang nắm giữ
                _context.Investments.Remove(investment);

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetJarAvailableBalance(userId, targetJarId);

                return Ok(new
                {
                    message = "Chốt lời/Rút vốn thành công!",
                    transactionDetails = new
                    {
                        assetName = investment.AssetName,
                        amountReceived = currentValue,
                        profitOrLoss = currentValue - amountInvested,
                        jarName = jar.JarName,
                        remainingBalance = newBalance,
                        time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy")
                    }
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return BadRequest($"Lỗi hệ thống: {ex.Message}");
            }
        }
    }
}