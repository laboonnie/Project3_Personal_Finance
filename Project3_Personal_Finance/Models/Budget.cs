using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class Budget
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int JarId { get; set; }

    public decimal BudgetAmount { get; set; }

    public int Month { get; set; }

    public int Year { get; set; }

    public virtual FinancialJar Jar { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}
