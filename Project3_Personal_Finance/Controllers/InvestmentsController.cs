using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;

namespace Project3_Personal_Finance.Controllers
{
    public class CreateInvestmentDto
    {
        public string AssetName { get; set; }
        public string AssetType { get; set; }
        public decimal AmountInvested { get; set; }
        public DateTime InvestDate { get; set; }
        public int CategoryId { get; set; } 
    }

    public class SellInvestmentDto
    {
        public int CategoryId { get; set; } 
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InvestmentsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        public InvestmentsController(PersonalFinanceDbContext context) => _context = context;
        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        // HÀM HỖ TRỢ: Tính số dư hiện tại của Hũ
        private async Task<decimal> GetCategoryBalance(int userId, int categoryId)
        {
            var txs = await _context.Transactions.Where(t => t.UserId == userId && t.CategoryId == categoryId).ToListAsync();
            var income = txs.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var expense = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            return income - expense;
        }

        // 1. LẤY SỐ DƯ HŨ (Dùng cho Frontend)
        [HttpGet("category-balance/{categoryId}")]
        public async Task<IActionResult> GetBalanceEndpoint(int categoryId)
        {
            var userId = GetCurrentUserId();
            var balance = await GetCategoryBalance(userId, categoryId);
            return Ok(new { balance = balance });
        }

        // API MỚI: LẤY THÔNG TIN VÀ SỐ DƯ HŨ FINANCIAL FREEDOM (FFA)
        // API MỚI: LẤY THÔNG TIN VÀ SỐ DƯ CHO DANH MỤC ĐẦU TƯ
        [HttpGet("ffa-balance")]
        public async Task<IActionResult> GetFFABalance()
        {
            var userId = GetCurrentUserId();

            // 1. SỬA LỖI Ở ĐÂY: Chỉ tìm theo Tên, bỏ điều kiện UserId đi vì bảng Category không có cột này
            var invCategory = await _context.Categories
                .FirstOrDefaultAsync(c => c.Name.Contains("Đầu tư") || c.Name.Contains("Invest"));

            if (invCategory == null)
            {
                return BadRequest("The system has not found a category to record. Please go to the Categories page and create a category with the word 'Investment' (e.g., Stock Investment)!");
            }

            // 2. Tính số dư (Lưu ý: Bảng Transactions thì VẪN PHẢI lọc theo UserId vì giao dịch là của cá nhân)
            var txs = await _context.Transactions
                .Where(t => t.UserId == userId && t.CategoryId == invCategory.Id)
                .ToListAsync();

            var income = txs.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var expense = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            var balance = income - expense;

            // 3. Trả về đúng ID của bảng Categories
            return Ok(new
            {
                id = invCategory.Id,
                name = invCategory.Name,
                balance = balance
            });
        }

        // 2. LẤY DANH SÁCH & MÔ PHỎNG GIÁ
        [HttpGet]
        public async Task<IActionResult> GetInvestments()
        {
            var userId = GetCurrentUserId();
            var investments = await _context.Investments.Where(i => i.UserId == userId).OrderByDescending(i => i.InvestDate).ToListAsync();

            foreach (var inv in investments)
            {
                int seed = inv.Id + DateTime.Today.DayOfYear + DateTime.Today.Year;
                Random rnd = new Random(seed);
                double fluctuation = (rnd.NextDouble() * 0.5) - 0.15;
                inv.CurrentValue = inv.AmountInvested + (inv.AmountInvested * (decimal)fluctuation);
            }
            return Ok(investments);
        }

        // 3. MUA TÀI SẢN (TRỪ TIỀN)
        [HttpPost]
        public async Task<IActionResult> CreateInvestment(CreateInvestmentDto request)
        {
            var userId = GetCurrentUserId();

            // Kiểm tra số dư trước khi mua
            var currentBalance = await GetCategoryBalance(userId, request.CategoryId);
            if (currentBalance < request.AmountInvested) return BadRequest("This jar doesn't have enough money to invest!");

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var investment = new Investment
                {
                    UserId = userId,
                    AssetName = request.AssetName,
                    AssetType = request.AssetType,
                    AmountInvested = request.AmountInvested,
                    CurrentValue = request.AmountInvested,
                    InvestDate = DateOnly.FromDateTime(request.InvestDate)
                };
                _context.Investments.Add(investment);

                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = request.CategoryId,
                    Amount = request.AmountInvested,
                    Type = "Expense",
                    TransactionDate = request.InvestDate,
                    Note = $"Purchase investment assets: {request.AssetName}"
                };
                _context.Transactions.Add(moneyTransaction);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetCategoryBalance(userId, request.CategoryId);

                // Trả về dữ liệu để hiển thị Popup
                return Ok(new
                {
                    message = "Successful investment",
                    transactionDetails = new { amount = request.AmountInvested, remainingBalance = newBalance, time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy") }
                });
            }
            catch (Exception ex) { await transaction.RollbackAsync(); return BadRequest($"Error system: {ex.Message}"); }
        }

        // ... previous code unchanged ...

        [HttpPost("{id}/sell")]
        public async Task<IActionResult> SellInvestment(int id, SellInvestmentDto request)
        {
            var userId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);
            if (investment == null) return NotFound("No investment opportunities found.");

            int seed = investment.Id + DateTime.Today.DayOfYear + DateTime.Today.Year;
            Random rnd = new Random(seed);
            double fluctuation = (rnd.NextDouble() * 0.5) - 0.15;

            if (!investment.AmountInvested.HasValue)
                return BadRequest("The investment value is invalid.");

            decimal amountInvested = investment.AmountInvested.Value;
            decimal currentValue = amountInvested + (amountInvested * (decimal)fluctuation);

            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var moneyTransaction = new Transaction
                {
                    UserId = userId,
                    CategoryId = request.CategoryId,
                    Amount = currentValue,
                    Type = "Income",
                    TransactionDate = DateTime.Now,
                    Note = $"Selling assets: {investment.AssetName} (Profit/Loss: {currentValue - amountInvested:N0}đ)"
                };
                _context.Transactions.Add(moneyTransaction);
                _context.Investments.Remove(investment); // Xóa khỏi danh mục đang nắm giữ

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                var newBalance = await GetCategoryBalance(userId, request.CategoryId);
                return Ok(new
                {
                    message = "Withdrawal successful",
                    transactionDetails = new { amount = currentValue, remainingBalance = newBalance, time = DateTime.Now.ToString("HH:mm:ss dd/MM/yyyy") }
                });
            }
            catch (Exception ex) { await transaction.RollbackAsync(); return BadRequest($"Error system: {ex.Message}"); }
        }
    }
}