using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    public class DueAlertMarkReadRequest
    {
        public List<int> Ids { get; set; } = new();
    }

    public sealed class ConfirmPaymentRequest
    {
        public int NotificationId { get; set; }
        public int JarId { get; set; }
    }

    /// <summary>Goal and debt notifications for the authenticated user.</summary>
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DueAlertsController : ControllerBase
    {
        private const string DebtType = AutoPayHelper.DebtType;
        private const string GoalType = AutoPayHelper.GoalType;

        private readonly PersonalFinanceDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<DueAlertsController> _logger;

        public DueAlertsController(
            PersonalFinanceDbContext context, IWebHostEnvironment env, ILogger<DueAlertsController> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        private int? GetCurrentUserId()
        {
            var raw = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(raw, out var id) ? id : null;
        }

        private record Candidate(
            string Type, string Kind, string Name, string Title, string Message,
            bool IsOverdue, int Days, decimal Amount, DateOnly? DueDate, int? JarId, int EntityId);

        private record AlertItem(
            int NotificationId, string Kind, string Name, string Message, string Status,
            int Days, decimal? Amount, string? DueDate, string? JarName, string? Reason,
            int? EntityId, bool CanConfirmPayment, IReadOnlyList<JarOption>? AlternativeJars);

        private record JarOption(int Id, string Name, decimal? Remaining);

        private static string KindOf(string type) => type == DebtType ? "Debt" : "Goal";

        private static bool IsAutoTitle(string title) =>
            title.StartsWith(AutoPayHelper.PaidPrefix) || title.StartsWith(AutoPayHelper.FailedPrefix);

        private static string ParseReason(string message)
        {
            const string separator = ": ";
            var idx = message.IndexOf(separator, StringComparison.Ordinal);
            return idx >= 0 ? message[(idx + separator.Length)..] : message;
        }

        // Runs automatic payments and returns all current goal and debt due alerts.
        [HttpGet]
        public async Task<IActionResult> GetAlerts()
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();
            var userId = currentUserId.Value;

            try
            {
                await AutoPayHelper.RunForUserAsync(_context, userId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Auto-pay on login failed for user {UserId}", userId);
                _context.ChangeTracker.Clear();
            }

            try
            {
                var today = DateTime.Today;

                var debts = await _context.Debts.Where(d => d.UserId == userId).ToListAsync();
                var goals = await _context.Goals.Where(g => g.UserId == userId).ToListAsync();
                var jarNames = await _context.FinancialJars.AsNoTracking()
                    .ToDictionaryAsync(j => j.Id, j => j.JarName);

                string? JarNameOf(int? id) =>
                    id != null && jarNames.TryGetValue(id.Value, out var n) ? n : null;

                var pendingFailures = await _context.Notifications
                    .Where(n => n.UserId == userId
                        && (n.Type == DebtType || n.Type == GoalType)
                        && n.Title.StartsWith(AutoPayHelper.FailedPrefix))
                    .ToListAsync();
                foreach (var failure in pendingFailures)
                    failure.IsRead = false;

                var notifications = await _context.Notifications
                    .Where(n => n.UserId == userId
                        && (n.Type == DebtType || n.Type == GoalType))
                    .ToListAsync();

                var autoNotifs = notifications
                    .Where(n => IsAutoTitle(n.Title)
                        && (n.CreatedAt >= today || n.Title.StartsWith(AutoPayHelper.FailedPrefix)))
                    .ToList();
                var existing = notifications.Where(n => !IsAutoTitle(n.Title)).ToList();

                var autoKeys = autoNotifs
                    .Select(n =>
                    {
                        var parsed = AutoPayHelper.ParseEntityTitleId(n.Title);
                        return $"{n.Type}|{parsed.Id?.ToString() ?? n.Title}";
                    })
                    .ToHashSet();

                var candidates = new List<Candidate>();

                foreach (var d in debts)
                {
                    var due = DueDateHelper.Evaluate(d.DueDate, (d.RemainingAmount ?? 0) <= 0);
                    if (due.Status is DueDateHelper.DueSoon or DueDateHelper.Overdue)
                    {
                        var name = d.DebtName ?? "Debt";
                        candidates.Add(new Candidate(
                            DebtType, "Debt", name, $"Debt: {name}", due.Warning ?? "",
                            due.Status == DueDateHelper.Overdue, due.DaysUntilDue ?? 0,
                            d.RemainingAmount ?? 0, d.DueDate, d.JarId, d.Id));
                    }
                }

                foreach (var g in goals)
                {
                    var completed = string.Equals(g.Status, "completed", StringComparison.OrdinalIgnoreCase);
                    var due = DueDateHelper.Evaluate(g.Deadline, completed, lockWhenOverdue: false);
                    if (due.Status is DueDateHelper.DueSoon or DueDateHelper.Overdue)
                    {
                        var name = g.GoalName ?? "Goal";
                        candidates.Add(new Candidate(
                            GoalType, "Goal", name, $"Goal: {name}", due.Warning ?? "",
                            due.Status == DueDateHelper.Overdue, due.DaysUntilDue ?? 0,
                            (g.TargetAmount ?? 0) - (g.CurrentAmount ?? 0), g.Deadline, g.JarId, g.Id));
                    }
                }

                candidates = candidates
                    .Where(c => !autoKeys.Contains($"{c.Type}|{c.EntityId}"))
                    .ToList();

                var pairs = new List<(Notification Notif, Candidate C)>();
                var usedNotificationIds = new HashSet<int>();
                foreach (var c in candidates)
                {
                    var notificationTitle = $"DueAlert:{c.Type}:{c.EntityId}";
                    var notif = existing.FirstOrDefault(n =>
                        n.Type == c.Type && n.Title == notificationTitle);
                    notif ??= existing.FirstOrDefault(n =>
                        n.Type == c.Type
                        && n.Title == c.Title
                        && !usedNotificationIds.Contains(n.Id));

                    if (notif == null)
                    {
                        notif = new Notification
                        {
                            UserId = userId,
                            Title = notificationTitle,
                            Message = c.Message,
                            Type = c.Type,
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };
                        _context.Notifications.Add(notif);
                        existing.Add(notif);
                    }
                    else
                    {
                        notif.Title = notificationTitle;
                        notif.Message = c.Message;
                    }

                    usedNotificationIds.Add(notif.Id);
                    pairs.Add((notif, c));
                }

                await _context.SaveChangesAsync();

                var items = new List<AlertItem>();
                var remainingByJar = await JarFundingHelper.GetRemainingByJarAsync(
                    _context, userId, DateTime.Now);
                var jarOptions = await _context.FinancialJars.AsNoTracking()
                    .Where(jar => jar.Categories.Any(category => category.Type == JarFundingHelper.ExpenseType))
                    .Select(jar => new { jar.Id, jar.JarName })
                    .ToListAsync();

                foreach (var n in autoNotifs.Where(n => !n.IsRead))
                {
                    var parsed = AutoPayHelper.ParseEntityTitleId(n.Title);
                    var paid = n.Title.StartsWith(AutoPayHelper.PaidPrefix);
                    var entityId = parsed.Id;
                    var name = parsed.Kind;
                    decimal? amount = null;
                    DateOnly? dueDate = null;
                    int? jarId = null;

                    if (n.Type == DebtType)
                    {
                        var d = entityId != null
                            ? debts.FirstOrDefault(x => x.Id == entityId.Value)
                            : debts.FirstOrDefault(x =>
                                n.Title.EndsWith(x.DebtName ?? "Debt", StringComparison.Ordinal));
                        if (d != null)
                        {
                            name = d.DebtName ?? "Debt";
                            entityId ??= d.Id;
                            dueDate = d.DueDate;
                            jarId = d.JarId;
                            amount = paid ? null : d.RemainingAmount ?? 0;
                            if (paid)
                            {
                                var tx = await _context.Transactions.AsNoTracking()
                                    .Where(t => t.UserId == userId && t.DebtId == d.Id && t.TransactionDate >= today)
                                    .OrderByDescending(t => t.Id)
                                    .FirstOrDefaultAsync();
                                if (tx != null) { amount = tx.Amount; jarId = tx.JarId ?? jarId; }
                            }
                        }
                    }
                    else
                    {
                        var g = entityId != null
                            ? goals.FirstOrDefault(x => x.Id == entityId.Value)
                            : goals.FirstOrDefault(x =>
                                n.Title.EndsWith(x.GoalName ?? "Goal", StringComparison.Ordinal));
                        if (g != null)
                        {
                            name = g.GoalName ?? "Goal";
                            entityId ??= g.Id;
                            dueDate = g.Deadline;
                            jarId = g.JarId;
                            amount = paid ? null : (g.TargetAmount ?? 0) - (g.CurrentAmount ?? 0);
                            if (!paid)
                            {
                                var scheduleRecord = await _context.Notifications.AsNoTracking()
                                    .FirstOrDefaultAsync(item =>
                                        item.UserId == userId
                                        && item.Type == "GOAL_SCHEDULE"
                                        && item.Title == $"GoalSchedule:{g.Id}");
                                var schedule = scheduleRecord == null
                                    ? null
                                    : GoalPaymentSchedule.Parse(scheduleRecord.Message);
                                if (schedule?.PendingPaymentDate is DateOnly pendingDate)
                                {
                                    amount = Math.Min(
                                        schedule.Amount,
                                        (g.TargetAmount ?? 0) - (g.CurrentAmount ?? 0));
                                    dueDate = pendingDate;
                                    jarId = schedule.JarId;
                                }
                            }
                            if (paid)
                            {
                                var tx = await _context.Transactions.AsNoTracking()
                                    .Where(t => t.UserId == userId && t.GoalId == g.Id && t.TransactionDate >= today)
                                    .OrderByDescending(t => t.Id)
                                    .FirstOrDefaultAsync();
                                if (tx != null) { amount = tx.Amount; jarId = tx.JarId ?? jarId; }
                            }
                        }
                    }

                    var reason = paid ? null : ParseReason(n.Message);
                    var canConfirmPayment = !paid && entityId != null;
                    var alternatives = paid || entityId == null
                        ? null
                        : jarOptions
                            .Where(jar => jar.Id != jarId)
                            .Select(jar => new JarOption(
                                jar.Id,
                                jar.JarName,
                                remainingByJar.TryGetValue(jar.Id, out var remaining) ? remaining : null))
                            .ToList();
                    items.Add(new AlertItem(
                        n.Id, KindOf(n.Type), name, n.Message,
                        paid ? "auto-paid" : "auto-failed", 0,
                        amount, dueDate?.ToString("yyyy-MM-dd"), JarNameOf(jarId),
                        reason, entityId, canConfirmPayment, alternatives));
                }

                foreach (var (notif, c) in pairs)
                {
                    items.Add(new AlertItem(
                        notif.Id, c.Kind, c.Name, c.Message,
                        c.IsOverdue ? "overdue" : "due-soon", c.Days,
                        c.Amount, c.DueDate?.ToString("yyyy-MM-dd"), JarNameOf(c.JarId), null,
                        c.EntityId, false, null));
                }

                var result = items
                    .OrderBy(i => i.Days)
                    .Select(i => new
                    {
                        notificationId = i.NotificationId,
                        kind = i.Kind,
                        name = i.Name,
                        message = i.Message,
                        status = i.Status,
                        daysUntilDue = i.Days,
                        amount = i.Amount,
                        dueDate = i.DueDate,
                        jarName = i.JarName,
                        reason = i.Reason,
                        entityId = i.EntityId,
                        canConfirmPayment = i.CanConfirmPayment,
                        alternativeJars = i.AlternativeJars
                    });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Loading due alerts failed for user {UserId}", userId);
                var message = _env.IsDevelopment()
                    ? $"Unable to load notifications ({ex.InnerException?.Message ?? ex.Message})"
                    : "Unable to load notifications.";
                return StatusCode(500, new { message });
            }
        }

        // POST: api/DueAlerts/mark-read with notification IDs in the request body.
        // Only update notifications belonging to the authenticated user.
        [HttpPost("mark-read")]
        public async Task<IActionResult> MarkRead([FromBody] DueAlertMarkReadRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            if (request.Ids == null || request.Ids.Count == 0)
                return Ok(new { updated = 0 });

            var notifs = await _context.Notifications
                .Where(n => n.UserId == currentUserId.Value && request.Ids.Contains(n.Id))
                .ToListAsync();

            foreach (var n in notifs) n.IsRead = true;

            await _context.SaveChangesAsync();
            return Ok(new { updated = notifs.Count });
        }

        [HttpPost("confirm-payment")]
        public async Task<IActionResult> ConfirmPayment([FromBody] ConfirmPaymentRequest request)
        {
            var currentUserId = GetCurrentUserId();
            if (currentUserId == null) return Unauthorized();

            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(
                currentUserId.Value, async () =>
            {
                var userId = currentUserId.Value;
                var notification = await _context.Notifications.FirstOrDefaultAsync(n =>
                    n.Id == request.NotificationId
                    && n.UserId == userId
                    && (n.Type == DebtType || n.Type == GoalType)
                    && n.Title.StartsWith(AutoPayHelper.FailedPrefix));
                if (notification == null)
                    return NotFound(new { message = "This payment request is no longer available." });

                var (kind, entityId) = AutoPayHelper.ParseEntityTitleId(notification.Title);
                if (entityId == null)
                    return BadRequest(new { message = "This payment request cannot be matched to an account." });

                Goal? goal = null;
                Debt? debt = null;
                GoalPaymentSchedule? schedule = null;
                Notification? scheduleRecord = null;
                DateOnly? scheduledPaymentDate = null;
                decimal amount;

                if (kind == "Debt")
                {
                    debt = await _context.Debts.FirstOrDefaultAsync(item =>
                        item.Id == entityId.Value && item.UserId == userId);
                    if (debt == null) return NotFound(new { message = "The debt was not found." });

                    amount = debt.RemainingAmount ?? 0;
                    if (amount <= 0)
                        return BadRequest(new { message = "This debt has already been paid off." });
                }
                else
                {
                    goal = await _context.Goals.FirstOrDefaultAsync(item =>
                        item.Id == entityId.Value && item.UserId == userId);
                    if (goal == null) return NotFound(new { message = "The goal was not found." });
                    if (string.Equals(goal.Status, "completed", StringComparison.OrdinalIgnoreCase))
                        return BadRequest(new { message = "This goal is already complete." });

                    scheduleRecord = await _context.Notifications.FirstOrDefaultAsync(item =>
                        item.UserId == userId
                        && item.Type == "GOAL_SCHEDULE"
                        && item.Title == $"GoalSchedule:{goal.Id}");
                    schedule = scheduleRecord == null
                        ? null
                        : GoalPaymentSchedule.Parse(scheduleRecord.Message);
                    scheduledPaymentDate = schedule?.PendingPaymentDate ?? schedule?.NextPaymentDate;

                    var remaining = (goal.TargetAmount ?? 0) - (goal.CurrentAmount ?? 0);
                    amount = schedule != null
                        ? Math.Min(schedule.Amount, remaining)
                        : remaining;
                    if (amount <= 0)
                        return BadRequest(new { message = "This goal is already fully funded." });
                }

                var originalJarId = schedule?.JarId ?? debt?.JarId ?? goal?.JarId;
                if (request.JarId <= 0 || request.JarId == originalJarId)
                    return BadRequest(new { message = "Select a different source jar to confirm the payment." });

                var plan = await JarFundingHelper.PrepareChargeAsync(
                    _context,
                    userId,
                    request.JarId,
                    amount,
                    debt != null
                        ? $"Confirmed automatic debt payment: {debt.DebtName}"
                        : $"Confirmed scheduled goal payment: {goal!.GoalName}",
                    transaction =>
                    {
                        if (debt != null) transaction.DebtId = debt.Id;
                        else transaction.GoalId = goal!.Id;
                    });
                if (plan.Error != null)
                    return BadRequest(new { message = plan.Error });

                _context.Transactions.Add(plan.Tx!);
                if (debt != null)
                {
                    debt.RemainingAmount = (debt.RemainingAmount ?? 0) - amount;
                    debt.JarId = request.JarId;
                }
                else
                {
                    goal!.CurrentAmount = (goal.CurrentAmount ?? 0) + amount;
                    goal.JarId = request.JarId;
                    if (goal.CurrentAmount >= goal.TargetAmount)
                        goal.Status = "completed";

                    if (schedule != null && scheduledPaymentDate is DateOnly paymentDate
                        && scheduleRecord != null)
                    {
                        schedule.PendingPaymentDate = null;
                        schedule.JarId = request.JarId;
                        if (goal.Status == "completed")
                        {
                            schedule.Enabled = false;
                            schedule.NextPaymentDate = null;
                        }
                        else
                        {
                            var next = GoalPaymentSchedule.GetNextDate(schedule, paymentDate);
                            var today = DateOnly.FromDateTime(DateTime.Today);
                            while (next != null && next <= today)
                                next = GoalPaymentSchedule.GetNextDate(schedule, next.Value);
                            schedule.NextPaymentDate = next;
                            schedule.Enabled = next != null;
                        }
                        scheduleRecord.Message = schedule.Serialize();
                    }
                }

                var failedTitle = AutoPayHelper.FailedPrefix
                    + AutoPayHelper.EntityTitleId(notification.Type, entityId.Value);
                var relatedFailures = await _context.Notifications
                    .Where(item => item.UserId == userId
                        && item.Type == notification.Type
                        && item.Title == failedTitle)
                    .ToListAsync();
                _context.Notifications.RemoveRange(relatedFailures);
                _context.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = AutoPayHelper.PaidPrefix
                        + AutoPayHelper.EntityTitleId(notification.Type, entityId.Value),
                    Message = $"Confirmed payment of {amount:N2} from the selected source jar.",
                    Type = notification.Type,
                    IsRead = false,
                    CreatedAt = DateTime.Now
                });

                await _context.SaveChangesAsync();
                return Ok(new { paid = amount, transactionId = plan.Tx!.Id });
            });
        }
    }
}