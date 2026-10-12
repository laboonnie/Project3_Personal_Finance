using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;
using System.Security.Claims;
using System.Data;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class RemainingActionsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public RemainingActionsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        private int GetCurrentUserId()
        {
            var value = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!int.TryParse(value, out var userId))
                throw new UnauthorizedAccessException("User not authenticated");
            return userId;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary([FromQuery] int month, [FromQuery] int year)
        {
            if (month < 1 || month > 12 || year < 2000 || year > 2100 ||
                (year == 2100 && month == 12))
                return BadRequest(new { message = "Invalid month or year." });

            var userId = GetCurrentUserId();
            var start = new DateTime(year, month, 1);
            var end = start.AddMonths(1);

            var income = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Income" &&
                            t.TransactionDate >= start && t.TransactionDate < end)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var expense = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" &&
                            t.TransactionDate >= start && t.TransactionDate < end)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var carriedIn = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.ToMonth == month && c.ToYear == year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var carriedOut = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.FromMonth == month && c.FromYear == year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;

            var monthlyRemaining = income - expense;
            var beforeProcessing = monthlyRemaining + carriedIn;
            var available = Math.Max(beforeProcessing - carriedOut, 0m);
            return Ok(new
            {
                month,
                year,
                totalIncome = income,
                totalExpense = expense,
                monthlyRemaining,
                carriedIn,
                carriedOut,
                totalAvailableBeforeProcessing = beforeProcessing,
                processedAmount = carriedOut,
                availableRemaining = available,
                hasRemaining = available > 0m
            });
        }

        [HttpGet]
        public async Task<IActionResult> GetActions([FromQuery] int month, [FromQuery] int year)
        {
            if (month < 1 || month > 12 || year < 2000 || year > 2100)
                return BadRequest(new { message = "Invalid month or year." });

            var userId = GetCurrentUserId();
            var actions = await _context.BudgetCarriedOvers
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.FromMonth == month && c.FromYear == year)
                .OrderByDescending(c => c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .Select(c => new
                {
                    c.Id,
                    Month = c.FromMonth,
                    Year = c.FromYear,
                    Amount = c.CarriedAmount,
                    ActionType = "CARRY_OVER",
                    TargetJarId = (int?)c.JarId,
                    TargetJarName = c.Jar.JarName,
                    GoalId = (int?)null,
                    GoalName = (string?)null,
                    DebtId = (int?)null,
                    DebtName = (string?)null,
                    InvestmentId = (int?)null,
                    InvestmentName = (string?)null,
                    c.CreatedAt
                })
                .ToListAsync();
            return Ok(actions);
        }

        // GOAL / DEBT / INVESTMENT allocations are recorded as Expense transactions.
        // This lets the existing monthly remaining calculation subtract them once.
        [HttpPost]
        public async Task<IActionResult> CreateAction([FromBody] RemainingActionDto request)
        {
            if (request == null || request.Month < 1 || request.Month > 12 ||
                request.Year < 2000 || request.Year > 2100 ||
                request.Amount <= 0m)
                return BadRequest(new { message = "Invalid allocation request." });

            var action = (request.ActionType ?? "").Trim().ToUpperInvariant();
            if (action != "GOAL" && action != "DEBT" && action != "INVESTMENT")
                return BadRequest(new { message = "Use GOAL, DEBT or INVESTMENT. Carry Over uses /carry-over." });

            if ((action == "GOAL" && (!request.GoalId.HasValue || request.DebtId.HasValue || request.InvestmentId.HasValue)) ||
                (action == "DEBT" && (!request.DebtId.HasValue || request.GoalId.HasValue || request.InvestmentId.HasValue)) ||
                (action == "INVESTMENT" && (!request.InvestmentId.HasValue || request.GoalId.HasValue || request.DebtId.HasValue)))
                return BadRequest(new { message = "Provide only the matching target ID." });

            var userId = GetCurrentUserId();
            var start = new DateTime(request.Year, request.Month, 1);
            var end = start.AddMonths(1);
            // Do not backdate a newly created allocation or allocate to a future month.
            var today = DateTime.Today;
            if (today < start || today >= end)
                return BadRequest(new { message = "Allocations are supported for the current month only." });

            await using var dbTransaction = await _context.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

            var categoryName = action == "GOAL" ? "Saving" :
                               action == "DEBT" ? "Debt Payment" : "Investment";
            var categories = await _context.Categories
                .Where(c => c.Name == categoryName && c.Type == "Expense")
                .Select(c => new { c.Id, c.JarId }).ToListAsync();
            if (categories.Count != 1)
                return Conflict(new { message = $"Expected exactly one Expense category named {categoryName}." });
            var category = categories[0];
            var jarId = category.JarId;
            if (request.TargetJarId.HasValue && request.TargetJarId.Value != jarId)
                return BadRequest(new { message = "Selected jar does not match the allocation category." });

            string targetName;
            if (action == "GOAL")
            {
                var goal = await _context.Goals.FirstOrDefaultAsync(g =>
                    g.Id == request.GoalId!.Value && g.UserId == userId);
                if (goal == null) return NotFound(new { message = "Goal not found." });
                if (goal.JarId.HasValue && goal.JarId.Value != jarId)
                    return BadRequest(new { message = "Goal belongs to a different jar." });
                var current = goal.CurrentAmount ?? 0m;
                if (goal.TargetAmount.HasValue && current + request.Amount > goal.TargetAmount.Value)
                    return BadRequest(new { message = "Amount exceeds the goal target." });
                goal.CurrentAmount = current + request.Amount;
                targetName = goal.GoalName ?? $"Goal #{goal.Id}";
            }
            else if (action == "DEBT")
            {
                var debt = await _context.Debts.FirstOrDefaultAsync(d =>
                    d.Id == request.DebtId!.Value && d.UserId == userId);
                if (debt == null) return NotFound(new { message = "Debt not found." });
                if (debt.JarId.HasValue && debt.JarId.Value != jarId)
                    return BadRequest(new { message = "Debt belongs to a different jar." });
                if (!debt.RemainingAmount.HasValue || debt.RemainingAmount.Value < request.Amount)
                    return BadRequest(new { message = "Amount exceeds the remaining debt." });
                debt.RemainingAmount -= request.Amount;
                targetName = debt.DebtName ?? $"Debt #{debt.Id}";
            }
            else
            {
                var investment = await _context.Investments.FirstOrDefaultAsync(i =>
                    i.Id == request.InvestmentId!.Value && i.UserId == userId);
                if (investment == null) return NotFound(new { message = "Investment not found." });
                if (investment.JarId.HasValue && investment.JarId.Value != jarId)
                    return BadRequest(new { message = "Investment belongs to a different jar." });
                investment.AmountInvested = (investment.AmountInvested ?? 0m) + request.Amount;
                // CurrentValue is a valuation, not a cash contribution; leave it unchanged.
                targetName = investment.AssetName ?? $"Investment #{investment.Id}";
            }

            var budgetAmounts = await _context.Budgets
                .Where(b => b.UserId == userId && b.JarId == jarId &&
                            b.Month == request.Month && b.Year == request.Year)
                .Select(b => b.BudgetAmount).ToListAsync();
            if (budgetAmounts.Count != 1)
                return BadRequest(new { message = "Exactly one monthly budget is required for this jar." });

            var jarSpent = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" &&
                            t.TransactionDate >= start && t.TransactionDate < end &&
                            t.Category.JarId == jarId)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var jarCarriedIn = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.JarId == jarId &&
                            c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var jarCarriedOut = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.JarId == jarId &&
                            c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var jarAvailable = budgetAmounts[0] + jarCarriedIn - jarSpent - jarCarriedOut;
            if (request.Amount > jarAvailable)
                return BadRequest(new { message = "Amount exceeds the selected jar's remaining budget.", jarAvailable = Math.Max(0m, jarAvailable) });

            var income = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Income" &&
                            t.TransactionDate >= start && t.TransactionDate < end)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var expense = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" &&
                            t.TransactionDate >= start && t.TransactionDate < end)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var carriedIn = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var carriedOut = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var available = income - expense + carriedIn - carriedOut;
            if (request.Amount > available)
                return BadRequest(new { message = "Amount exceeds available remaining money.", availableRemaining = Math.Max(0m, available) });

            var transaction = new Transaction
            {
                UserId = userId,
                CategoryId = category.Id,
                JarId = jarId,
                Amount = request.Amount,
                Type = "Expense",
                TransactionDate = today,
                Note = $"[REMAINING:{action}] {targetName}",
                GoalId = action == "GOAL" ? request.GoalId : null,
                DebtId = action == "DEBT" ? request.DebtId : null,
                InvestmentId = action == "INVESTMENT" ? request.InvestmentId : null
            };
            _context.Transactions.Add(transaction);
            _context.Notifications.Add(new Notification
            {
                UserId = userId,
                Title = "Remaining money allocated",
                Message = $"{request.Amount:N0} VND allocated to {action}: {targetName}.",
                Type = "REMAINING_ALLOCATION",
                IsRead = false,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();
            return Ok(new
            {
                message = "Allocation successful.",
                actionType = action,
                transactionId = transaction.Id,
                amount = request.Amount,
                jarId,
                availableRemainingAfter = available - request.Amount,
                jarRemainingAfter = jarAvailable - request.Amount
            });
        }

        [HttpPost("carry-over")]
        public async Task<IActionResult> CarryOver([FromBody] RemainingActionDto request)
        {
            if (request == null || request.Month < 1 || request.Month > 12 ||
                request.Year < 2000 || request.Year > 2100 ||
                (request.Year == 2100 && request.Month == 12) ||
                request.Amount <= 0m || !request.TargetJarId.HasValue ||
                !string.Equals(request.ActionType?.Trim(), "CARRY_OVER", StringComparison.OrdinalIgnoreCase))
                return BadRequest(new { message = "Invalid carry-over request." });

            var userId = GetCurrentUserId();
            var jarId = request.TargetJarId.Value;
            var from = new DateTime(request.Year, request.Month, 1);
            var next = from.AddMonths(1);

            // SERIALIZABLE keeps balance checks and the new carry-over row together.
            await using var dbTransaction = await _context.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

            var jarExists = await _context.FinancialJars.AnyAsync(j => j.Id == jarId);
            if (!jarExists)
                return BadRequest(new { message = "Jar not found." });

            var budgets = await _context.Budgets
                .Where(b => b.UserId == userId && b.JarId == jarId &&
                            b.Month == request.Month && b.Year == request.Year)
                .Select(b => b.BudgetAmount)
                .ToListAsync();

            if (budgets.Count == 0)
                return BadRequest(new { message = "Set a budget for this jar before carrying money over." });
            if (budgets.Count > 1)
                return Conflict(new { message = "Multiple budgets exist for this jar and month. Resolve duplicate budgets first." });

            var budgetAmount = budgets[0];
            var jarCarriedIn = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.JarId == jarId &&
                            c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var jarCarriedOut = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.JarId == jarId &&
                            c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;

            // Same jar attribution as BudgetsController: Category.JarId.
            var jarSpent = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" &&
                            t.TransactionDate >= from && t.TransactionDate < next &&
                            t.Category.JarId == jarId)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;

            var jarAvailable = budgetAmount + jarCarriedIn - jarSpent - jarCarriedOut;
            if (request.Amount > jarAvailable)
                return BadRequest(new
                {
                    message = "Amount exceeds this jar's remaining budget.",
                    jarAvailable = Math.Max(jarAvailable, 0m)
                });

            var income = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Income" &&
                            t.TransactionDate >= from && t.TransactionDate < next)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var expense = await _context.Transactions
                .Where(t => t.UserId == userId && t.Type == "Expense" &&
                            t.TransactionDate >= from && t.TransactionDate < next)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var carriedIn = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var carriedOut = await _context.BudgetCarriedOvers
                .Where(c => c.UserId == userId && c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;

            var available = income - expense + carriedIn - carriedOut;
            if (request.Amount > available)
                return BadRequest(new
                {
                    message = "Amount exceeds available remaining money for this month.",
                    availableRemaining = Math.Max(available, 0m)
                });

            _context.BudgetCarriedOvers.Add(new BudgetCarriedOver
            {
                UserId = userId,
                JarId = jarId,
                FromMonth = request.Month,
                FromYear = request.Year,
                ToMonth = next.Month,
                ToYear = next.Year,
                CarriedAmount = request.Amount,
                CreatedAt = DateTime.Now
            });

            _context.Notifications.Add(new Notification
            {
                UserId = userId,
                Title = "Money carried over",
                Message = $"{request.Amount:N0} VND carried from jar to {next.Month}/{next.Year}.",
                Type = "CARRY_OVER",
                IsRead = false,
                CreatedAt = DateTime.Now
            });

            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();

            return Ok(new
            {
                message = "Carry over successful.",
                amount = request.Amount,
                fromMonth = request.Month,
                fromYear = request.Year,
                toMonth = next.Month,
                toYear = next.Year,
                jarId,
                jarRemainingAfter = jarAvailable - request.Amount,
                availableRemainingAfter = available - request.Amount
            });
        }
    }
}
