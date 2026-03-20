using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;


namespace Project3_Personal_Finance.Models;

public partial class Transaction
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public int CategoryId { get; set; }

    public decimal Amount { get; set; }

    public string Type { get; set; } = null!;

    public DateTime TransactionDate { get; set; }

    public string? Note { get; set; }

    [JsonIgnore]

    public virtual Category? Category { get; set; } = null!;

    [JsonIgnore]

    public virtual User? User { get; set; } = null!;
}