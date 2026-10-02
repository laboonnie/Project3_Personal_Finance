using System;
using System.Text.Json.Serialization;

namespace Project3_Personal_Finance.Models;

public partial class PasswordResetToken
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Token { get; set; } = null!;

    public DateTime ExpiresAt { get; set; }

    public bool IsUsed { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [JsonIgnore]
    public virtual User User { get; set; } = null!;
}