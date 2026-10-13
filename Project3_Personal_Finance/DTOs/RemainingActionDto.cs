using System.ComponentModel.DataAnnotations;

namespace Project3_Personal_Finance.DTOs
{
    public class RemainingActionDto
    {
        [Range(1, 12)]
        public int Month { get; set; }

        [Range(2000, 2100)]
        public int Year { get; set; }

        [Range(typeof(decimal), "0.01", "9999999999999999")]
        public decimal Amount { get; set; }

        [Required]
        public string ActionType { get; set; } = string.Empty;

        public int? TargetJarId { get; set; }

        public int? GoalId { get; set; }

        public int? DebtId { get; set; }

        public int? InvestmentId { get; set; }
    }
}
