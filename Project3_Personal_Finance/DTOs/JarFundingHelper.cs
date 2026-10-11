using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.DTOs
{
    /// <summary>Validation results and a prepared source-jar charge.</summary>
    public class ChargePlan
    {
        public Transaction? Tx { get; init; }
        public string? Error { get; init; }
        public decimal JarRemainingAfter { get; init; }
        public bool InsufficientFunds { get; init; }
    }

    public static class JarFundingHelper
    {
        public const string ExpenseType = "Expense";

        /// <summary>
        /// Gets each jar's available budget for the month containing <paramref name="date"/>.
        /// </summary>
        public static async Task<Dictionary<int, decimal>> GetRemainingByJarAsync(
            PersonalFinanceDbContext context, int userId, DateTime date)
        {
            var start = new DateTime(date.Year, date.Month, 1);
            var end = start.AddMonths(1);
            var month = date.Month;
            var year = date.Year;

            var budgets = await context.Budgets.AsNoTracking()
                .Where(b => b.UserId == userId && b.Month == month && b.Year == year)
                .GroupBy(b => b.JarId)
                .Select(g => new { JarId = g.Key, Total = g.Sum(b => b.BudgetAmount) })
                .ToListAsync();

            var carried = await context.BudgetCarriedOvers.AsNoTracking()
                .Where(c => c.UserId == userId && c.ToMonth == month && c.ToYear == year)
                .GroupBy(c => c.JarId)
                .Select(g => new { JarId = g.Key, Total = g.Sum(c => c.CarriedAmount) })
                .ToListAsync();

            var spent = await context.Transactions.AsNoTracking()
                .Where(t => t.UserId == userId
                            && t.Type == ExpenseType
                            && t.TransactionDate >= start && t.TransactionDate < end)
                .GroupBy(t => t.JarId ?? t.Category!.JarId)
                .Select(g => new { JarId = g.Key, Total = g.Sum(t => t.Amount) })
                .ToListAsync();

            var budgetMap = budgets.ToDictionary(x => x.JarId, x => x.Total);
            var carriedMap = carried.ToDictionary(x => x.JarId, x => x.Total);
            var spentMap = spent.ToDictionary(x => x.JarId, x => x.Total);

            var result = new Dictionary<int, decimal>();
            foreach (var jarId in budgetMap.Keys.Union(carriedMap.Keys))
            {
                result[jarId] = budgetMap.GetValueOrDefault(jarId)
                                + carriedMap.GetValueOrDefault(jarId)
                                - spentMap.GetValueOrDefault(jarId);
            }
            return result;
        }

        /// <summary>Gets one jar's available balance, or null when it has no monthly budget.</summary>
        public static async Task<decimal?> GetRemainingAsync(
            PersonalFinanceDbContext context, int userId, int jarId, DateTime date)
        {
            var all = await GetRemainingByJarAsync(context, userId, date);
            return all.TryGetValue(jarId, out var value) ? value : null;
        }

        /// <summary>Resolves an expense category belonging to the selected source jar.</summary>
        public static async Task<int?> ResolveCategoryIdAsync(
            PersonalFinanceDbContext context, int jarId, int? requested)
        {
            var categories = context.FinancialJars
                .Where(j => j.Id == jarId)
                .SelectMany(j => j.Categories)
                .Where(c => c.Type == ExpenseType);

            if (requested != null)
            {
                var valid = await categories.AnyAsync(c => c.Id == requested.Value);
                return valid ? requested : null;
            }

            return await categories
                .OrderBy(c => c.Id)
                .Select(c => (int?)c.Id)
                .FirstOrDefaultAsync();
        }

        /// <summary>
        /// Validates and prepares a charge. The caller persists the transaction and target update together.
        /// </summary>
        public static async Task<ChargePlan> PrepareChargeAsync(
            PersonalFinanceDbContext context, int userId, int jarId, decimal amount,
            string note, Action<Transaction> link, int? requestedCategoryId = null)
        {
            if (jarId <= 0)
                return Fail("Select a source jar.");

            if (!await context.FinancialJars.AnyAsync(j => j.Id == jarId))
                return Fail("The selected source jar is invalid.");

            var now = DateTime.Now;

            var remaining = await GetRemainingAsync(context, userId, jarId, now);
            if (remaining == null)
                return new ChargePlan
                {
                    Error = "The source jar has no budget for this month.",
                    InsufficientFunds = true
                };
            if (remaining < amount)
                return new ChargePlan
                {
                    Error = $"The source jar has insufficient funds ({remaining:N0} VND available; {amount:N0} VND required).",
                    InsufficientFunds = true
                };

            var categoryId = await ResolveCategoryIdAsync(context, jarId, requestedCategoryId);
            if (categoryId == null)
                return Fail(requestedCategoryId != null
                    ? "The category does not belong to the selected source jar."
                    : "The source jar has no expense category for recording this transaction.");

            var tx = new Transaction
            {
                UserId = userId,
                JarId = jarId,
                CategoryId = categoryId.Value,
                Amount = amount,
                Type = ExpenseType,
                TransactionDate = now,
                Note = note
            };
            link(tx);

            return new ChargePlan { Tx = tx, JarRemainingAfter = remaining.Value - amount };
        }

        private static ChargePlan Fail(string error) => new() { Error = error };
    }
}