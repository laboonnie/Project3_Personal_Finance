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
    public class TransactionsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public TransactionsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (userIdString == null)
                throw new UnauthorizedAccessException("User not authenticated");
            return int.Parse(userIdString);
        }

        // ==================== CREATE ====================
        [HttpPost]
        public async Task<IActionResult> CreateTransaction([FromBody] TransactionCreateDto request)
        {
            try
            {
                var userId = GetCurrentUserId();

                var transaction = new Transaction
                {
                    UserId = userId,
                    Amount = request.Amount,
                    CategoryId = request.CategoryId,
                    Type = request.Type,
                    TransactionDate = request.TransactionDate,
                    Note = request.Note
                };

                _context.Transactions.Add(transaction);
                await _context.SaveChangesAsync();

                var result = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.Id == transaction.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.Type,
                        t.TransactionDate,
                        t.Note,
                        CategoryId = t.CategoryId,
                        CategoryName = t.Category.Name,
                        JarId = t.Category.JarId,
                        JarName = t.Category.Jar.JarName,
                        JarCode = t.Category.Jar.JarCode
                    })
                    .FirstOrDefaultAsync();

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== GET MONTHLY (KHÔNG CẦN userId TRONG URL) ====================
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthlyTransactions([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                var data = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.UserId == userId
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .OrderByDescending(t => t.TransactionDate)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.Type,
                        t.TransactionDate,
                        t.Note,
                        CategoryId = t.CategoryId,
                        CategoryName = t.Category.Name,
                        JarId = t.Category.JarId,
                        JarName = t.Category.Jar.JarName,
                        JarCode = t.Category.Jar.JarCode
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== GET SUMMARY ====================
        [HttpGet("summary")]
        public async Task<IActionResult> GetMonthlySummary([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                var transactions = await _context.Transactions
                    .Where(t => t.UserId == userId
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .ToListAsync();

                var income = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
                var expense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);

                return Ok(new
                {
                    TotalIncome = income,
                    TotalExpense = expense,
                    Balance = income - expense,
                    Month = month,
                    Year = year
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== GET TOTAL INCOME ====================
        [HttpGet("total-income")]
        public async Task<IActionResult> GetTotalIncome([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                var total = await _context.Transactions
                    .Where(t => t.UserId == userId
                        && t.Type == "Income"
                        && t.TransactionDate.Month == month
                        && t.TransactionDate.Year == year)
                    .SumAsync(t => t.Amount);

                return Ok(new { total });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== GET AVAILABLE YEARS ====================
        [HttpGet("available-years")]
        public async Task<IActionResult> GetAvailableYears()
        {
            try
            {
                var userId = GetCurrentUserId();

                var years = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .Select(t => t.TransactionDate.Year)
                    .Distinct()
                    .OrderByDescending(y => y)
                    .ToListAsync();

                var currentYear = DateTime.Now.Year;
                if (!years.Contains(currentYear))
                    years.Add(currentYear);
                if (!years.Contains(currentYear + 1))
                    years.Add(currentYear + 1);

                years = years.OrderByDescending(y => y).ToList();

                return Ok(years);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== GET BY JAR ====================
        [HttpGet("by-jar")]
        public async Task<IActionResult> GetExpenseByJar([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                var data = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.UserId == userId
                                && t.Type == "Expense"
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .GroupBy(t => new { t.Category.JarId, t.Category.Jar.JarName, t.Category.Jar.JarCode })
                    .Select(g => new
                    {
                        JarId = g.Key.JarId,
                        JarName = g.Key.JarName,
                        JarCode = g.Key.JarCode,
                        Total = g.Sum(t => t.Amount)
                    })
                    .OrderByDescending(x => x.Total)
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // ==================== GET ALL TRANSACTIONS ====================
        [HttpGet]
        public async Task<IActionResult> GetAllTransactions()
        {
            try
            {
                var userId = GetCurrentUserId();

                var data = await _context.Transactions
                    .Include(t => t.Category)
                    .ThenInclude(c => c.Jar)
                    .Where(t => t.UserId == userId)
                    .OrderByDescending(t => t.TransactionDate)
                    .ThenByDescending(t => t.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.Type,
                        t.TransactionDate,
                        t.Note,

                        CategoryId = t.CategoryId,
                        CategoryName = t.Category.Name,

                        JarId = t.Category.JarId,
                        JarName = t.Category.Jar.JarName,
                        JarCode = t.Category.Jar.JarCode
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // ==================== UPDATE ====================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransaction(
            int id,
            [FromBody] TransactionCreateDto request)
        {
            try
            {
                var userId = GetCurrentUserId();

                // 1. Tìm transaction của user
                var transaction = await _context.Transactions
                    .FirstOrDefaultAsync(t =>
                        t.Id == id &&
                        t.UserId == userId);

                if (transaction == null)
                {
                    return NotFound(new
                    {
                        message = "Transaction not found"
                    });
                }

                // 2. Tìm transaction được tạo gần nhất
                // Dùng Id, KHÔNG dùng TransactionDate
                var latestTransactionId = await _context.Transactions
                    .Where(t => t.UserId == userId)
                    .MaxAsync(t => t.Id);

                // 3. Chỉ transaction mới nhất được sửa
                if (transaction.Id != latestTransactionId)
                {
                    return BadRequest(new
                    {
                        message = "Only the latest transaction can be edited."
                    });
                }

                // 4. Validate dữ liệu
                if (request.Amount <= 0)
                {
                    return BadRequest(new
                    {
                        message = "Amount must be greater than 0."
                    });
                }

                if (request.Type != "Income" && request.Type != "Expense")
                {
                    return BadRequest(new
                    {
                        message = "Transaction type must be Income or Expense."
                    });
                }

                var category = await _context.Categories
                    .FirstOrDefaultAsync(c => c.Id == request.CategoryId);

                if (category == null)
                {
                    return BadRequest(new
                    {
                        message = "Category not found."
                    });
                }

                // Category phải đúng với Type
                if (!string.Equals(
                        category.Type,
                        request.Type,
                        StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new
                    {
                        message = "Category does not match transaction type."
                    });
                }

                // 5. Lưu dữ liệu CŨ vào history TRƯỚC khi update
                var history = new TransactionEditHistory
                {
                    TransactionId = transaction.Id,
                    UserId = userId,

                    OldCategoryId = transaction.CategoryId,
                    NewCategoryId = request.CategoryId,

                    OldAmount = transaction.Amount,
                    NewAmount = request.Amount,

                    OldType = transaction.Type,
                    NewType = request.Type,

                    OldTransactionDate = transaction.TransactionDate,
                    NewTransactionDate = request.TransactionDate,

                    OldNote = transaction.Note,
                    NewNote = request.Note,

                    EditedAt = DateTime.Now
                };

                _context.TransactionEditHistories.Add(history);

                // 6. Update transaction
                transaction.CategoryId = request.CategoryId;
                transaction.Amount = request.Amount;
                transaction.Type = request.Type;
                transaction.TransactionDate = request.TransactionDate;
                transaction.Note = request.Note;

                // Nếu Category quyết định Jar thì đồng bộ JarId
                transaction.JarId = category.JarId;

                // 7. Tạo notification
                var notification = new Notification
                {
                    UserId = userId,
                    Title = "Transaction updated",
                    Message = $"Transaction #{transaction.Id} was updated successfully.",
                    Type = "TRANSACTION_EDITED",
                    IsRead = false,
                    CreatedAt = DateTime.Now
                };

                _context.Notifications.Add(notification);

                // 8. History + Transaction + Notification
                // được lưu trong cùng một SaveChanges
                await _context.SaveChangesAsync();

                return Ok(new
                {
                    message = "Transaction updated successfully",
                    transactionId = transaction.Id
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }
        // ==================== EDIT HISTORY ====================
        [HttpGet("{id}/edit-history")]
        public async Task<IActionResult> GetEditHistory(int id)
        {
            try
            {
                var userId = GetCurrentUserId();

                // Chỉ được xem lịch sử transaction của chính mình
                var transactionExists = await _context.Transactions
                    .AnyAsync(t => t.Id == id && t.UserId == userId);

                if (!transactionExists)
                {
                    return NotFound(new
                    {
                        message = "Transaction not found"
                    });
                }

                var history = await _context.TransactionEditHistories
                    .Where(h =>
                        h.TransactionId == id &&
                        h.UserId == userId)
                    .OrderByDescending(h => h.EditedAt)
                    .Select(h => new
                    {
                        h.Id,
                        h.TransactionId,

                        h.OldCategoryId,
                        h.NewCategoryId,

                        h.OldAmount,
                        h.NewAmount,

                        h.OldType,
                        h.NewType,

                        h.OldTransactionDate,
                        h.NewTransactionDate,

                        h.OldNote,
                        h.NewNote,

                        h.EditedAt
                    })
                    .ToListAsync();

                return Ok(history);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

            } // đóng TransactionsController

        } // đóng namespace