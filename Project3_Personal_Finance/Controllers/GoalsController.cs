using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class GoalsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<GoalsController> _logger;

        public GoalsController(
            PersonalFinanceDbContext context, IWebHostEnvironment env, ILogger<GoalsController> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        private int CurrentUserId =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private static bool IsCompleted(Goal g) =>
            string.Equals(g.Status, "completed", StringComparison.OrdinalIgnoreCase);

        private IActionResult ServerError(Exception ex, string friendly)
        {
            _logger.LogError(ex, "{Message}", friendly);
            var message = _env.IsDevelopment()
                ? $"{friendly} ({ex.InnerException?.Message ?? ex.Message})"
                : friendly;
            return StatusCode(500, new { message });
        }

        // GET: api/Goals
        [HttpGet]
        public async Task<IActionResult> GetGoals()
        {
            var userId = CurrentUserId;

            var goals = await _context.Goals.AsNoTracking()
                .Where(g => g.UserId == userId)
                .OrderBy(g => g.Deadline)
                .ToListAsync();

            var ids = goals.Select(g => g.Id).ToList();
            var transfers = (await _context.Transactions.AsNoTracking()
                    .Where(t => t.UserId == userId && t.GoalId != null && ids.Contains(t.GoalId.Value))
                    .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.TransactionDate,
                        t.Note,
                        t.JarId,
                        JarName = t.Jar != null ? t.Jar.JarName : null,
                        t.GoalId
                    })
                    .ToListAsync())
                .ToLookup(t => t.GoalId);

            var jarNames = await _context.FinancialJars.AsNoTracking()
                .ToDictionaryAsync(j => j.Id, j => j.JarName);
            var scheduleRecords = await _context.Notifications.AsNoTracking()
                .Where(n => n.UserId == userId && n.Type == "GOAL_SCHEDULE")
                .ToListAsync();
            var schedules = scheduleRecords
                .Select(n => (Notification: n, GoalId: ParseScheduleGoalId(n.Title)))
                .Where(x => x.GoalId != null)
                .ToDictionary(
                    x => x.GoalId!.Value,
                    x => GoalPaymentSchedule.Parse(x.Notification.Message));
            var todayDate = DateOnly.FromDateTime(DateTime.Today);

            var result = goals.Select(g =>
            {
                var due = DueDateHelper.Evaluate(g.Deadline, IsCompleted(g), lockWhenOverdue: false);
                schedules.TryGetValue(g.Id, out var schedule);
                var nextScheduleDate = schedule?.NextPaymentDate ?? schedule?.StartDate;
                if (nextScheduleDate < todayDate)
                    nextScheduleDate = todayDate;
                return new
                {
                    g.Id,
                    g.UserId,
                    g.GoalName,
                    g.TargetAmount,
                    g.CurrentAmount,
                    g.Deadline,
                    g.Status,
                    g.JarId,
                    JarName = g.JarId != null && jarNames.TryGetValue(g.JarId.Value, out var jn) ? jn : null,
                    dueStatus = due.Status,
                    due.IsLocked,
                    due.DaysUntilDue,
                    due.Warning,
                    autoPayEnabled = schedule?.Enabled == true,
                    autoPayJarId = schedule?.JarId,
                    autoPayAmount = schedule?.Amount,
                    autoPayStartDate = nextScheduleDate?.ToString("yyyy-MM-dd"),
                    autoPayNextPaymentDate = (schedule?.PendingPaymentDate ?? schedule?.NextPaymentDate)?.ToString("yyyy-MM-dd"),
                    autoPayCycle = schedule?.Cycle,
                    Transactions = transfers[g.Id]
                };
            });

            return Ok(result);
        }

        // GET: api/Goals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Goal>> GetGoal(int id)
        {
            var userId = CurrentUserId;
            var goal = await _context.Goals.AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
            if (goal == null) return NotFound();
            return goal;
        }

        // PUT: api/Goals/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutGoal(int id, GoalUpsertRequest request)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                if (string.IsNullOrWhiteSpace(request.GoalName))
                    return BadRequest(new { message = "Goal name is required." });
                if ((request.TargetAmount ?? 0) <= 0)
                    return BadRequest(new { message = "The target amount must be greater than zero." });

                var existing = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
                if (existing == null) return NotFound();

                var current = existing.CurrentAmount ?? 0;
                if (request.TargetAmount < current)
                    return BadRequest(new { message = $"The target cannot be lower than the amount already saved ({current:N0} VND)." });

                var scheduleError = await ApplyScheduleAsync(userId, existing, request);
                if (scheduleError != null)
                    return BadRequest(new { message = scheduleError });

                existing.GoalName = request.GoalName.Trim();
                existing.TargetAmount = request.TargetAmount;
                existing.Deadline = request.Deadline;
                existing.Status = current >= request.TargetAmount ? "completed" : "in-progress";

                await _context.SaveChangesAsync();
                return NoContent();
            });
        }

        // POST: api/Goals
        [HttpPost]
        public async Task<ActionResult<Goal>> PostGoal(GoalUpsertRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.GoalName))
                return BadRequest(new { message = "Goal name is required." });
            if ((request.TargetAmount ?? 0) <= 0)
                return BadRequest(new { message = "The target amount must be greater than zero." });

            var goal = new Goal
            {
                UserId = CurrentUserId,
                GoalName = request.GoalName.Trim(),
                TargetAmount = request.TargetAmount,
                Deadline = request.Deadline,
                CurrentAmount = 0,
                Status = "in-progress"
            };

            _context.Goals.Add(goal);
            await using (var transaction = await _context.Database.BeginTransactionAsync())
            {
                await _context.SaveChangesAsync();
                var scheduleError = await ApplyScheduleAsync(CurrentUserId, goal, request);
                if (scheduleError != null)
                {
                    await transaction.RollbackAsync();
                    return BadRequest(new { message = scheduleError });
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }

            return CreatedAtAction(nameof(GetGoal), new { id = goal.Id }, goal);
        }

        // DELETE: api/Goals/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGoal(int id)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                var goal = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
                if (goal == null) return NotFound();

                try
                {
                    var scheduleTitle = $"GoalSchedule:{goal.Id}";
                    var failureTitle = AutoPayHelper.FailedPrefix
                        + AutoPayHelper.EntityTitleId(AutoPayHelper.GoalType, goal.Id);
                    var relatedNotifications = await _context.Notifications
                        .Where(notification => notification.UserId == userId
                            && ((notification.Type == "GOAL_SCHEDULE" && notification.Title == scheduleTitle)
                                || (notification.Type == AutoPayHelper.GoalType
                                    && notification.Title == failureTitle)))
                        .ToListAsync();
                    _context.Notifications.RemoveRange(relatedNotifications);
                    _context.Goals.Remove(goal);
                    await _context.SaveChangesAsync();
                    return NoContent();
                }
                catch (DbUpdateException)
                {
                    return Conflict(new { message = "This goal has linked transactions and cannot be deleted." });
                }
            });
        }

        // POST: api/Goals/5/deposit
        [HttpPost("{id}/deposit")]
        public async Task<IActionResult> Deposit(int id, [FromBody] FundTransferRequest request)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                var goal = await _context.Goals.FirstOrDefaultAsync(g => g.Id == id && g.UserId == userId);
                if (goal == null) return NotFound();

                if (IsCompleted(goal))
                    return BadRequest(new { message = "This goal is already complete." });

                var due = DueDateHelper.Evaluate(goal.Deadline, false, lockWhenOverdue: false);
                if (due.IsLocked)
                    return BadRequest(new { message = due.Warning });

                if (request.Amount <= 0)
                    return BadRequest(new { message = "The amount must be greater than zero." });

                var needed = (goal.TargetAmount ?? 0) - (goal.CurrentAmount ?? 0);
                if (needed <= 0)
                    return BadRequest(new { message = "This goal is already fully funded." });
                if (request.Amount > needed)
                    return BadRequest(new { message = $"The deposit cannot exceed the remaining amount ({needed:N0} VND)." });

                // Validate the source jar and prepare the expense transaction.
                var plan = await JarFundingHelper.PrepareChargeAsync(
                    _context, userId, request.JarId, request.Amount,
                    $"Goal deposit: {goal.GoalName}", tx => tx.GoalId = goal.Id, request.CategoryId);
                if (plan.Error != null)
                    return BadRequest(new { message = plan.Error });

                try
                {
                    // Persist the transaction and goal update in one database transaction.
                    _context.Transactions.Add(plan.Tx!);
                    goal.CurrentAmount = (goal.CurrentAmount ?? 0) + request.Amount;
                    goal.JarId = request.JarId;
                    if (goal.CurrentAmount >= goal.TargetAmount)
                    {
                        goal.Status = "completed";
                        var scheduleRecord = await _context.Notifications.FirstOrDefaultAsync(notification =>
                            notification.UserId == userId
                            && notification.Type == "GOAL_SCHEDULE"
                            && notification.Title == $"GoalSchedule:{goal.Id}");
                        if (scheduleRecord != null)
                        {
                            var schedule = GoalPaymentSchedule.Parse(scheduleRecord.Message);
                            if (schedule != null)
                            {
                                schedule.Enabled = false;
                                schedule.NextPaymentDate = null;
                                schedule.PendingPaymentDate = null;
                                scheduleRecord.Message = schedule.Serialize();
                            }
                        }

                        var failureTitle = AutoPayHelper.FailedPrefix
                            + AutoPayHelper.EntityTitleId(AutoPayHelper.GoalType, goal.Id);
                        var failures = await _context.Notifications
                            .Where(notification => notification.UserId == userId
                                && notification.Type == AutoPayHelper.GoalType
                                && notification.Title == failureTitle)
                            .ToListAsync();
                        _context.Notifications.RemoveRange(failures);
                    }
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        goalId = goal.Id,
                        currentAmount = goal.CurrentAmount,
                        targetAmount = goal.TargetAmount,
                        progress = Math.Round((goal.CurrentAmount ?? 0) / (goal.TargetAmount ?? 1) * 100, 2),
                        status = goal.Status,
                        transactionId = plan.Tx!.Id,
                        jarRemaining = plan.JarRemainingAfter
                    });
                }
                catch (Exception ex)
                {
                    return ServerError(ex, "An error occurred while depositing into the goal.");
                }
            });
        }

        private async Task<string?> ApplyScheduleAsync(int userId, Goal goal, GoalUpsertRequest request)
        {
            var title = $"GoalSchedule:{goal.Id}";
            var existing = goal.Id == 0
                ? null
                : await _context.Notifications.FirstOrDefaultAsync(n =>
                    n.UserId == userId && n.Type == "GOAL_SCHEDULE" && n.Title == title);
            var failedTitle = AutoPayHelper.FailedPrefix
                + AutoPayHelper.EntityTitleId(AutoPayHelper.GoalType, goal.Id);
            var failures = await _context.Notifications
                .Where(notification => notification.UserId == userId
                    && notification.Type == AutoPayHelper.GoalType
                    && notification.Title == failedTitle)
                .ToListAsync();
            _context.Notifications.RemoveRange(failures);

            if (!request.AutoPayEnabled)
            {
                if (existing != null)
                    _context.Notifications.Remove(existing);
                return null;
            }

            if (request.AutoPayJarId is not > 0 || request.AutoPayAmount is not > 0
                || request.AutoPayStartDate == null
                || string.IsNullOrWhiteSpace(request.AutoPayCycle))
                return "Choose a source jar, payment amount, start date, and supported payment cycle.";

            var cycle = request.AutoPayCycle.Trim().ToLowerInvariant();
            if (!GoalPaymentSchedule.SupportedCycles.Contains(cycle))
                return "Choose a supported automatic payment cycle.";

            if (request.AutoPayStartDate < DateOnly.FromDateTime(DateTime.Today))
                return "The first automatic payment date cannot be in the past.";

            if (!await _context.FinancialJars.AnyAsync(j => j.Id == request.AutoPayJarId.Value))
                return "The selected source jar does not exist.";

            if (await JarFundingHelper.ResolveCategoryIdAsync(
                    _context, request.AutoPayJarId.Value, null) == null)
                return "The selected source jar has no expense category.";

            if (IsCompleted(goal))
                return "Automatic payments cannot be scheduled for a completed goal.";

            var schedule = new GoalPaymentSchedule
            {
                JarId = request.AutoPayJarId.Value,
                Amount = request.AutoPayAmount.Value,
                StartDate = request.AutoPayStartDate.Value,
                NextPaymentDate = request.AutoPayStartDate.Value,
                AnchorDay = request.AutoPayStartDate.Value.Day,
                Cycle = cycle,
                Enabled = true
            };

            if (existing == null)
            {
                existing = GoalPaymentSchedule.CreateRecord(userId, goal.Id, schedule);
                _context.Notifications.Add(existing);
            }
            else
            {
                existing.Message = schedule.Serialize();
                existing.IsRead = true;
            }

            goal.JarId = request.AutoPayJarId;
            return null;
        }

        private static int? ParseScheduleGoalId(string title)
        {
            const string prefix = "GoalSchedule:";
            return title.StartsWith(prefix, StringComparison.Ordinal)
                && int.TryParse(title[prefix.Length..], out var id)
                    ? id
                    : null;
        }
    }
}