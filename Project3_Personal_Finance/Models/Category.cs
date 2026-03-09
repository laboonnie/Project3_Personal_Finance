using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class Category
{
    public int Id { get; set; }

    public string Name { get; set; } = null!;

    public string Type { get; set; } = null!;

    public int JarId { get; set; }

    public virtual FinancialJar Jar { get; set; } = null!;

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
