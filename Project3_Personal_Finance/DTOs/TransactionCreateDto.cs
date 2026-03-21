namespace Project3_Personal_Finance.DTOs
{
    public class TransactionCreateDto
    {
        public decimal Amount { get; set; }
        public int CategoryId { get; set; }
        public string Type { get; set; } = null!;
        public DateTime TransactionDate { get; set; }
        public string Note { get; set; }
    }
}
