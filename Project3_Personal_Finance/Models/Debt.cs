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
    public int? JarId { get; set; }
    public virtual User? User { get; set; } = null!;

    public virtual FinancialJar? Jar { get; set; }
}
