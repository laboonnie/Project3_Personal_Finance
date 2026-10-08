using System;

namespace Project3_Personal_Finance.Models;

public partial class TransactionEditHistory
{
    public int Id { get; set; }

    public int TransactionId { get; set; }

    public int UserId { get; set; }

    public int OldCategoryId { get; set; }

    public int NewCategoryId { get; set; }

    public decimal OldAmount { get; set; }

    public decimal NewAmount { get; set; }

    public string OldType { get; set; } = null!;

    public string NewType { get; set; } = null!;

    // Phải là DateTime để khớp Transaction.TransactionDate
    public DateTime OldTransactionDate { get; set; }

    public DateTime NewTransactionDate { get; set; }

    public string? OldNote { get; set; }

    public string? NewNote { get; set; }

    public DateTime EditedAt { get; set; }

    public virtual Transaction Transaction { get; set; } = null!;

    public virtual User User { get; set; } = null!;
}