using System;
using System.Text.Json.Serialization;

namespace Project3_Personal_Finance.Models;

public partial class Notification
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string Title { get; set; } = null!;

    public string Message { get; set; } = null!;

    // Loại thông báo: 'DEBT_DUE' (đến hạn nợ), 'GOAL_DUE' (đến hạn mục tiêu), 'OVER_BUDGET' (vượt chỉ tiêu lọ)
    public string Type { get; set; } = null!;

    public bool IsRead { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.Now;

    [JsonIgnore]
    public virtual User User { get; set; } = null!;
}