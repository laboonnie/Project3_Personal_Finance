using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;
using System.Security.Claims;
using System.Text;
using System.Text.Json;

namespace Project3_Personal_Finance.Controllers
{
    public class ChatMessageDto
    {
        public string Role { get; set; } = "user"; // "user" hoặc "model"
        public string Text { get; set; } = string.Empty;
    }

    public class ChatRequestDto
    {
        public string Message { get; set; } = string.Empty;
        public List<ChatMessageDto>? History { get; set; }
    }

    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class AiAdvisorController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;

        public AiAdvisorController(PersonalFinanceDbContext context, IConfiguration configuration)
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
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.TryParse(userIdClaim, out int id) ? id : 0;
        }

        private string GetGeminiApiKey()
        {
            return _configuration["GeminiSettings:ApiKey"]?.Trim() 
                ?? _configuration["GroqSettings:ApiKey"]?.Trim() 
                ?? string.Empty;
        }

        // ==================== HELPER: LẤY BỐI CẢNH TÀI CHÍNH ====================
        private async Task<string> BuildFinancialContextAsync(int userId)
        {
            var now = DateTime.Now;
            var startOfMonth = new DateTime(now.Year, now.Month, 1);
            var startOfNextMonth = startOfMonth.AddMonths(1);

            var user = await _context.Users.FindAsync(userId);
            var userName = user?.Name ?? "Bạn";

            // 1. Giao dịch tháng hiện tại
            var transactions = await _context.Transactions
                .Include(t => t.Category)
                .ThenInclude(c => c.Jar)
                .Where(t => t.UserId == userId && t.TransactionDate >= startOfMonth && t.TransactionDate < startOfNextMonth)
                .ToListAsync();

            var totalIncome = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
            var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);
            var netBalance = totalIncome - totalExpense;

            // Chi tiết chi tiêu theo danh mục
            var categoryBreakdown = transactions
                .Where(t => t.Type == "Expense")
                .GroupBy(t => t.Category?.Name ?? "Khác")
                .Select(g => $"- {g.Key}: {g.Sum(t => t.Amount):N0} VNĐ")
                .ToList();

            var categoryText = categoryBreakdown.Any() 
                ? string.Join("\n", categoryBreakdown) 
                : "Chưa có chi tiêu danh mục nào.";

            // 2. Ngân sách theo lọ (6 Jars)
            var jars = await _context.FinancialJars.ToListAsync();
            var budgets = await _context.Budgets
                .Where(b => b.UserId == userId && b.Month == now.Month && b.Year == now.Year)
                .ToListAsync();

            var jarSummaries = new List<string>();
            foreach (var jar in jars)
            {
                var spent = transactions
                    .Where(t => t.Type == "Expense" && t.Category?.JarId == jar.Id)
                    .Sum(t => t.Amount);
                var budget = budgets.FirstOrDefault(b => b.JarId == jar.Id)?.BudgetAmount ?? 0;
                jarSummaries.Add($"- Lọ {jar.JarName} ({jar.JarCode}): Ngân sách {budget:N0} VNĐ | Đã tiêu {spent:N0} VNĐ | Còn lại {budget - spent:N0} VNĐ");
            }

            // 3. Mục tiêu tài chính (Goals)
            var goals = await _context.Goals
                .Where(g => g.UserId == userId)
                .Select(g => $"- Mục tiêu '{g.GoalName}': Đạt {g.CurrentAmount:N0} / {g.TargetAmount:N0} VNĐ (Trạng thái: {g.Status})")
                .ToListAsync();

            // 4. Khoản nợ (Debts)
            var debts = await _context.Debts
                .Where(d => d.UserId == userId && d.RemainingAmount > 0)
                .Select(d => $"- Khoản nợ '{d.DebtName}': Còn nợ {d.RemainingAmount:N0} / Tổng {d.TotalAmount:N0} VNĐ (Lãi suất: {d.InterestRate}%)")
                .ToListAsync();

            var sb = new StringBuilder();
            sb.AppendLine($"Thông tin tài chính của người dùng {userName} (Tháng {now.Month}/{now.Year}):");
            sb.AppendLine($"• Tổng thu nhập: {totalIncome:N0} VNĐ");
            sb.AppendLine($"• Tổng chi tiêu: {totalExpense:N0} VNĐ");
            sb.AppendLine($"• Dòng tiền ròng (Thu - Chi): {netBalance:N0} VNĐ");
            sb.AppendLine($"• Chi tiêu theo danh mục:\n{categoryText}");
            sb.AppendLine($"• Trạng thái 6 chiếc lọ tài chính:\n{string.Join("\n", jarSummaries)}");

            if (goals.Any())
                sb.AppendLine($"• Mục tiêu tài chính đang theo đuổi:\n{string.Join("\n", goals)}");
            if (debts.Any())
                sb.AppendLine($"• Các khoản nợ cần thanh toán:\n{string.Join("\n", debts)}");

            return sb.ToString();
        }

        // ==================== HELPER: GỌI GOOGLE GEMINI API ====================
        private async Task<string> CallGeminiAsync(string apiKey, object payload)
        {
            var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            // Danh sách model ưu tiên từ cao xuống thấp (Các model hoạt động ổn định của Google Gemini)
            var modelsToTry = new[]
            {
                "gemini-3.5-flash-lite",
                "gemini-3.1-flash-lite",
                "gemini-3.8-flash",
                "gemini-3.5-flash",
                "gemini-flash-latest"
            };

            string lastError = "";

            foreach (var model in modelsToTry)
            {
                var apiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}";

                try
                {
                    using var response = await _httpClient.PostAsync(apiUrl, content);
                    var responseString = await response.Content.ReadAsStringAsync();

                    if (!response.IsSuccessStatusCode)
                    {
                        lastError = $"Model {model} ({response.StatusCode}): {responseString}";
                        Console.WriteLine($"[Gemini API] Thử model {model} không thành công: {response.StatusCode} - {responseString}");
                        continue;
                    }

                    using var doc = JsonDocument.Parse(responseString);
                    if (doc.RootElement.TryGetProperty("candidates", out var candidates) &&
                        candidates.GetArrayLength() > 0)
                    {
                        var candidate = candidates[0];
                        if (candidate.TryGetProperty("content", out var contentElem) &&
                            contentElem.TryGetProperty("parts", out var parts) &&
                            parts.GetArrayLength() > 0)
                        {
                            var text = parts[0].GetProperty("text").GetString();
                            if (!string.IsNullOrWhiteSpace(text))
                            {
                                return text.Trim();
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    lastError = $"Model {model} Exception: {ex.Message}";
                }
            }

            throw new InvalidOperationException(lastError);
        }

        // ==================== 1. CHAT ĐÀM THOẠI 2 CHIỀU ====================
        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] ChatRequestDto request)
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Không xác thực được người dùng.");

                if (string.IsNullOrWhiteSpace(request.Message))
                {
                    return BadRequest(new { message = "Tin nhắn không được để trống." });
                }

                var apiKey = GetGeminiApiKey();
                if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
                {
                    return Ok(new
                    {
                        reply = "⚠️ Chưa cấu hình Google Gemini API Key trong hệ thống. Vui lòng cấu hình GeminiSettings:ApiKey trong appsettings.json để kích hoạt trợ lý AI."
                    });
                }

                var financialContext = await BuildFinancialContextAsync(userId);

                string systemInstruction = $@"
Bạn là FinSmart AI - Chuyên gia Hoạch định & Tư vấn Tài chính Cá nhân (CFP) cao cấp, thông minh, giàu thấu cảm và sắc bén về toán học tài chính.
Dưới đây là BỨC TRANH TÀI CHÍNH THỰC TẾ tháng {DateTime.Now.Month}/{DateTime.Now.Year} của người dùng đang trò chuyện trực tiếp với bạn:
==================================================
{financialContext}
==================================================

HỆ THỐNG TRI THỨC VÀ KHUNG PHƯƠNG PHÁP TÀI CHÍNH CỐT LÕI CỦA BẠN:
1. PHƯƠNG PHÁP 6 CHIẾC LỌ (6 JARS):
   - NEC (55%): Nhu cầu thiết yếu (ăn uống, nhà ở, điện nước, y tế). Nếu NEC thực tế ngốn > 60-70%, hướng dẫn người dùng điều chỉnh linh hoạt: tạm thời giảm PLAY xuống 5%, LTSS 5%, EDU 5%, giữ GIVE 2-3%, nhưng TUYỆT ĐỐI không cắt bỏ hoàn toàn việc tiết kiệm để giữ kỷ luật.
   - FFA (10%): Tự do tài chính. Khoản này CHỈ DÙNG ĐẦU TƯ sinh lời (quỹ mở, ETF, cổ phiếu, bất động sản, tích sản vàng). TUYỆT ĐỐI KHÔNG RÚT RA TIÊU XÀI hay dùng làm quỹ khẩn cấp.
   - LTSS (10%): Tiết kiệm dài hạn (mua sắm lớn, quỹ khẩn cấp).
   - EDU (10%): Đầu tư vào tri thức, học kỹ năng mới nhằm tăng năng lực kiếm tiền trong tương lai.
   - PLAY (10%): Hưởng thụ, tái tạo sức lao động, giải tỏa stress lành mạnh. Nên dùng hết trong tháng hoặc tích lũy tối đa 2-3 tháng cho chuyến đi lớn, không dồn tích vô thời hạn.
   - GIVE (5%): Cho đi, từ thiện, quà cáp phụng dưỡng gia đình.

2. CHIẾN LƯỢC XÓA NỢ & QUẢN LÝ TÍN DỤNG:
   - Chiến lược Tuyết lở (Debt Avalanche): Ưu tiên dồn tiền trả khoản nợ có LÃI SUẤT CAO NHẤT trước (như nợ thẻ tín dụng 25-35%/năm, vay tiêu dùng tín chấp) nhằm tối ưu tiết kiệm tiền lãi về mặt toán học.
   - Chiến lược Hòn tuyết lăn (Debt Snowball): Ưu tiên trả dứt điểm khoản nợ có SỐ DƯ NHỎ NHẤT trước nhằm tạo chiến thắng tâm lý và động lực tiếp tục.
   - Cảnh báo bẫy thẻ tín dụng: Chỉ trả số tiền tối thiểu (Minimum Payment) sẽ kích hoạt lãi suất kép và mất hàng chục năm để trả hết.
   - Tỷ lệ nợ an toàn (DTI - Debt to Income): Tổng tiền trả nợ hàng tháng không vượt quá 30% - 36% tổng thu nhập.

3. QUỸ DỰ PHÒNG KHẨN CẤP (EMERGENCY FUND):
   - Bằng tối thiểu 3 đến 6 tháng chi phí sinh hoạt thiết yếu (NEC).
   - Lưu trữ ở nơi thanh khoản cao, rủi ro bằng 0 (gửi tiết kiệm online kỳ hạn 1 tháng, chứng chỉ tiền gửi linh hoạt). TUYỆT ĐỐI không đem đi đầu tư rủi ro.

4. ĐẦU TƯ & TỰ DO TÀI CHÍNH (FIRE):
   - Quy tắc 72: Số năm để nhân đôi số tiền đầu tư = 72 / (Lãi suất %/năm).
   - Quy tắc 4% (Bản đồ FIRE): Con số tự do tài chính = Tổng chi tiêu cả năm x 25. Khi tài sản đầu tư đạt mốc này, mỗi năm chỉ rút 4% để chi tiêu an toàn trọn đời.
   - Phương pháp DCA (Bình quân giá): Đầu tư định kỳ đều đặn mỗi tháng vào tài sản tăng trưởng (như quỹ chỉ số ETF VN30/VN100) để trung hòa biến động thị trường.
   - Cảnh báo lừa đảo (Ponzi): Bất kỳ dự án nào cam kết lợi nhuận cố định > 15-20%/năm mà khẳng định 'không rủi ro' đều có dấu hiệu lừa đảo.

5. TÂM LÝ TÀI CHÍNH & KIỂM SOÁT BỘC PHÁT:
   - Quy tắc 72 giờ: Chờ 72 giờ trước khi mua sắm các món đồ không thiết yếu (giải tỏa căng thẳng/mua sắm cảm xúc).
   - Bóc tách Nhu cầu (Needs) vs Mong muốn (Wants).

6. CHẾ ĐỘ SINH TỒN (SURVIVAL MODE KHI MẤT VIỆC/GIẢM LƯƠNG):
   - Cắt giảm ngay 100% chi tiêu PLAY và GIVE, đàm phán cơ cấu nợ với ngân hàng, kích hoạt quỹ dự phòng và tập trung mọi nguồn lực tìm nguồn thu mới.

QUY TẮC CÁ NHÂN HÓA BẮT BUỘC KHI TRẢ LỜI:
- BẤT KỲ CÂU HỎI NÀO của người dùng (dù là hỏi lý thuyết hay hỏi thực tế): BẠN PHẢI LUÔN ĐỐI CHIẾU VỚI BỨC TRANH TÀI CHÍNH THỰC TẾ Ở TRÊN ĐỂ ĐƯA RA CON SỐ VÀ LỜI KHUYÊN CỤ THỂ CHO HỌ!
  + Ví dụ: Hỏi 'Quỹ khẩn cấp của tôi là bao nhiêu?' -> Bạn lấy ngay chi tiêu tháng này của họ nhân 3 và nhân 6 để đưa ra con số chính xác bằng VNĐ!
  + Ví dụ: Hỏi 'Tôi nên trả khoản nợ nào trước?' -> Bạn quét ngay danh sách Các khoản nợ thực tế ở trên để phân tích và chỉ đích danh khoản nợ nào của họ cần trả trước!
  + Ví dụ: Hỏi 'Tôi nên cắt giảm chi tiêu nào?' -> Bạn xem ngay danh mục chi tiêu nào đang chiếm số tiền lớn nhất của họ để chỉ rõ!
  + Nếu người dùng mới chưa có dữ liệu (thu chi = 0 VNĐ): Hãy thông báo tinh tế và hướng dẫn họ nhập các giao dịch đầu tiên hoặc đưa ra ví dụ mẫu.
- PHONG CÁCH TRẢ LỜI:
  + Dùng tiếng Việt chuẩn mực, tích cực, truyền cảm hứng, dùng emoji sinh động.
  + Trình bày rõ ràng: Kết luận trực tiếp -> Phân tích kèm số liệu cụ thể -> Các bước hành động cụ thể (Bước 1, 2, 3).";

                // Xây dựng lịch sử chat cho Gemini
                var contents = new List<object>();

                if (request.History != null && request.History.Any())
                {
                    foreach (var h in request.History.TakeLast(6)) // Giữ 6 tin nhắn gần nhất
                    {
                        contents.Add(new
                        {
                            role = h.Role == "model" || h.Role == "assistant" ? "model" : "user",
                            parts = new[] { new { text = h.Text } }
                        });
                    }
                }

                // Thêm câu hỏi hiện tại
                contents.Add(new
                {
                    role = "user",
                    parts = new[] { new { text = request.Message } }
                });

                var requestPayload = new
                {
                    systemInstruction = new
                    {
                        parts = new[] { new { text = systemInstruction } }
                    },
                    contents = contents,
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 2048
                    }
                };

                var reply = await CallGeminiAsync(apiKey, requestPayload);
                return Ok(new { reply });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Gemini Chat Error] {ex.Message}");
                if (ex.Message.Contains("leaked") || ex.Message.Contains("403"))
                {
                    return Ok(new
                    {
                        reply = "⚠️ Khóa Gemini API Key hiện tại đã bị Google vô hiệu hóa (do từng bị leak). Vui lòng cập nhật API Key mới tại Google AI Studio và lưu vào appsettings.json."
                    });
                }

                return Ok(new
                {
                    reply = "Xin lỗi, hiện tại kết nối đến AI đang gặp gián đoạn. Vui lòng thử lại sau ít phút nhé! 🤖"
                });
            }
        }

        // ==================== 2. PHÂN TÍCH TỔNG QUAN 1 CHẠM ====================
        [HttpGet("analyze-current-month")]
        public async Task<IActionResult> AnalyzeCurrentMonth()
        {
            try
            {
                var userId = GetCurrentUserId();
                if (userId == 0) return Unauthorized("Không xác thực được người dùng.");

                var apiKey = GetGeminiApiKey();
                if (string.IsNullOrWhiteSpace(apiKey) || apiKey.Contains("YOUR_GEMINI_API_KEY"))
                {
                    return Ok(new
                    {
                        advice = "⚠️ Chưa cấu hình Google Gemini API Key. Vui lòng cấu hình GeminiSettings:ApiKey trong appsettings.json để sử dụng tính năng phân tích này."
                    });
                }

                var financialContext = await BuildFinancialContextAsync(userId);

                var prompt = $@"
Dưới đây là dữ liệu thu chi tháng {DateTime.Now.Month}/{DateTime.Now.Year} của tôi:
{financialContext}

Hãy đóng vai chuyên gia tài chính cá nhân, phân tích ngắn gọn tình hình của tôi và cấu trúc phản hồi đúng 3 phần:
1. 📊 Đánh giá tổng quan (1-2 câu tóm tắt tình trạng dòng tiền)
2. ⚠️ Cảnh báo rủi ro (Chỉ ra lọ hoặc danh mục nào đang chi tiêu quá tay hoặc cần chú ý)
3. 💡 Lời khuyên hành động (1 hành động cụ thể và thực tế nhất nên làm ngay)

Yêu cầu: Trả lời bằng tiếng Việt, giọng điệu chuyên nghiệp, thân thiện, dùng emoji sinh động.";

                var requestPayload = new
                {
                    contents = new[]
                    {
                        new { role = "user", parts = new[] { new { text = prompt } } }
                    },
                    generationConfig = new
                    {
                        temperature = 0.7,
                        maxOutputTokens = 800
                    }
                };

                var advice = await CallGeminiAsync(apiKey, requestPayload);
                return Ok(new { advice });
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine($"[Gemini Analyze Error] {ex.Message}");
                if (ex.Message.Contains("leaked") || ex.Message.Contains("403"))
                {
                    return Ok(new
                    {
                        advice = "⚠️ Khóa Gemini API Key đã bị Google vô hiệu hóa (do từng bị leak lên GitHub). Vui lòng cập nhật API Key mới tại aistudio.google.com và lưu vào appsettings.json."
                    });
                }

                return Ok(new
                {
                    advice = "Hiện tại chưa thể kết nối đến máy chủ AI. Vui lòng kiểm tra lại kết nối mạng hoặc thử lại sau! 🤖"
                });
            }
        }
    }
}
