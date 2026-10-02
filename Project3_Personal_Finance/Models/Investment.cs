using System;
using System.Collections.Generic;

namespace Project3_Personal_Finance.Models;

public partial class Investment
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string? AssetName { get; set; }

    public string? AssetType { get; set; }

    public decimal? AmountInvested { get; set; }

    public decimal? CurrentValue { get; set; }

    public DateOnly? InvestDate { get; set; }
    public int? JarId { get; set; }

    public virtual User User { get; set; } = null!;
    public virtual FinancialJar? Jar { get; set; }

    public virtual ICollection<Transaction> Transactions { get; set; } = new List<Transaction>();
}
