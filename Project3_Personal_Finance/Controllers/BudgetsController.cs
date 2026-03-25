using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class BudgetsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public BudgetsController(PersonalFinanceDbContext context)
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

        // ==================== GET MONTHLY ====================
        [HttpGet("monthly")]
        public async Task<IActionResult> GetMonthlyBudgets([FromQuery] int month, [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();
                var jars = await _context.FinancialJars.ToListAsync();

                var budgetsList = await _context.Budgets
                    .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
                    .ToListAsync();

                var budgets = new Dictionary<int, Budget>();
                foreach (var budget in budgetsList)
                {
                    if (!budgets.ContainsKey(budget.JarId))
                        budgets[budget.JarId] = budget;
                }

                var result = new List<object>();

                foreach (var jar in jars)
                {
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
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ==================== CREATE ====================
        [HttpPost]
        public async Task<IActionResult> CreateBudget([FromBody] Budget budget)
        {
            try
            {
                var userId = GetCurrentUserId();
                budget.UserId = userId;

                var existingBudget = await _context.Budgets
                    .FirstOrDefaultAsync(b => b.UserId == userId
                                            && b.JarId == budget.JarId
                                            && b.Month == budget.Month
                                            && b.Year == budget.Year);

                if (existingBudget != null)
                {
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

        // ==================== DELETE ====================
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteBudget(int id)
        {
            try
            {
                var userId = GetCurrentUserId();
                var budget = await _context.Budgets
                    .FirstOrDefaultAsync(b => b.Id == id && b.UserId == userId);

                if (budget == null)
                    return NotFound();

                _context.Budgets.Remove(budget);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Delete successfully" });
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