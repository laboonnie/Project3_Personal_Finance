using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AiAdvisorController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        private readonly HttpClient _httpClient;

        private readonly string _geminiApiKey = "AIzaSyANUi59zLElySpgfBDYsk1Wu08PuFkZ4L4";

        public AiAdvisorController(PersonalFinanceDbContext context)
        {
            _context = context;
            _httpClient = new HttpClient();
        }

        private int GetCurrentUserId() => int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value!);

        [HttpGet("analyze-current-month")]
        public async Task<IActionResult> AnalyzeCurrentMonth()
        {
            var userId = GetCurrentUserId();
            var currentMonth = DateTime.Now.Month;
            var currentYear = DateTime.Now.Year;

            // 1. Lấy dữ liệu giao dịch của tháng hiện tại
            var transactions = await _context.Transactions
                .Where(t => t.UserId == userId && t.TransactionDate.Month == currentMonth && t.TransactionDate.Year == currentYear)
                .ToListAsync();

            if (!transactions.Any())
            {
                return Ok(new { advice = "You haven't had any transactions this month for the AI ​​to analyze. Please add more to your records!" });
            }

            // 2. Tính toán tổng quan
            var totalIncome = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);

            // 3. Tạo câu lệnh (Prompt) yêu cầu AI phân tích
            string prompt = $@"
                Bạn là một chuyên gia tư vấn tài chính cá nhân. Dưới đây là dữ liệu thu chi tháng {currentMonth}/{currentYear} của tôi:
                - Tổng thu nhập: {totalIncome:N0} VNĐ
                - Tổng chi tiêu: {totalExpense:N0} VNĐ
                
                Hãy phân tích ngắn gọn (khoảng 3-4 câu) về tình hình tài chính của tôi. 
                Đưa ra 1 lời khuyên thực tế để tôi quản lý tiền tốt hơn.
                Yêu cầu: Trả lời bằng tiếng Việt, giọng điệu chuyên nghiệp, thân thiện và sử dụng emoji cho sinh động.";

            // 4. Gửi Request tới Google Gemini API
            var requestBody = new
            {
                contents = new[]
                {
                    new { parts = new[] { new { text = prompt } } }
                }
            };

            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={_geminiApiKey.Trim()}";
            try
            {
                var response = await _httpClient.PostAsync(apiUrl, content);
                var responseString = await response.Content.ReadAsStringAsync();

                // NẾU GOOGLE BÁO LỖI (400, 403, 404...), IN THẲNG LỖI CỦA GOOGLE RA MÀN HÌNH
                if (!response.IsSuccessStatusCode)
                {
                    return BadRequest($"Google refused ({response.StatusCode}): {responseString}");
                }

                // Nếu thành công thì đọc kết quả bình thường
                using JsonDocument doc = JsonDocument.Parse(responseString);
                var aiText = doc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text").GetString();

                return Ok(new { advice = aiText });
            }
            catch (Exception ex)
            {
                return BadRequest($"Error when connecting to AI: {ex.Message}");
            }
        }
    }
}