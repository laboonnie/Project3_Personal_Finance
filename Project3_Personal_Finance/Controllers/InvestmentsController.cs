using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;
using System.Security.Claims;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class InvestmentsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        public InvestmentsController(PersonalFinanceDbContext context) => _context = context;

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet]
        public async Task<IActionResult> GetInvestments()
        {
            var userId = GetCurrentUserId();
            var investments = await _context.Investments
                                            .Where(i => i.UserId == userId)
                                            .OrderByDescending(i => i.InvestDate)
                                            .ToListAsync();
            return Ok(investments);
        }

        [HttpPost]
        public async Task<IActionResult> CreateInvestment(InvestmentDto request)
        {
            var investment = new Investment
            {
                UserId = GetCurrentUserId(),
                AssetName = request.AssetName,
                AssetType = request.AssetType,
                AmountInvested = request.AmountInvested,
                CurrentValue = request.CurrentValue,
                InvestDate = DateOnly.FromDateTime(request.InvestDate)
            };

            _context.Investments.Add(investment);
            await _context.SaveChangesAsync();
            return Ok(investment);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateInvestment(int id, InvestmentDto request)
        {
            var userId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);

            if (investment == null) return NotFound("Không tìm thấy khoản đầu tư.");

            investment.AssetName = request.AssetName;
            investment.AssetType = request.AssetType;
            investment.AmountInvested = request.AmountInvested;
            // Người dùng thường xuyên cập nhật cột này để theo dõi lãi/lỗ:
            investment.CurrentValue = request.CurrentValue;
            investment.InvestDate = DateOnly.FromDateTime(request.InvestDate);

            await _context.SaveChangesAsync();
            return Ok(investment);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteInvestment(int id)
        {
            var userId = GetCurrentUserId();
            var investment = await _context.Investments.FirstOrDefaultAsync(i => i.Id == id && i.UserId == userId);

            if (investment == null) return NotFound("Không tìm thấy khoản đầu tư.");

            _context.Investments.Remove(investment);
            await _context.SaveChangesAsync();
            return Ok(new { message = "Xóa khoản đầu tư thành công" });
        }
    }
}