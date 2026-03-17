using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize] // Yêu cầu đăng nhập mới được xem danh mục
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public CategoriesController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // API Lấy toàn bộ danh mục (GET: api/Categories)
        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
            // Trả về toàn bộ danh sách Category đang có trong Database
            var categories = await _context.Categories.ToListAsync();
            return Ok(categories);
        }
    }
}