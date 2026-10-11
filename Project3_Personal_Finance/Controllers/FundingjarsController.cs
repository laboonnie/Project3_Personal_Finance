using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    /// <summary>
    /// Danh sách lọ nguồn cho dropdown "Source jar" ở trang Goals / Debts,
    /// kèm số dư khả dụng tháng này của user đang đăng nhập.
    /// </summary>
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class FundingJarsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public FundingJarsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        private int CurrentUserId =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        // GET: api/FundingJars
        [HttpGet]
        public async Task<IActionResult> GetJars()
        {
            var remaining = await JarFundingHelper.GetRemainingByJarAsync(_context, CurrentUserId, DateTime.Now);

            var jars = await _context.FinancialJars.AsNoTracking()
                .OrderBy(j => j.Id)
                .Select(j => new
                {
                    j.Id,
                    j.JarName,
                    j.JarCode,
                    HasCategory = j.Categories.Any(c => c.Type == JarFundingHelper.ExpenseType)
                })
                .ToListAsync();

            // remaining = null nghĩa là lọ chưa có ngân sách tháng này
            var result = jars.Select(j => new
            {
                j.Id,
                j.JarName,
                j.JarCode,
                j.HasCategory,
                Remaining = remaining.TryGetValue(j.Id, out var r) ? (decimal?)r : null
            });

            return Ok(result);
        }
    }
}