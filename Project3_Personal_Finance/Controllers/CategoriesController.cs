using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize] // Bắt buộc đăng nhập
    [Route("api/[controller]")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public CategoriesController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // ================= GET ALL =================
        [HttpGet]
        public async Task<IActionResult> GetCategories()
        {
                 var categories = await _context.Categories
                .Include(c => c.Jar)
                .Select(c => new
                {
                    c.Id,
                    c.Name,
                    c.Type,
                    c.JarId,
                    JarName = c.Jar.JarName
                })
                .ToListAsync();
            return Ok(categories);
        }

        // ================= GET BY ID =================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetCategory(int id)
        {
            var category = await _context.Categories
             .Include(c => c.Jar)
             .Where(c => c.Id == id)
             .Select(c => new
             {
                 c.Id,
                 c.Name,
                 c.Type,
                 c.JarId,
                 JarName = c.Jar.JarName
             })
             .FirstOrDefaultAsync();

            if (category == null)
                return NotFound();

            return Ok(category);
        }

        // ================= CREATE =================
        [HttpPost]
        public async Task<IActionResult> CreateCategory(Category category)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            _context.Categories.Add(category);
            await _context.SaveChangesAsync();

            return Ok(category);
        }

        // ================= UPDATE =================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateCategory(int id, Category category)
        {
            if (id != category.Id)
                return BadRequest("ID không khớp");

            var existing = await _context.Categories.FindAsync(id);
            if (existing == null)
                return NotFound();

            // Update field (chỉnh theo model của bạn)
            existing.Name = category.Name;
            // nếu có thêm field thì update thêm ở đây

            await _context.SaveChangesAsync();

            return Ok(existing);
        }

        // ================= DELETE =================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);

            if (category == null)
                return NotFound();

            _context.Categories.Remove(category);
            await _context.SaveChangesAsync();

            return Ok("Xóa thành công");
        }
    }
}