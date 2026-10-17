using Project3_Personal_Finance.DTOs;
using Xunit;

namespace Project3_Personal_Finance.Tests;

public sealed class GoalPaymentScheduleTests
{
    [Theory]
    [InlineData("GoalSchedule:42", 42)]
    [InlineData("GoalSchedule:invalid", null)]
    [InlineData("DebtSchedule:42", null)]
    [InlineData(null, null)]
    public void ParseGoalId_RecognizesOnlyGoalScheduleTitles(string? title, int? expectedId)
    {
        Assert.Equal(expectedId, GoalPaymentSchedule.ParseGoalId(title));
    }

    [Fact]
    public void GetNextPaymentDate_SkipsOccurrencesThroughToday()
    {
        var schedule = new GoalPaymentSchedule
        {
            Cycle = "weekly"
        };

        var next = GoalPaymentSchedule.GetNextPaymentDate(
            schedule,
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 15));

        Assert.Equal(new DateOnly(2026, 10, 22), next);
    }

    [Fact]
    public void GetNextPaymentDate_ReturnsNullForOneTimeSchedule()
    {
        var schedule = new GoalPaymentSchedule
        {
            Cycle = "once"
        };

        var next = GoalPaymentSchedule.GetNextPaymentDate(
            schedule,
            new DateOnly(2026, 10, 1),
            new DateOnly(2026, 10, 1));

        Assert.Null(next);
    }
}
