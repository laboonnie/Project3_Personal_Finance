using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
namespace Project3_Personal_Finance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DashboardController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        public DashboardController(PersonalFinanceDbContext context)
        {
            _context = context;
        }
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            var totalIncome = await _context.Transactions
                .Where(t => t.Type == "Income")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;
            var totalExpense = await _context.Transactions
                .Where(t => t.Type == "Expense")
                .SumAsync(t => (decimal?)t.Amount) ?? 0;
            var totalDebt = await _context.Debts
                .SumAsync(d => (decimal?)d.RemainingAmount) ?? 0;
            var netBalance = totalIncome - totalExpense;
            var summary = new
            {
                totalIncome,
                totalExpense,
                netBalance,
                totalDebt
            };
            return Ok(summary);
        }
        [HttpGet("jar-spending")]
        public async Task<IActionResult> GetJarSpending()
        {
            var data = await _context.Transactions
                .Where(t => t.Type == "Expense")
                .Join(_context.Categories, t => t.CategoryId, c => c.Id
                , (t, c) => new { t.Amount, c.JarId })
                .Join(_context.FinancialJars, tc => tc.JarId, j => j.Id, (tc, j) => new { j.JarName, tc.Amount })
                .GroupBy(x => x.JarName).Select(g => new
                {
                    jarName = g.Key,
                    amount = g.Sum(x => x.Amount)
                }).ToListAsync();
            return Ok(data);
        }
        [HttpGet("budgets")]
        public async Task<IActionResult> GetBudgets()
        {
            var budgets = await (
                from b in _context.Budgets
                join j in _context.FinancialJars on b.JarId equals j.Id
                select new
                {
                    Jar = j.JarName,
                    Budget = b.BudgetAmount,

                    Spent = (
                        from t in _context.Transactions
                        join c in _context.Categories on t.CategoryId equals c.Id
                        where t.Type == "Expense"
                              && c.JarId == b.JarId
                              && t.TransactionDate.Month == b.Month
                              && t.TransactionDate.Year == b.Year
                        select (decimal?)t.Amount
                    ).Sum() ?? 0
                }
            ).ToListAsync();

            var result = budgets.Select(x => new
            {
                x.Jar,
                x.Budget,
                x.Spent,
                Remaining = x.Budget - x.Spent
            });

            return Ok(result);
        }
        [HttpGet("goals")]
        public async Task<IActionResult> GetGoals()
        {
            var goals = await _context.Goals.Select(g => new
            {
                g.Id,
                g.GoalName,
                g.TargetAmount,
                g.CurrentAmount,
            }).ToListAsync();
            return Ok(goals);
        }

        [HttpGet("monthly-expense")]
        public async Task<IActionResult> GetMonthlyExpense()
        {
            var data = await _context.Transactions
                .Where(t => t.Type == "Expense")
                .GroupBy(t => t.TransactionDate.Month)
                .Select(g => new {
                    month = g.Key,
                    amount = g.Sum(x => x.Amount)
                }).ToListAsync();

            return Ok(data);
        }
    }
}
