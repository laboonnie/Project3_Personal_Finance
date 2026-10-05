using System;
using System.Text.Json.Serialization;

namespace Project3_Personal_Finance.Models;

public partial class BudgetCarriedOver
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int JarId { get; set; }

    public int FromMonth { get; set; }

    public int FromYear { get; set; }

    public int ToMonth { get; set; }

    public int ToYear { get; set; }

    public decimal CarriedAmount { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [JsonIgnore]
    public virtual User User { get; set; } = null!;

    [JsonIgnore]
    public virtual FinancialJar Jar { get; set; } = null!;
}