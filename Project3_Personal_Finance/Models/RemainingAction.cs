using System;

namespace Project3_Personal_Finance.Models;

public partial class RemainingAction
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int Month { get; set; }

    public int Year { get; set; }

    public decimal Amount { get; set; }

    public string ActionType { get; set; } = null!;

    public int? TargetJarId { get; set; }

    public int? GoalId { get; set; }

    public int? DebtId { get; set; }

    public int? InvestmentId { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual User User { get; set; } = null!;

    public virtual FinancialJar? TargetJar { get; set; }

    public virtual Goal? Goal { get; set; }

    public virtual Debt? Debt { get; set; }

    public virtual Investment? Investment { get; set; }
}