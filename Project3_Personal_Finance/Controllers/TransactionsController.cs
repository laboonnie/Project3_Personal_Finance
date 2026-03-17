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

        // 1. API THÊM MỚI (POST)
        [HttpPost]
        public async Task<IActionResult> CreateTransaction(TransactionCreateDto request)
        {
            var userId = GetCurrentUserId(); // Lấy ID an toàn từ Token

            var transaction = new Transaction
            {
                UserId = userId, // Gán cứng UserID, không cho Frontend can thiệp
                Amount = request.Amount,
                CategoryId = request.CategoryId,
                TransactionDate = DateOnly.FromDateTime(request.TransactionDate),
                Note = request.Note,
            };

            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();

            // Trả về dữ liệu vừa tạo kèm theo thông tin Category (để React render ngay)
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

            // Chỉ lấy giao dịch của chính user này
            var query = _context.Transactions
                .Include(t => t.Category) // JOIN bảng Category để lấy tên danh mục
                .Where(t => t.UserId == userId)
                .AsQueryable();

            // Lọc theo tháng/năm nếu có truyền lên
            if (month.HasValue && year.HasValue)
            {
                query = query.Where(t => t.TransactionDate.Month == month.Value && t.TransactionDate.Year == year.Value);
            }

            // Đếm tổng số bản ghi để làm phân trang
            var totalItems = await query.CountAsync();

            // Xử lý phân trang và sắp xếp mới nhất lên đầu
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

            // BẢO MẬT: Chỉ lấy giao dịch nếu nó thuộc về UserId hiện tại
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
            // Lưu ý: Nên dùng DTO cho PUT để tránh Frontend gửi lên UserID giả mạo
            var userId = GetCurrentUserId();

            // 1. Tìm giao dịch trong DB xem có tồn tại và đúng chủ nhân không
            var existingTransaction = await _context.Transactions
                                                    .FirstOrDefaultAsync(t => t.Id == id && t.UserId == userId);

            if (existingTransaction == null)
            {
                return NotFound("Cannot find transaction or you do not have permission to edit.");
            }

            // 2. Cập nhật các trường được phép
            existingTransaction.Amount = request.Amount;
            existingTransaction.CategoryId = request.CategoryId;
            existingTransaction.TransactionDate = DateOnly.FromDateTime(request.TransactionDate);
            existingTransaction.Note = request.Note;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                throw;
            }

            return Ok(existingTransaction); // Trả về data mới để React cập nhật UI
        }

        // DELETE: api/Transactions/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var userId = GetCurrentUserId();

            // BẢO MẬT: Chỉ xóa nếu nó thuộc về UserId hiện tại
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
    }
}
