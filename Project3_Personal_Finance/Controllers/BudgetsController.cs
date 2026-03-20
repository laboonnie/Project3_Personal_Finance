using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class BudgetsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public BudgetsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET: api/budgets
        [HttpGet]
        public async Task<IActionResult> GetBudgets()
        {
            try
            {
                var data = await _context.Budgets
                    .Include(b => b.User)
                    .Include(b => b.Jar)
                    .Select(b => new
                    {
                        b.Id,
                        b.UserId,
                        UserName = b.User.Name,
                        b.JarId,
                        JarName = b.Jar.JarName,
                        JarCode = b.Jar.JarCode,
                        b.BudgetAmount,
                        b.Month,
                        b.Year
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/budgets/user/5
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetUserBudgets(int userId)
        {
            try
            {
                var data = await _context.Budgets
                    .Where(b => b.UserId == userId)
                    .Include(b => b.Jar)
                    .Select(b => new
                    {
                        b.Id,
                        b.JarId,
                        JarName = b.Jar.JarName,
                        JarCode = b.Jar.JarCode,
                        b.BudgetAmount,
                        b.Month,
                        b.Year
                    })
                    .ToListAsync();

                return Ok(data);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/budgets/user/5/monthly?month=3&year=2024
        [HttpGet("user/{userId}/monthly")]
        public async Task<IActionResult> GetUserMonthlyBudgets(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                // Lấy tất cả jars
                var jars = await _context.FinancialJars.ToListAsync();

                // Lấy budgets của user trong tháng - xử lý an toàn
                var budgetsList = await _context.Budgets
                    .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
                    .ToListAsync();

                // Chuyển thành dictionary an toàn (tránh lỗi trùng key)
                var budgets = new Dictionary<int, Budget>();
                foreach (var budget in budgetsList)
                {
                    if (!budgets.ContainsKey(budget.JarId))
                    {
                        budgets[budget.JarId] = budget;
                    }
                }

                // Tính chi tiêu thực tế cho từng jar
                var result = new List<object>();

                foreach (var jar in jars)
                {
                    // Tính tổng chi tiêu cho jar này
                    var spent = await _context.Transactions
                        .Include(t => t.Category)
                        .Where(t => t.UserId == userId
                                    && t.Category.JarId == jar.Id
                                    && t.Type == "Expense"
                                    && t.TransactionDate.Month == month
                                    && t.TransactionDate.Year == year)
                        .SumAsync(t => t.Amount);

                    decimal budgetAmount = budgets.ContainsKey(jar.Id) ? budgets[jar.Id].BudgetAmount : 0;
                    decimal progress = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
                    decimal remaining = budgetAmount - spent;

                    result.Add(new
                    {
                        JarId = jar.Id,
                        JarName = jar.JarName,
                        JarCode = jar.JarCode,
                        DefaultPercentage = jar.DefaultPercentage,
                        BudgetAmount = budgetAmount,
                        Spent = spent,
                        Remaining = remaining,
                        Progress = Math.Round(progress, 2),
                        Status = spent > budgetAmount ? "Over Budget" : (budgetAmount > 0 ? "On Track" : "No Budget"),
                        IsOverBudget = spent > budgetAmount
                    });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message, stackTrace = ex.StackTrace });
            }
        }
        // POST: api/budgets
        [HttpPost]
        public async Task<IActionResult> CreateBudget(Budget budget)
        {
            try
            {
                // Kiểm tra xem đã có budget cho jar này trong tháng chưa
                var existingBudget = await _context.Budgets
                    .FirstOrDefaultAsync(b => b.UserId == budget.UserId
                                            && b.JarId == budget.JarId
                                            && b.Month == budget.Month
                                            && b.Year == budget.Year);

                if (existingBudget != null)
                {
                    // Nếu đã có thì cập nhật
                    existingBudget.BudgetAmount = budget.BudgetAmount;
                    await _context.SaveChangesAsync();
                    return Ok(existingBudget);
                }

                _context.Budgets.Add(budget);
                await _context.SaveChangesAsync();

                var result = await _context.Budgets
                    .Include(b => b.Jar)
                    .FirstOrDefaultAsync(b => b.Id == budget.Id);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // PUT: api/budgets/5
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateBudget(int id, Budget budget)
        {
            if (id != budget.Id)
                return BadRequest();

            try
            {
                _context.Entry(budget).State = EntityState.Modified;
                await _context.SaveChangesAsync();

                var result = await _context.Budgets
                    .Include(b => b.Jar)
                    .FirstOrDefaultAsync(b => b.Id == id);

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // DELETE: api/budgets/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBudget(int id)
        {
            try
            {
                var budget = await _context.Budgets.FindAsync(id);

                if (budget == null)
                    return NotFound();

                _context.Budgets.Remove(budget);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Xóa thành công" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/budgets/spent/1?month=3&year=2024
        [HttpGet("spent/{jarId}")]
        public async Task<IActionResult> GetSpentByJar(int jarId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var spent = await _context.Transactions
                    .Include(t => t.Category)
                    .Where(t => t.Category.JarId == jarId
                                && t.Type == "Expense"
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .SumAsync(t => t.Amount);

                return Ok(new
                {
                    JarId = jarId,
                    Month = month,
                    Year = year,
                    Spent = spent
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // GET: api/budgets/progress/1?userId=1&month=3&year=2024
        [HttpGet("progress/{jarId}")]
        public async Task<IActionResult> GetBudgetProgress(int jarId, [FromQuery] int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var budget = await _context.Budgets
                    .Where(b => b.JarId == jarId && b.UserId == userId && b.Month == month && b.Year == year)
                    .FirstOrDefaultAsync();

                if (budget == null)
                    return NotFound(new { message = "Không tìm thấy ngân sách" });

                var spent = await _context.Transactions
                    .Include(t => t.Category)
                    .Where(t => t.UserId == userId
                                && t.Category.JarId == jarId
                                && t.Type == "Expense"
                                && t.TransactionDate.Month == month
                                && t.TransactionDate.Year == year)
                    .SumAsync(t => t.Amount);

                var progress = (spent / budget.BudgetAmount) * 100;

                return Ok(new
                {
                    JarId = jarId,
                    Budget = budget.BudgetAmount,
                    Spent = spent,
                    Remaining = budget.BudgetAmount - spent,
                    Progress = Math.Round(progress, 2)
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }


        // GET: api/budgets/suggest/1?monthlyIncome=10000000
        [HttpGet("suggest/{userId}")]
        public async Task<IActionResult> SuggestBudgets(int userId, [FromQuery] decimal monthlyIncome)
        {
            try
            {
                var jars = await _context.FinancialJars.ToListAsync();

                var suggestions = jars.Select(jar => new
                {
                    JarId = jar.Id,
                    JarName = jar.JarName,
                    JarCode = jar.JarCode,
                    SuggestedAmount = monthlyIncome * jar.DefaultPercentage / 100,
                    Percentage = jar.DefaultPercentage
                });

                return Ok(suggestions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // GET: api/budgets/alerts/5?month=3&year=2026
        [HttpGet("alerts/{userId}")]
        public async Task<IActionResult> GetBudgetAlerts(int userId, [FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var jars = await _context.FinancialJars.ToListAsync();
                var alerts = new List<object>();

                foreach (var jar in jars)
                {
                    // Lấy budget của user cho jar này
                    var budget = await _context.Budgets
                        .FirstOrDefaultAsync(b => b.UserId == userId &&
                                                 b.JarId == jar.Id &&
                                                 b.Month == month &&
                                                 b.Year == year);

                    if (budget != null)
                    {
                        // Tính chi tiêu thực tế
                        var spent = await _context.Transactions
                            .Include(t => t.Category)
                            .Where(t => t.UserId == userId &&
                                       t.Category.JarId == jar.Id &&
                                       t.Type == "Expense" &&
                                       t.TransactionDate.Month == month &&
                                       t.TransactionDate.Year == year)
                            .SumAsync(t => t.Amount);

                        // Nếu vượt ngân sách -> CẢNH BÁO
                        if (spent > budget.BudgetAmount)
                        {
                            alerts.Add(new
                            {
                                JarId = jar.Id,
                                JarName = jar.JarName,
                                JarCode = jar.JarCode,
                                Budget = budget.BudgetAmount,
                                Spent = spent,
                                OverBy = spent - budget.BudgetAmount,
                                Message = $"Bạn đã vượt ngân sách {jar.JarName}!",
                                Type = "danger"
                            });
                        }
                        // Nếu sắp vượt (trên 80%) -> CẢNH BÁO
                        else if (spent > budget.BudgetAmount * 0.8m)
                        {
                            alerts.Add(new
                            {
                                JarId = jar.Id,
                                JarName = jar.JarName,
                                JarCode = jar.JarCode,
                                Budget = budget.BudgetAmount,
                                Spent = spent,
                                Remaining = budget.BudgetAmount - spent,
                                Message = $"{jar.JarName} sắp hết! Còn {budget.BudgetAmount - spent:N0}",
                                Type = "warning"
                            });
                        }
                    }
                }

                return Ok(new
                {
                    TotalAlerts = alerts.Count,
                    Alerts = alerts
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }
        // GET: api/budgets/user/1/available-years
        [HttpGet("user/{userId}/available-years")]
        public async Task<IActionResult> GetAvailableYears(int userId)
        {
            try
            {
                var years = await _context.Budgets
                    .Where(b => b.UserId == userId)
                    .Select(b => b.Year)
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
    }
}