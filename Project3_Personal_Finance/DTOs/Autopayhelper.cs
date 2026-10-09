using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Collections.Concurrent;

namespace Project3_Personal_Finance.DTOs;

public static class AutoPayHelper
{
    public const string DebtType = "DEBT_DUE";
    public const string GoalType = "GOAL_DUE";
    public const string PaidPrefix = "Auto-paid: ";
    public const string FailedPrefix = "Auto-pay failed: ";
    private const string GoalScheduleType = "GOAL_SCHEDULE";
    private static readonly ConcurrentDictionary<int, SemaphoreSlim> UserLocks = new();

    public static async Task RunForUserAsync(PersonalFinanceDbContext context, int userId)
    {
        await WithPaymentLockAsync(userId, async () =>
        {
            var today = DateOnly.FromDateTime(DateTime.Today);
            await ProcessDebtsAsync(context, userId, today);
            await ProcessGoalsAsync(context, userId, today);
            await ProcessSchedulesAsync(context, userId, today);
            return true;
        });
    }

    public static async Task<T> WithPaymentLockAsync<T>(int userId, Func<Task<T>> action)
    {
        var paymentLock = UserLocks.GetOrAdd(userId, _ => new SemaphoreSlim(1, 1));
        await paymentLock.WaitAsync();
        try
        {
            return await action();
        }
        finally
        {
            paymentLock.Release();
        }
    }

    private static async Task ProcessDebtsAsync(
        PersonalFinanceDbContext context,
        int userId,
        DateOnly today)
    {
        var debts = await context.Debts
            .Where(debt => debt.UserId == userId
                && debt.DueDate == today
                && (debt.RemainingAmount ?? 0) > 0)
            .ToListAsync();

        foreach (var debt in debts)
        {
            await TryPayAsync(
                context,
                userId,
                DebtType,
                debt.Id,
                debt.DebtName ?? "Debt",
                debt.RemainingAmount ?? 0,
                debt.JarId,
                $"Automatic debt payment: {debt.DebtName}",
                transaction => transaction.DebtId = debt.Id,
                () => debt.RemainingAmount = 0,
                null,
                today);
        }
    }

    private static async Task ProcessGoalsAsync(
        PersonalFinanceDbContext context,
        int userId,
        DateOnly today)
    {
        var scheduleTitles = await context.Notifications.AsNoTracking()
            .Where(notification => notification.UserId == userId
                && notification.Type == GoalScheduleType)
            .Select(notification => notification.Title)
            .ToListAsync();
        var scheduledGoalIds = scheduleTitles
            .Select(ParseScheduleGoalId)
            .Where(id => id.HasValue)
            .Select(id => id!.Value)
            .ToHashSet();

        var goals = (await context.Goals
                .Where(goal => goal.UserId == userId
                    && goal.Deadline == today
                    && (goal.TargetAmount ?? 0) > (goal.CurrentAmount ?? 0)
                    && !scheduledGoalIds.Contains(goal.Id))
                .ToListAsync())
            .Where(goal => !string.Equals(
                goal.Status, "completed", StringComparison.OrdinalIgnoreCase))
            .ToList();

        foreach (var goal in goals)
        {
            var amount = (goal.TargetAmount ?? 0) - (goal.CurrentAmount ?? 0);
            await TryPayAsync(
                context,
                userId,
                GoalType,
                goal.Id,
                goal.GoalName ?? "Goal",
                amount,
                goal.JarId,
                $"Automatic goal payment: {goal.GoalName}",
                transaction => transaction.GoalId = goal.Id,
                () =>
                {
                    goal.CurrentAmount = goal.TargetAmount;
                    goal.Status = "completed";
                },
                null,
                today);
        }
    }

    private static async Task ProcessSchedulesAsync(
        PersonalFinanceDbContext context,
        int userId,
        DateOnly today)
    {
        var records = await context.Notifications
            .Where(notification => notification.UserId == userId
                && notification.Type == GoalScheduleType)
            .ToListAsync();

        foreach (var record in records)
        {
            var goalId = ParseScheduleGoalId(record.Title);
            var schedule = GoalPaymentSchedule.Parse(record.Message);
            if (goalId == null || schedule is not { Enabled: true }
                || schedule.NextPaymentDate == null
                || schedule.PendingPaymentDate != null
                || schedule.NextPaymentDate > today)
                continue;

            var goal = await context.Goals.FirstOrDefaultAsync(candidate =>
                candidate.Id == goalId.Value && candidate.UserId == userId);
            if (goal == null || string.Equals(goal.Status, "completed", StringComparison.OrdinalIgnoreCase))
            {
                schedule.Enabled = false;
                schedule.NextPaymentDate = null;
                record.Message = schedule.Serialize();
                await context.SaveChangesAsync();
                continue;
            }

            var remaining = (goal.TargetAmount ?? 0) - (goal.CurrentAmount ?? 0);
            if (remaining <= 0)
            {
                goal.Status = "completed";
                schedule.Enabled = false;
                schedule.NextPaymentDate = null;
                record.Message = schedule.Serialize();
                await context.SaveChangesAsync();
                continue;
            }

            var paymentDate = schedule.NextPaymentDate.Value;
            var amount = Math.Min(schedule.Amount, remaining);
            await TryPayAsync(
                context,
                userId,
                GoalType,
                goal.Id,
                goal.GoalName ?? "Goal",
                amount,
                schedule.JarId,
                $"Scheduled goal payment: {goal.GoalName}",
                transaction => transaction.GoalId = goal.Id,
                () =>
                {
                    goal.CurrentAmount = (goal.CurrentAmount ?? 0) + amount;
                    if (goal.CurrentAmount >= goal.TargetAmount)
                    {
                        goal.Status = "completed";
                        schedule.Enabled = false;
                        schedule.NextPaymentDate = null;
                    }
                },
                schedule,
                paymentDate);
        }
    }

    private static async Task TryPayAsync(
        PersonalFinanceDbContext context,
        int userId,
        string type,
        int entityId,
        string name,
        decimal amount,
        int? jarId,
        string note,
        Action<Transaction> link,
        Action apply,
        GoalPaymentSchedule? schedule,
        DateOnly paymentDate)
    {
        var titleId = EntityTitleId(type, entityId);
        var paidTitle = PaidPrefix + titleId;
        var failedTitle = FailedPrefix + titleId;
        var dayStart = paymentDate.ToDateTime(TimeOnly.MinValue);
        var alreadyPaid = await context.Notifications.AnyAsync(notification =>
            notification.UserId == userId
            && notification.Type == type
            && notification.Title == paidTitle
            && notification.CreatedAt >= dayStart
            && notification.CreatedAt < dayStart.AddDays(1));
        if (alreadyPaid)
            return;

        var alreadyFailed = await context.Notifications.AnyAsync(notification =>
            notification.UserId == userId
            && notification.Type == type
            && notification.Title == failedTitle
            && notification.CreatedAt >= dayStart
            && notification.CreatedAt < dayStart.AddDays(1));
        if (alreadyFailed)
            return;

        ChargePlan? plan = null;
        string? failureReason = null;
        if (jarId is not > 0)
        {
            failureReason = "No source jar is selected.";
        }
        else
        {
            plan = await JarFundingHelper.PrepareChargeAsync(
                context, userId, jarId.Value, amount, note, link);
            failureReason = plan.Error;
        }

        if (failureReason != null)
        {
            if (schedule != null)
            {
                schedule.PendingPaymentDate = paymentDate;
                var scheduleRecord = await context.Notifications.FirstAsync(notification =>
                    notification.UserId == userId
                    && notification.Type == GoalScheduleType
                    && notification.Title == $"GoalSchedule:{entityId}");
                scheduleRecord.Message = schedule.Serialize();
            }

            var failed = await context.Notifications.FirstOrDefaultAsync(notification =>
                notification.UserId == userId
                && notification.Type == type
                && notification.Title == failedTitle
                && notification.CreatedAt >= dayStart
                && notification.CreatedAt < dayStart.AddDays(1));
            if (failed == null)
            {
                context.Notifications.Add(new Notification
                {
                    UserId = userId,
                    Title = failedTitle,
                    Message = $"Could not automatically charge {amount:N2}: {failureReason}",
                    Type = type,
                    IsRead = false,
                    CreatedAt = DateTime.Now
                });
            }
            else
            {
                failed.Message = $"Could not automatically charge {amount:N2}: {failureReason}";
                failed.IsRead = false;
            }

            await context.SaveChangesAsync();
            return;
        }

        context.Transactions.Add(plan!.Tx!);
        apply();

        if (schedule != null && schedule.PendingPaymentDate == null)
        {
            var next = GoalPaymentSchedule.GetNextDate(schedule, paymentDate);
            while (next != null && next <= DateOnly.FromDateTime(DateTime.Today))
                next = GoalPaymentSchedule.GetNextDate(schedule, next.Value);
            schedule.NextPaymentDate = next;
            schedule.Enabled = next != null;

            var scheduleRecord = await context.Notifications.FirstAsync(notification =>
                notification.UserId == userId
                && notification.Type == GoalScheduleType
                && notification.Title == $"GoalSchedule:{entityId}");
            scheduleRecord.Message = schedule.Serialize();
        }

        var oldFailures = await context.Notifications
            .Where(notification => notification.UserId == userId
                && notification.Type == type
                && notification.Title == failedTitle)
            .ToListAsync();
        context.Notifications.RemoveRange(oldFailures);
        context.Notifications.Add(new Notification
        {
            UserId = userId,
            Title = paidTitle,
            Message = $"Automatically paid {amount:N2} from {name}.",
            Type = type,
            IsRead = false,
            CreatedAt = DateTime.Now
        });

        await context.SaveChangesAsync();
    }

    public static string EntityTitleId(string type, int id) =>
        $"{(type == DebtType ? "D" : "G")}:{id}";

    public static (string Kind, int? Id) ParseEntityTitleId(string title)
    {
        var token = title.StartsWith(PaidPrefix, StringComparison.Ordinal)
            ? title[PaidPrefix.Length..]
            : title.StartsWith(FailedPrefix, StringComparison.Ordinal)
                ? title[FailedPrefix.Length..]
                : string.Empty;
        var separator = token.IndexOf(':');
        if (separator < 0 || !int.TryParse(token[(separator + 1)..], out var id))
            return (string.Empty, null);
        return (token[..separator] == "D" ? "Debt" : "Goal", id);
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
