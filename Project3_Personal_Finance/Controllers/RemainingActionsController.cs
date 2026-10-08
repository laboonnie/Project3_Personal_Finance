using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;

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
            var userIdString =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userIdString))
                throw new UnauthorizedAccessException(
                    "User not authenticated"
                );

            return int.Parse(userIdString);
        }
        private static (int Month, int Year) GetPreviousMonth(
            int month,
            int year)
        {
            if (month == 1)
            {
                return (12, year - 1);
            }

            return (month - 1, year);
        }

        // =====================================================
        // GET SUMMARY
        // GET /api/RemainingActions/summary?month=10&year=2026
        // =====================================================
        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary(
            [FromQuery] int month,
            [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (month < 1 || month > 12)
                {
                    return BadRequest(new
                    {
                        message = "Invalid month."
                    });
                }

                if (year < 2000 || year > 2100)
                {
                    return BadRequest(new
                    {
                        message = "Invalid year."
                    });
                }

                var totalIncome = await _context.Transactions
                    .Where(t =>
                        t.UserId == userId &&
                        t.Type == "Income" &&
                        t.TransactionDate.Month == month &&
                        t.TransactionDate.Year == year)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0;

                var totalExpense = await _context.Transactions
                    .Where(t =>
                        t.UserId == userId &&
                        t.Type == "Expense" &&
                        t.TransactionDate.Month == month &&
                        t.TransactionDate.Year == year)
                    .SumAsync(t => (decimal?)t.Amount) ?? 0;

                var monthlyRemaining =
                    totalIncome - totalExpense;
                var previous =
                    GetPreviousMonth(month, year);

                var carriedIn =
                    await _context.RemainingActions
                        .Where(r =>
                            r.UserId == userId &&
                            r.Month == previous.Month &&
                            r.Year == previous.Year &&
                            r.ActionType == "CARRY_OVER")
                        .SumAsync(r =>
                            (decimal?)r.Amount) ?? 0;

                var processedAmount =
                    await _context.RemainingActions
                        .Where(r =>
                            r.UserId == userId &&
                            r.Month == month &&
                            r.Year == year)
                        .SumAsync(r => (decimal?)r.Amount) ?? 0;

                var totalAvailableBeforeProcessing =
                    monthlyRemaining + carriedIn;

                var availableRemaining =
                    Math.Max(
                        totalAvailableBeforeProcessing -
                        processedAmount,
                        0
                    );

                return Ok(new
                {
                    month,
                    year,

                    totalIncome,
                    totalExpense,

                    monthlyRemaining,

                    carriedIn,

                    totalAvailableBeforeProcessing,

                    processedAmount,

                    availableRemaining,

                    hasRemaining =
                        availableRemaining > 0
                });
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new
                {
                    message = "User not authenticated."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

        // =====================================================
        // GET ACTION HISTORY
        // GET /api/RemainingActions?month=10&year=2026
        // =====================================================
        [HttpGet]
        public async Task<IActionResult> GetActions(
            [FromQuery] int month,
            [FromQuery] int year)
        {
            try
            {
                var userId = GetCurrentUserId();

                if (month < 1 || month > 12)
                {
                    return BadRequest(new
                    {
                        message = "Invalid month."
                    });
                }

                var actions = await _context.RemainingActions
                    .Where(r =>
                        r.UserId == userId &&
                        r.Month == month &&
                        r.Year == year)
                    .OrderByDescending(r => r.CreatedAt)
                    .Select(r => new
                    {
                        r.Id,
                        r.Month,
                        r.Year,
                        r.Amount,
                        r.ActionType,
                        r.TargetJarId,
                        TargetJarName = r.TargetJar != null
                            ? r.TargetJar.JarName
                            : null,

                        r.GoalId,
                        GoalName = r.Goal != null
                            ? r.Goal.GoalName
                            : null,

                        r.DebtId,
                        DebtName = r.Debt != null
                            ? r.Debt.DebtName
                            : null,

                        r.InvestmentId,
                        InvestmentName = r.Investment != null
                            ? r.Investment.AssetName
                            : null,

                        r.CreatedAt
                    })
                    .ToListAsync();

                return Ok(actions);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

        // =====================================================
        // POST ACTION
        // POST /api/RemainingActions
        // =====================================================
        [HttpPost]
        public async Task<IActionResult> CreateAction(
            [FromBody] RemainingActionRequest request)
        {
            try
            {
                var userId = GetCurrentUserId();

                // -------------------------
                // Basic validation
                // -------------------------

                if (request.Month < 1 || request.Month > 12)
                {
                    return BadRequest(new
                    {
                        message = "Invalid month."
                    });
                }

                if (request.Year < 2000 || request.Year > 2100)
                {
                    return BadRequest(new
                    {
                        message = "Invalid year."
                    });
                }

                if (request.Amount <= 0)
                {
                    return BadRequest(new
                    {
                        message =
                            "Amount must be greater than 0."
                    });
                }

                if (string.IsNullOrWhiteSpace(
                    request.ActionType))
                {
                    return BadRequest(new
                    {
                        message =
                            "Please select an action."
                    });
                }

                var actionType =
                    request.ActionType
                        .Trim()
                        .ToUpperInvariant();

                var allowedActions = new[]
                {
                    "CARRY_OVER",
                    "JAR",
                    "GOAL",
                    "DEBT",
                    "INVESTMENT",
                    "KEEP"
                };

                if (!allowedActions.Contains(actionType))
                {
                    return BadRequest(new
                    {
                        message = "Invalid action type."
                    });
                }

                // -------------------------
                // Calculate actual balance
                // -------------------------

                var totalIncome =
                    await _context.Transactions
                        .Where(t =>
                            t.UserId == userId &&
                            t.Type == "Income" &&
                            t.TransactionDate.Month ==
                                request.Month &&
                            t.TransactionDate.Year ==
                                request.Year)
                        .SumAsync(t =>
                            (decimal?)t.Amount) ?? 0;

                var totalExpense =
                    await _context.Transactions
                        .Where(t =>
                            t.UserId == userId &&
                            t.Type == "Expense" &&
                            t.TransactionDate.Month ==
                                request.Month &&
                            t.TransactionDate.Year ==
                                request.Year)
                        .SumAsync(t =>
                            (decimal?)t.Amount) ?? 0;

                var monthlyRemaining =
                    totalIncome - totalExpense;

                var previous =
                    GetPreviousMonth(
                        request.Month,
                        request.Year
                    );

                var carriedIn =
                    await _context.RemainingActions
                        .Where(r =>
                            r.UserId == userId &&
                            r.Month == previous.Month &&
                            r.Year == previous.Year &&
                            r.ActionType == "CARRY_OVER")
                        .SumAsync(r =>
                            (decimal?)r.Amount) ?? 0;

                var totalAvailableBeforeProcessing =
                    monthlyRemaining + carriedIn;



                var processedAmount =
                    await _context.RemainingActions
                        .Where(r =>
                            r.UserId == userId &&
                            r.Month == request.Month &&
                            r.Year == request.Year)
                        .SumAsync(r =>
                            (decimal?)r.Amount) ?? 0;

                var availableRemaining =
                    totalAvailableBeforeProcessing -
                    processedAmount;

                if (availableRemaining <= 0)
                {
                    return BadRequest(new
                    {
                        message =
                            "There is no remaining money to manage."
                    });
                }

                if (request.Amount > availableRemaining)
                {
                    return BadRequest(new
                    {
                        message =
                            $"Amount cannot exceed available remaining money ({availableRemaining:N0} VND)."
                    });
                }

                // -------------------------
                // Validate target
                // -------------------------

                FinancialJar? targetJar = null;
                Goal? goal = null;
                Debt? debt = null;
                Investment? investment = null;

                if (actionType == "JAR")
                {
                    if (!request.TargetJarId.HasValue)
                    {
                        return BadRequest(new
                        {
                            message =
                                "Please select a jar."
                        });
                    }

                    targetJar =
                        await _context.FinancialJars
                            .FirstOrDefaultAsync(j =>
                                j.Id ==
                                request.TargetJarId.Value);

                    if (targetJar == null)
                    {
                        return BadRequest(new
                        {
                            message = "Jar not found."
                        });
                    }
                }

                if (actionType == "GOAL")
                {
                    if (!request.GoalId.HasValue)
                    {
                        return BadRequest(new
                        {
                            message =
                                "Please select a goal."
                        });
                    }

                    goal = await _context.Goals
                        .FirstOrDefaultAsync(g =>
                            g.Id == request.GoalId.Value &&
                            g.UserId == userId);

                    if (goal == null)
                    {
                        return BadRequest(new
                        {
                            message = "Goal not found."
                        });
                    }

                    var goalRemaining =
                        goal.TargetAmount -
                        goal.CurrentAmount;

                    if (goalRemaining <= 0)
                    {
                        return BadRequest(new
                        {
                            message =
                                "This goal has already been completed."
                        });
                    }

                    if (request.Amount > goalRemaining)
                    {
                        return BadRequest(new
                        {
                            message =
                                $"Amount exceeds the remaining goal amount ({goalRemaining:N0} VND)."
                        });
                    }
                }

                if (actionType == "DEBT")
                {
                    if (!request.DebtId.HasValue)
                    {
                        return BadRequest(new
                        {
                            message =
                                "Please select a debt."
                        });
                    }

                    debt = await _context.Debts
                        .FirstOrDefaultAsync(d =>
                            d.Id == request.DebtId.Value &&
                            d.UserId == userId);

                    if (debt == null)
                    {
                        return BadRequest(new
                        {
                            message = "Debt not found."
                        });
                    }

                    if (debt.RemainingAmount <= 0)
                    {
                        return BadRequest(new
                        {
                            message =
                                "This debt has already been paid."
                        });
                    }

                    if (request.Amount >
                        debt.RemainingAmount)
                    {
                        return BadRequest(new
                        {
                            message =
                                $"Amount exceeds the remaining debt ({debt.RemainingAmount:N0} VND)."
                        });
                    }
                }

                if (actionType == "INVESTMENT")
                {
                    if (!request.InvestmentId.HasValue)
                    {
                        return BadRequest(new
                        {
                            message =
                                "Please select an investment."
                        });
                    }

                    investment =
                        await _context.Investments
                            .FirstOrDefaultAsync(i =>
                                i.Id ==
                                    request.InvestmentId.Value &&
                                i.UserId == userId);

                    if (investment == null)
                    {
                        return BadRequest(new
                        {
                            message =
                                "Investment not found."
                        });
                    }
                }

                // -------------------------
                // Database transaction
                // -------------------------

                await using var dbTransaction =
                    await _context.Database
                        .BeginTransactionAsync();

                try
                {
                    var action = new RemainingAction
                    {
                        UserId = userId,
                        Month = request.Month,
                        Year = request.Year,
                        Amount = request.Amount,
                        ActionType = actionType,

                        TargetJarId =
                            actionType == "JAR"
                                ? request.TargetJarId
                                : null,

                        GoalId =
                            actionType == "GOAL"
                                ? request.GoalId
                                : null,

                        DebtId =
                            actionType == "DEBT"
                                ? request.DebtId
                                : null,

                        InvestmentId =
                            actionType == "INVESTMENT"
                                ? request.InvestmentId
                                : null,

                        CreatedAt = DateTime.Now
                    };

                    _context.RemainingActions.Add(action);

                    // Goal receives money
                    if (actionType == "GOAL" &&
                        goal != null)
                    {
                        goal.CurrentAmount +=
                            request.Amount;

                        if (goal.CurrentAmount >=
                            goal.TargetAmount)
                        {
                            goal.CurrentAmount =
                                goal.TargetAmount;

                            goal.Status = "Completed";
                        }
                    }

                    // Debt is reduced
                    if (actionType == "DEBT" &&
                        debt != null)
                    {
                        debt.RemainingAmount -=
                            request.Amount;

                        if (debt.RemainingAmount < 0)
                        {
                            debt.RemainingAmount = 0;
                        }
                    }

                    // Existing investment receives more capital
                    if (actionType == "INVESTMENT" &&
                        investment != null)
                    {
                        investment.AmountInvested +=
                            request.Amount;
                    }

                    var notification =
                        new Notification
                        {
                            UserId = userId,
                            Title =
                                "Remaining money managed",
                            Message =
                                $"{request.Amount:N0} VND was allocated to {GetActionDisplayName(actionType)}.",
                            Type =
                                "REMAINING_MANAGED",
                            IsRead = false,
                            CreatedAt = DateTime.Now
                        };

                    _context.Notifications
                        .Add(notification);

                    await _context.SaveChangesAsync();

                    await dbTransaction.CommitAsync();

                    var newProcessedAmount =
                        processedAmount +
                        request.Amount;

                    var newAvailableRemaining =
                        Math.Max(
                            monthlyRemaining -
                            newProcessedAmount,
                            0);

                    return Ok(new
                    {
                        message =
                            "Remaining money managed successfully.",
                        actionId = action.Id,
                        actionType,
                        amount = action.Amount,
                        monthlyRemaining,
                        processedAmount =
                            newProcessedAmount,
                        availableRemaining =
                            newAvailableRemaining
                    });
                }
                catch
                {
                    await dbTransaction.RollbackAsync();
                    throw;
                }
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new
                {
                    message =
                        "User not authenticated."
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new
                {
                    message = ex.Message
                });
            }
        }

        private static string GetActionDisplayName(
            string actionType)
        {
            return actionType switch
            {
                "CARRY_OVER" =>
                    "next month",

                "JAR" =>
                    "a financial jar",

                "GOAL" =>
                    "a financial goal",

                "DEBT" =>
                    "debt payment",

                "INVESTMENT" =>
                    "an investment",

                "KEEP" =>
                    "cash reserve",

                _ =>
                    "remaining balance"
            };
        }
    }

    // =========================================================
    // REQUEST MODEL
    // =========================================================
    public class RemainingActionRequest
    {
        public int Month { get; set; }

        public int Year { get; set; }

        public decimal Amount { get; set; }

        public string ActionType { get; set; }
            = string.Empty;

        public int? TargetJarId { get; set; }

        public int? GoalId { get; set; }

        public int? DebtId { get; set; }

        public int? InvestmentId { get; set; }
    }
}