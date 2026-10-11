namespace Project3_Personal_Finance.DTOs
{
    public class FundTransferRequest
    {
        public int JarId { get; set; }          // lọ nguồn bị trừ tiền
        public decimal Amount { get; set; }
        public int? CategoryId { get; set; }    // tùy chọn: không gửi thì tự lấy category Expense của lọ
    }
}