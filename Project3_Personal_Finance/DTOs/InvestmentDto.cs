namespace Project3_Personal_Finance.DTOs
{
    public class InvestmentDto
    {
        public string AssetName { get; set; }
        public string AssetType { get; set; }
        public decimal AmountInvested { get; set; }
        public decimal CurrentValue { get; set; }
        public DateTime InvestDate { get; set; }
    }
}
