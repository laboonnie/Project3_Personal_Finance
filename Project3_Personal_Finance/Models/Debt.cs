using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class Debt
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? DebtName { get; set; }

    public decimal? TotalAmount { get; set; }

    public decimal? RemainingAmount { get; set; }

    public decimal? InterestRate { get; set; }

    public DateOnly? DueDate { get; set; }

    //public string? Status { get; set; } = "active";

    public virtual User? User { get; set; } = null!;
}
