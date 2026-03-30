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

        // DELETE: api/Categories/5
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteCategory(int id)
        {
            var category = await _context.Categories.FindAsync(id);
            if (category == null)
            {
                return NotFound("Không tìm thấy danh mục.");
            }

            // =================================================================
            // LOGIC KIỂM TRA: Đã có giao dịch nào sử dụng danh mục này chưa?
            // =================================================================
            bool hasTransactions = await _context.Transactions.AnyAsync(t => t.CategoryId == id);

            if (hasTransactions)
            {
                // Nếu đã có giao dịch, TRẢ VỀ LỖI NGAY LẬP TỨC
                return BadRequest("Không thể xóa! Danh mục này đã phát sinh giao dịch. Để bảo toàn lịch sử thu chi, bạn không được phép xóa.");
            }

            try
            {
                // Nếu chưa có giao dịch nào (hasTransactions == false), cho phép xóa bình thường
                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Đã xóa danh mục thành công!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi hệ thống khi xóa danh mục: {ex.Message}");
            }
        }
    }
}