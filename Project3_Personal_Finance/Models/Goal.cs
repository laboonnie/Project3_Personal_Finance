using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class Goal
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? GoalName { get; set; }

    public decimal? TargetAmount { get; set; }

    public decimal? CurrentAmount { get; set; } = 0;

    public DateOnly? Deadline { get; set; }

    public string? Status { get; set; } = "in-progress";

    public virtual User? User { get; set; } = null!;
}
