using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
namespace Project3_Personal_Finance.Controllers
{
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
                TotalIncome = totalIncome,
                TotalExpense = totalExpense,
                NetBalance = netBalance,
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
                    amout = g.Sum(x => x.Amount)
                }).ToListAsync();
            return Ok(data);
        }
        [HttpGet("budgets")]
        public async Task<IActionResult> GetBudgets()
        {
            var budgets = await _context.Budgets
                .Join(_context.FinancialJars, b => b.JarId, j => j.Id, (b, j) => new { b.Id, b.Month, b.Year, b.BudgetAmount, j.JarName })
                .ToListAsync();
            return Ok(budgets);
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
    }
}
