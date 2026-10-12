using BCrypt.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using System.Net;
using System.Net.Mail;

namespace Project3_Personal_Finance.Controllers
{
    public class ResetPasswordDto
    {
        public string Token { get; set; } = null!;
        public string NewPassword { get; set; } = null!;
    }

    [Route("api/[controller]")]
    [ApiController]
    public class UsersController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        private readonly IConfiguration _configuration;

        public UsersController(PersonalFinanceDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        // 1. REGISTER 
        [HttpPost("register")]
        public IActionResult Register(RegisterDto request)
        {
                if (_context.Users.Any(u => u.Email == request.Email))
            {
                return BadRequest("Email have been used.");
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);

            var user = new User
            {
                Name = request.Name,
                Email = request.Email,
                PasswordHash = passwordHash,
                Role = "User",
                IsActive = true,
                CreatedAt = DateTime.Now
            };

            _context.Users.Add(user);
            _context.SaveChanges();

            return Ok(new { message = "Registration successful!" });
        }

        // 2. LOGIN
        [HttpPost("login")]
        public IActionResult Login(LoginDto request)
        {
            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);

            if (user == null)
            {
                return BadRequest(new { message = "Email không tồn tại trong hệ thống!" });
            }

            Console.WriteLine($"[DEBUG LOGIN] Email: {user.Email}, Role: {user.Role}, IsActive: {user.IsActive}");

            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);

            if (!isPasswordValid)
            {
                return BadRequest(new { message = "Mật khẩu không đúng! (Xác thực Hash thất bại)" });
            }

            if (user.IsActive == false)
            {
                return BadRequest(new { message = "Tài khoản của bạn đã bị khóa!" });
            }

            var token = CreateToken(user);

            return Ok(new
            {
                Token = token,
                User = new { user.Id, user.Name, user.Email, Role = user.Role ?? "User" }
            });
        }

        // 3. FORGOT PASSWORD (Tạo Token & Gửi Email)
        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return BadRequest(new { message = "Email không tồn tại trong hệ thống!" });
            }

            // 1. Tạo Token ngẫu nhiên và thời gian hết hạn (ví dụ: 15 phút)
            string resetToken = Guid.NewGuid().ToString("N");

            var passwordReset = new PasswordResetToken
            {
                UserId = user.Id,
                Token = resetToken,
                ExpiresAt = DateTime.Now.AddMinutes(15),
                IsUsed = false,
                CreatedAt = DateTime.Now
            };

            // 2. Lưu vào bảng PasswordResetToken
            _context.PasswordResetTokens.Add(passwordReset);
            await _context.SaveChangesAsync();

            // 3. Gửi Email kèm Link khôi phục
            try
            {
                string fromEmail = _configuration["EmailSettings:FromEmail"] ?? "viethoangb05@gmail.com";
                string appPassword = (_configuration["EmailSettings:AppPassword"] ?? "madfpndorzbodjj").Replace(" ", "");

                // Đường dẫn trên giao diện React dẫn tới trang Reset Password
                string resetLink = $"http://localhost:3000/reset-password?token={resetToken}";

                using (var smtpClient = new SmtpClient("smtp.gmail.com"))
                {
                    smtpClient.Port = 587;
                    smtpClient.Credentials = new NetworkCredential(fromEmail, appPassword);
                    smtpClient.EnableSsl = true;

                    var mailMessage = new MailMessage
                    {
                        From = new MailAddress(fromEmail, "Finance App Support"),
                        Subject = "Yêu cầu đặt lại mật khẩu - Personal Finance",
                        Body = $@"
                    <h3>Xin chào {user.Name},</h3>
                    <p>Bạn vừa yêu cầu đặt lại mật khẩu cho tài khoản Personal Finance.</p>
                    <p>Vui lòng bấm vào liên kết dưới đây để tiến hành đặt mật khẩu mới (Liên kết có hiệu lực trong 15 phút):</p>
                    <p><a href='{resetLink}' style='background-color: #3182ce; color: white; padding: 10px 15px; text-decoration: none; border-radius: 5px; display: inline-block;'>Đặt lại mật khẩu</a></p>
                    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>",
                        IsBodyHtml = true,
                    };

                    mailMessage.To.Add(user.Email);
                    await smtpClient.SendMailAsync(mailMessage);
                }

                return Ok(new { message = "Email hướng dẫn đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp thư!" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = $"Lỗi khi gửi email: {ex.Message}" });
            }
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            // Kiểm tra token có tồn tại, chưa dùng và chưa hết hạn
            var resetRecord = await _context.PasswordResetTokens
                .Include(p => p.User)
                .FirstOrDefaultAsync(p => p.Token == request.Token
                                       && !p.IsUsed
                                       && p.ExpiresAt > DateTime.Now);

            if (resetRecord == null)
            {
                return BadRequest(new { message = "Mã xác nhận không hợp lệ hoặc đã hết hạn!" });
            }

            // Cập nhật mật khẩu mới cho User
            resetRecord.User.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);

            // Đánh dấu Token đã được sử dụng
            resetRecord.IsUsed = true;

            await _context.SaveChangesAsync();

            return Ok(new { message = "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bây giờ." });
        }

        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdString!);
        }

        // 4. PROFILE
        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound();

            return Ok(new { user.Name, user.Email });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile(UpdateProfileDto request)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Cannot find user.");

            if (user.Email != request.Email && _context.Users.Any(u => u.Email == request.Email))
            {
                return BadRequest("Email is already in use by another account.");
            }

            user.Name = request.Name;
            user.Email = request.Email;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Update profile successfully!", name = user.Name });
        }

        // 5. CHANGE PASSWORD
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto request)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Cannot find user.");

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest("Current password is incorrect.");
            }

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Change password successfully!" });
        }

        // 6. HELPER: CREATE TOKEN
        private string CreateToken(User user)
        {
            List<Claim> claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Name),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role ?? "User")
            };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("Jwt:Key").Value!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddDays(1),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }

        // 7. CRUD USERS
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        [HttpGet("{id}")]
        public async Task<ActionResult<User>> GetUser(int id)
        {
            var user = await _context.Users.FindAsync(id);

            if (user == null)
            {
                return NotFound();
            }

            return user;
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> PutUser(int id, User user)
        {
            if (id != user.Id)
            {
                return BadRequest();
            }

            _context.Entry(user).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!UserExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        [HttpPost]
        public async Task<ActionResult<User>> PostUser(User user)
        {
            if (string.IsNullOrEmpty(user.PasswordHash))
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword("123456");
            }
            else
            {
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(user.PasswordHash);
            }

            user.CreatedAt = DateTime.Now;

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok(user);
        }

        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("Cannot find user.");

            if (user.Role == "Admin")
            {
                return BadRequest("Cannot modify admin account!");
            }

            user.IsActive = !user.IsActive;
            await _context.SaveChangesAsync();

            string actionMessage = user.IsActive == true ? "Account successfully UNLOCKED!" : "Account successfully LOCKED!";
            return Ok(new { message = actionMessage, isActive = user.IsActive });
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Id == id);
        }
    }
}