
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
        private readonly IConfiguration _configuration;

        public AiAdvisorController( PersonalFinanceDbContext context,IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            _httpClient = new HttpClient
            {
                Timeout = TimeSpan.FromSeconds(60)
            };
        }

        private int GetCurrentUserId()
        {
            var userIdClaim =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            return int.TryParse(userIdClaim, out int id) ? id : 0;
        }

        [HttpGet("analyze-current-month")]
        public async Task<IActionResult> AnalyzeCurrentMonth()
        {
            try
            {
                var userId = GetCurrentUserId();

                if (userId == 0)
                {
                    return Unauthorized(new
                    {
                        advice = "Không xác thực được người dùng."
                    });
                }

                // Lấy khoảng thời gian của tháng hiện tại.
                var now = DateTime.Now;
                var startOfMonth = new DateTime(
                    now.Year, now.Month, 1);

                var startOfNextMonth = startOfMonth.AddMonths(1);

                // Chỉ lấy giao dịch của người dùng đang đăng nhập.
                var transactions = await _context.Transactions
                    .Include(t => t.Category)
                    .Where(t =>
                        t.UserId == userId &&
                        t.TransactionDate >= startOfMonth &&
                        t.TransactionDate < startOfNextMonth)
                    .ToListAsync();

                if (!transactions.Any())
                {
                    return Ok(new
                    {
                        advice = $"Bạn chưa có giao dịch nào trong tháng " +
                                 $"{now.Month}/{now.Year} để AI phân tích. " +
                                 "Hãy ghi chép thêm chi tiêu nhé! 📝"
                    });
                }

                // Tính tổng thu nhập và chi tiêu.
                var totalIncome = transactions
                    .Where(t => t.Type == "Income")
                    .Sum(t => t.Amount);

                var totalExpense = transactions
                    .Where(t => t.Type == "Expense")
                    .Sum(t => t.Amount);

                var categoryBreakdown = transactions
                    .Where(t => t.Type == "Expense")
                    .GroupBy(t =>
                        t.Category != null
                            ? t.Category.Name
                            : "Khác")
                    .Select(g =>
                        $"- {g.Key}: {g.Sum(t => t.Amount):N0} VNĐ")
                    .ToList();

                var expenseDetails = categoryBreakdown.Any()
                    ? string.Join("\n", categoryBreakdown)
                    : "Chưa có chi tiết danh mục.";


                var prompt = $@"
You are a professional personal finance advisor.

Analyze the following financial data for {now.Month}/{now.Year}:

- Total Income: {totalIncome:N0} VND
- Total Expenses: {totalExpense:N0} VND
- Net Cash Flow: {totalIncome - totalExpense:N0} VND
- Expenses by Category:
{expenseDetails}

Provide your advice entirely in English using clear, concise,
and easy-to-understand language.

Structure your response into exactly three sections:

1. 📊 Overall Financial Assessment:
   Summarize the user's financial situation in 1-2 sentences.

2. ⚠️ Warnings and Considerations:
   Identify potential financial risks or spending concerns
   supported by the provided data. If there are no obvious
   concerns, state that clearly.

3. 💡 Recommended Action:
   Suggest one specific, practical action the user can take
   to improve their financial situation.

Use relevant emojis and do not invent financial data.
All amounts must be interpreted in Vietnamese Dong (VND).
";


                var apiKey = _configuration["GroqSettings:ApiKey"]?.Trim();

                if (string.IsNullOrWhiteSpace(apiKey))
                {
                    return StatusCode(500, new
                    {
                        advice = "Chưa cấu hình Groq API Key. " +
                                 "Vui lòng kiểm tra cấu hình backend."
                    });
                }

                // Chỉ sử dụng các model thay thế.
                // Không dùng lại model đã bị ngừng hỗ trợ.
                string[] modelsToTry =
                {
                    "openai/gpt-oss-120b",
                    "openai/gpt-oss-20b"
                };

                string lastError = "";

                foreach (var modelName in modelsToTry)
                {
                    try
                    {
                        var requestBody = new
                        {
                            model = modelName,
                            messages = new[]
                            {
                                new
                                {
                                    role = "system",
                                    content =
                                         "You are a professional personal finance advisor. " +
                                        "Always respond entirely in English. " +
                                        "Provide clear, concise, and practical financial advice."
                                },
                                new
                                {
                                    role = "user",
                                    content = prompt
                                }
                            },
                            temperature = 0.7,
                            max_completion_tokens = 800
                        };

                        using var request = new HttpRequestMessage(
                            HttpMethod.Post,
                            "https://api.groq.com/openai/v1/chat/completions");

                        request.Headers.Authorization =
                            new System.Net.Http.Headers.AuthenticationHeaderValue(
                                "Bearer", apiKey);

                        request.Content = new StringContent(
                            JsonSerializer.Serialize(requestBody),
                            Encoding.UTF8,
                            "application/json");

                        using var response = await _httpClient.SendAsync(
                            request, HttpContext.RequestAborted);

                        var responseString =
                            await response.Content.ReadAsStringAsync();

                        if (!response.IsSuccessStatusCode)
                        {
                            lastError =
                                $"Model {modelName}: HTTP {(int)response.StatusCode} - " +
                                responseString;

                            // Thử model tiếp theo nếu model hiện tại lỗi.
                            continue;
                        }

                        using var doc = JsonDocument.Parse(responseString);

                        if (!doc.RootElement.TryGetProperty(
                                "choices", out var choices) ||
                            choices.GetArrayLength() == 0)
                        {
                            lastError =
                                $"Model {modelName} không trả về choices.";
                            continue;
                        }

                        var aiAdvice = choices[0]
                            .GetProperty("message")
                            .GetProperty("content")
                            .GetString();

                        if (string.IsNullOrWhiteSpace(aiAdvice))
                        {
                            lastError =
                                $"Model {modelName} trả về nội dung rỗng.";
                            continue;
                        }

                        return Ok(new
                        {
                            advice = aiAdvice.Trim()
                        });
                    }
                    catch (OperationCanceledException)
                        when (HttpContext.RequestAborted.IsCancellationRequested)
                    {
                        throw;
                    }
                    catch (Exception ex)
                    {
                        lastError = $"Model {modelName}: {ex.Message}";
                    }
                }

                // Ghi chi tiết lỗi ở backend, không trả nguyên API error
                // cho người dùng frontend.
                Console.Error.WriteLine(
                    $"Groq AI Advisor failed: {lastError}");

                return StatusCode(502, new
                {
                    advice = "Hiện tại AI chưa thể phân tích dữ liệu. " +
                             "Vui lòng thử lại sau hoặc kiểm tra API Key, " +
                             "model và hạn mức sử dụng Groq."
                });
            }
            catch (OperationCanceledException)
                when (HttpContext.RequestAborted.IsCancellationRequested)
            {
                return StatusCode(499, new
                {
                    advice = "Yêu cầu đã bị hủy."
                });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine(
                    $"AI Advisor system error: {ex}");

                return StatusCode(500, new
                {
                    advice = "Đã xảy ra lỗi hệ thống khi phân tích tài chính."
                });
            }
        }
    }
}
