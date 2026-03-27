using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize(Roles = "Admin")]
    [Route("api/admin/dashboard")]
    [ApiController]
    public class AdminDashboardController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public AdminDashboardController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var totalUsers = await _context.Users.CountAsync();

            var totalCategories = await _context.Categories.CountAsync();

            var totalTransactions = await _context.Transactions.CountAsync();

            return Ok(new
            {
                totalUsers,
                totalCategories,
                totalTransactions
            });
        }

        [HttpGet("users-by-month")]
        public async Task<IActionResult> UsersByMonth()
        {
            var data = await _context.Users
                .Where(u => u.CreatedAt.HasValue)
                .GroupBy(u => u.CreatedAt.Value.Month)
                .Select(g => new
                {
                    month = g.Key,
                    total = g.Count()
                })
                .ToListAsync();

            return Ok(data);
        }

        [HttpGet("transactions-by-month")]
        public async Task<IActionResult> TransactionsByMonth()
        {
            var data = await _context.Transactions
                .GroupBy(t => t.TransactionDate.Month)
                .Select(g => new
                {
                    month = g.Key,
                    total = g.Count()
                })
                .ToListAsync();

            return Ok(data);
        }
    }
}