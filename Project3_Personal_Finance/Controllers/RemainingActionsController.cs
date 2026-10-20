using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;
using System.Security.Claims;
using System.Data;

namespace Project3_Personal_Finance.Controllers
{
    public class JarTransferRequest
    {
        public int Month { get; set; }
        public int Year { get; set; }
        public int SourceJarId { get; set; }
        public int TargetJarId { get; set; }
        public decimal Amount { get; set; }
    }

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
            var rows = await _context.BudgetCarriedOvers
                .AsNoTracking()
                .Where(c => c.UserId == userId && c.FromMonth == month && c.FromYear == year)
                .OrderByDescending(c => c.CreatedAt)
                .ThenByDescending(c => c.Id)
                .Select(c => new { c.Id, c.FromMonth, c.FromYear, c.CarriedAmount,
                                   c.JarId, TargetJarName = c.Jar.JarName, c.CreatedAt })
                .ToListAsync();
            var notes = await _context.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId && n.Type == "JAR_TRANSFER")
                .Select(n => n.Message).ToListAsync();
            var jarNames = await _context.FinancialJars
                .AsNoTracking().ToDictionaryAsync(j => j.Id, j => j.JarName);
            var transferSources = new Dictionary<int, int>();
            foreach (var note in notes)
            {
                var match = System.Text.RegularExpressions.Regex.Match(note ?? "",
                    @"\[JAR_TRANSFER:(\d+):(\d+):(\d+)\]");
                if (match.Success && int.TryParse(match.Groups[1].Value, out var id) &&
                    int.TryParse(match.Groups[2].Value, out var sourceId) &&
                    int.TryParse(match.Groups[3].Value, out var targetId))
                    transferSources[id] = sourceId;
            }
            var actions = rows.Select(c => new {
                c.Id,
                Month = c.FromMonth,
                Year = c.FromYear,
                Amount = c.CarriedAmount,
                ActionType = transferSources.ContainsKey(c.Id) ? "JAR" : "CARRY_OVER",
                SourceJarId = transferSources.TryGetValue(c.Id, out var source) ? (int?)source : c.JarId,
                SourceJarName = transferSources.TryGetValue(c.Id, out var sourceNameId) &&
                    jarNames.TryGetValue(sourceNameId, out var sourceName) ? sourceName : c.TargetJarName,
                TargetJarId = c.JarId,
                c.TargetJarName,
                c.CreatedAt
            }).ToList();
            return Ok(actions);
        }

        // Transfer a source jar's remaining budget this month to a different jar next month.
        // No schema changes: source BudgetAmount decreases; destination receives a
        // BudgetCarriedOver entry. The transfer marker is stored in Notifications.
        [HttpPost("jar-transfer")]
        public async Task<IActionResult> TransferToJar([FromBody] JarTransferRequest request)
        {
            if (request == null || request.Month < 1 || request.Month > 12 ||
                request.Year < 2000 || request.Year > 2100 ||
                (request.Year == 2100 && request.Month == 12) ||
                request.Amount <= 0 || request.SourceJarId <= 0 || request.TargetJarId <= 0 ||
                request.SourceJarId == request.TargetJarId)
                return BadRequest(new { message = "Invalid jar transfer request. Choose two different jars." });

            var userId = GetCurrentUserId();
            var from = new DateTime(request.Year, request.Month, 1);
            var next = from.AddMonths(1);

            await using var dbTransaction = await _context.Database
                .BeginTransactionAsync(IsolationLevel.Serializable);

            var sourceJar = await _context.FinancialJars
                .FirstOrDefaultAsync(j => j.Id == request.SourceJarId);
            var targetJar = await _context.FinancialJars
                .FirstOrDefaultAsync(j => j.Id == request.TargetJarId);
            if (sourceJar == null || targetJar == null)
                return BadRequest(new { message = "Source or destination jar not found." });

            var sourceBudgets = await _context.Budgets.Where(b =>
                b.UserId == userId && b.JarId == request.SourceJarId &&
                b.Month == request.Month && b.Year == request.Year).ToListAsync();
            if (sourceBudgets.Count != 1)
                return BadRequest(new { message = "Source jar must have exactly one budget for this month." });
            var sourceBudget = sourceBudgets[0];

            var spent = await _context.Transactions.Where(t =>
                t.UserId == userId && t.Type == "Expense" &&
                t.TransactionDate >= from && t.TransactionDate < next &&
                t.Category.JarId == request.SourceJarId)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var sourceCarriedIn = await _context.BudgetCarriedOvers.Where(c =>
                c.UserId == userId && c.JarId == request.SourceJarId &&
                c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var sourceCarriedOut = await _context.BudgetCarriedOvers.Where(c =>
                c.UserId == userId && c.JarId == request.SourceJarId &&
                c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;

            // This approach reduces the source's base budget. It cannot transfer
            // more than that base budget, even if the jar also has carried-in funds.
            var sourceAvailable = sourceBudget.BudgetAmount + sourceCarriedIn - spent - sourceCarriedOut;
            if (request.Amount > sourceAvailable || request.Amount > sourceBudget.BudgetAmount)
                return BadRequest(new {
                    message = "Amount exceeds source jar's transferable budget.",
                    available = Math.Max(0m, Math.Min(sourceAvailable, sourceBudget.BudgetAmount))
                });

            var income = await _context.Transactions.Where(t =>
                t.UserId == userId && t.Type == "Income" &&
                t.TransactionDate >= from && t.TransactionDate < next)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var expense = await _context.Transactions.Where(t =>
                t.UserId == userId && t.Type == "Expense" &&
                t.TransactionDate >= from && t.TransactionDate < next)
                .SumAsync(t => (decimal?)t.Amount) ?? 0m;
            var carriedIn = await _context.BudgetCarriedOvers.Where(c =>
                c.UserId == userId && c.ToMonth == request.Month && c.ToYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var carriedOut = await _context.BudgetCarriedOvers.Where(c =>
                c.UserId == userId && c.FromMonth == request.Month && c.FromYear == request.Year)
                .SumAsync(c => (decimal?)c.CarriedAmount) ?? 0m;
            var globalAvailable = income - expense + carriedIn - carriedOut;
            if (request.Amount > globalAvailable)
                return BadRequest(new {
                    message = "Amount exceeds available remaining money.",
                    availableRemaining = Math.Max(0m, globalAvailable)
                });

            sourceBudget.BudgetAmount -= request.Amount;
            var transfer = new BudgetCarriedOver {
                UserId = userId,
                JarId = request.TargetJarId,
                FromMonth = request.Month,
                FromYear = request.Year,
                ToMonth = next.Month,
                ToYear = next.Year,
                CarriedAmount = request.Amount,
                CreatedAt = DateTime.Now
            };
            _context.BudgetCarriedOvers.Add(transfer);
            await _context.SaveChangesAsync();

            // Marker links the notification to the transfer without new DB columns.
            _context.Notifications.Add(new Notification {
                UserId = userId,
                Title = "Jar transfer",
                Message = $"{request.Amount:N0} VND: {sourceJar.JarName} {request.Month}/{request.Year} -> {targetJar.JarName} {next.Month}/{next.Year} [JAR_TRANSFER:{transfer.Id}:{request.SourceJarId}:{request.TargetJarId}]",
                Type = "JAR_TRANSFER",
                IsRead = false,
                CreatedAt = DateTime.Now
            });
            await _context.SaveChangesAsync();
            await dbTransaction.CommitAsync();
            return Ok(new {
                message = "Jar transfer successful.",
                transferId = transfer.Id,
                sourceJarId = request.SourceJarId,
                targetJarId = request.TargetJarId,
                amount = request.Amount,
                fromMonth = request.Month,
                fromYear = request.Year,
                toMonth = next.Month,
                toYear = next.Year,
                sourceRemainingAfter = sourceAvailable - request.Amount,
                availableRemainingAfter = globalAvailable - request.Amount
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
