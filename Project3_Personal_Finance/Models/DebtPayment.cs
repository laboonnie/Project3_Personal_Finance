using System;

namespace Project3_Personal_Finance.Models;

public partial class DebtPayment
{
    public int Id { get; set; }

    public int DebtId { get; set; }

    public decimal AmountPaid { get; set; }

    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;

    public string? Note { get; set; }

    public virtual Debt? Debt { get; set; }
}