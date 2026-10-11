using System.Text.Json;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.DTOs;

public sealed class GoalPaymentSchedule
{
    public int JarId { get; set; }
    public decimal Amount { get; set; }
    public DateOnly StartDate { get; set; }
    public DateOnly? NextPaymentDate { get; set; }
    public DateOnly? PendingPaymentDate { get; set; }
    public int AnchorDay { get; set; }
    public string Cycle { get; set; } = "once";
    public bool Enabled { get; set; } = true;

    public static readonly string[] SupportedCycles = ["once", "daily", "weekly", "monthly"];

    public static GoalPaymentSchedule? Parse(string value)
    {
        try
        {
            return JsonSerializer.Deserialize<GoalPaymentSchedule>(value);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    public string Serialize() => JsonSerializer.Serialize(this);

    public static Notification CreateRecord(int userId, int goalId, GoalPaymentSchedule schedule) =>
        new()
        {
            UserId = userId,
            Type = "GOAL_SCHEDULE",
            Title = $"GoalSchedule:{goalId}",
            Message = schedule.Serialize(),
            IsRead = true,
            CreatedAt = DateTime.Now
        };

    public static DateOnly? GetNextDate(GoalPaymentSchedule schedule, DateOnly currentDate)
    {
        if (schedule.Cycle == "daily")
            return currentDate.AddDays(1);
        if (schedule.Cycle == "weekly")
            return currentDate.AddDays(7);
        if (schedule.Cycle != "monthly")
            return null;

        var nextMonth = new DateOnly(currentDate.Year, currentDate.Month, 1).AddMonths(1);
        var day = Math.Min(
            schedule.AnchorDay,
            DateTime.DaysInMonth(nextMonth.Year, nextMonth.Month));
        return nextMonth.AddDays(day - 1);
    }
}

public sealed class GoalUpsertRequest
{
    public string? GoalName { get; set; }
    public decimal? TargetAmount { get; set; }
    public DateOnly? Deadline { get; set; }
    public bool AutoPayEnabled { get; set; }
    public int? AutoPayJarId { get; set; }
    public decimal? AutoPayAmount { get; set; }
    public DateOnly? AutoPayStartDate { get; set; }
    public string? AutoPayCycle { get; set; }
}
