using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.DTOs;

public sealed class GoalPaymentScheduler : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<GoalPaymentScheduler> _logger;

    public GoalPaymentScheduler(
        IServiceScopeFactory scopeFactory,
        ILogger<GoalPaymentScheduler> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            await ProcessDuePaymentsAsync(stoppingToken);
            await Task.Delay(TimeSpan.FromMinutes(1), stoppingToken);
        }
    }

    private async Task ProcessDuePaymentsAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var context = scope.ServiceProvider.GetRequiredService<PersonalFinanceDbContext>();
            var userIds = await context.Goals.AsNoTracking()
                .Select(goal => goal.UserId)
                .Union(context.Debts.AsNoTracking().Select(debt => debt.UserId))
                .Distinct()
                .ToListAsync(cancellationToken);

            foreach (var userId in userIds)
            {
                cancellationToken.ThrowIfCancellationRequested();
                try
                {
                    await AutoPayHelper.RunForUserAsync(context, userId);
                    context.ChangeTracker.Clear();
                }
                catch (Exception exception)
                {
                    context.ChangeTracker.Clear();
                    _logger.LogError(
                        exception,
                        "Scheduled goal payments failed for user {UserId}",
                        userId);
                }
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "The payment scheduler failed.");
        }
    }
}
