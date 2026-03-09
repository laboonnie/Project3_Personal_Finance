using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class FinancialJar
{
    public int Id { get; set; }

    public string JarName { get; set; } = null!;

    public string JarCode { get; set; } = null!;

    public int DefaultPercentage { get; set; }

    public virtual ICollection<Budget> Budgets { get; set; } = new List<Budget>();

    public virtual ICollection<Category> Categories { get; set; } = new List<Category>();
}
