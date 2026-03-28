using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    // BẢO MẬT: Chỉ có Token chứa Role "Admin" mới được truy cập
    [Authorize(Roles = "Admin")]
    [Route("api/[controller]")]
    [ApiController]
    public class AdminController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public AdminController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET: api/Admin/stats
        [HttpGet("stats")]
        public async Task<IActionResult> GetSystemStats()
        {
            // Đếm số lượng dữ liệu trong hệ thống
            var totalUsers = await _context.Users.CountAsync(u => u.Role != "Admin");
            var totalAdmins = await _context.Users.CountAsync(u => u.Role == "Admin");
            var totalTransactions = await _context.Transactions.CountAsync();
            var totalCategories = await _context.Categories.CountAsync();

            return Ok(new
            {
                TotalUsers = totalUsers,
                TotalAdmins = totalAdmins,
                TotalTransactions = totalTransactions,
                TotalCategories = totalCategories
            });
        }
    }
}