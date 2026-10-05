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
        // Register 
        [HttpPost("register")]
        public IActionResult Register(RegisterDto request)
        {
            // Check if email already exists
            if (_context.Users.Any(u => u.Email == request.Email))
            {
                return BadRequest("Email have been used.");
            }

            // Hash the password using BCrypt
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
        // Login
        [HttpPost("login")]
        public IActionResult Login(LoginDto request)
        {
            // Find user by email
            var user = _context.Users.FirstOrDefault(u => u.Email == request.Email);

            if (user == null || !BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
            {
                return BadRequest("Email or password is incorrect.");
            }

            if (user.IsActive == false)
            {
                return BadRequest("Your account has been locked. Please contact the administrator!");
            }

            // Create JWT Token
            var token = CreateToken(user);

            return Ok(new
            {
                Token = token,
                User = new { user.Id, user.Name, user.Email, Role = user.Role ?? "User" }
            });
        }

        [HttpPost("forgot-password")]
        public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto request)
        {
            // 1. Kiểm tra xem email có tồn tại không
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return BadRequest("The email address does not exist in the system!");
            }

            // 2. Tạo một mật khẩu tạm thời (8 ký tự ngẫu nhiên)
            string tempPassword = Guid.NewGuid().ToString().Substring(0, 8);
                return BadRequest("Email không tồn tại trong hệ thống!");
            }

            // 2. Tạo một mật khẩu tạm thời (8 ký tự ngẫu nhiên)
            string tempPassword = Guid.NewGuid().ToString().Substring(0, 8);

            // 3. Mã hóa mật khẩu tạm thời và lưu vào Database
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(tempPassword);
            await _context.SaveChangesAsync();

            // 4. CẤU HÌNH GỬI EMAIL QUA GMAIL
            try
            {
                // THAY THẾ BẰNG EMAIL VÀ MẬT KHẨU ỨNG DỤNG CỦA BẠN
                string fromEmail = "viethoangb05@gmail.com";
                string appPassword = "madf pndo rpzb odjj";

                var smtpClient = new SmtpClient("smtp.gmail.com")
                {
                    Port = 587,
                    Credentials = new NetworkCredential(fromEmail, appPassword),
                    EnableSsl = true,
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(fromEmail, "Finance App Support"),
                    Subject = "Khôi phục mật khẩu - Personal Finance ",
                    Body = $@"
                        <h3>Xin chào {user.Name},</h3>
                        <p>Hệ thống đã nhận được yêu cầu khôi phục mật khẩu của bạn.</p>
                        <p>Mật khẩu đăng nhập tạm thời của bạn là: <b style='color: red; font-size: 18px;'>{tempPassword}</b></p>
                        <p>Vui lòng đăng nhập và đổi lại mật khẩu của riêng bạn ngay lập tức để đảm bảo an toàn.</p>
                        <br/>
                        <p>Trân trọng,<br/>Đội ngũ Personal Finance</p>",
                    IsBodyHtml = true, // Cho phép dùng thẻ HTML trong nội dung
                };

                mailMessage.To.Add(user.Email);

                // Thực hiện gửi
                await smtpClient.SendMailAsync(mailMessage);

                return Ok(new { message = "Mật khẩu mới đã được gửi. Vui lòng kiểm tra hộp thư (hoặc mục Spam) của bạn!" });
            }
            catch (Exception ex)
            {
                return BadRequest($"Lỗi khi gửi email: {ex.Message}");
            }
        }

        private int GetCurrentUserId()
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            return int.Parse(userIdString!);
        }

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

            // Check if the new email is already in use by another account
            if (user.Email != request.Email && _context.Users.Any(u => u.Email == request.Email))
            {
                return BadRequest("Email is already in use by another account.");
            }

            user.Name = request.Name;
            user.Email = request.Email;

            await _context.SaveChangesAsync();
            return Ok(new { message = "Update profile successfully!", name = user.Name });
        }

        // 3. ĐỔI MẬT KHẨU
        [Authorize]
        [HttpPut("change-password")]
        public async Task<IActionResult> ChangePassword(ChangePasswordDto request)
        {
            var userId = GetCurrentUserId();
            var user = await _context.Users.FindAsync(userId);
            if (user == null) return NotFound("Cannot find user.");

            // Verify current password
            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest("Current password is incorrect.");
            }

            // Hash and save new password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Change password successfully!" });
        }
        // Create JWT Token
        private string CreateToken(User user)
        {
            List<Claim> claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(ClaimTypes.Name, user.Name),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role)
        };

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(
                _configuration.GetSection("Jwt:Key").Value!));

            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha512Signature);

            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.Now.AddDays(1), // Token hết hạn sau 1 ngày
                signingCredentials: creds
            );

            var jwt = new JwtSecurityTokenHandler().WriteToken(token);
            return jwt;
        }

        // GET: api/Users
        [HttpGet]
        public async Task<ActionResult<IEnumerable<User>>> GetUsers()
        {
            return await _context.Users.ToListAsync();
        }

        // GET: api/Users/5
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

        // PUT: api/Users/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
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

        // POST: api/Users
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
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

        // PUT: api/Users/5/toggle-active
        [Authorize(Roles = "Admin")]
        [HttpPut("{id}/toggle-active")]
        public async Task<IActionResult> ToggleActive(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("Cannot find user.");

            // Bảo vệ kép: Chặn luôn ở Backend không cho phép khóa tài khoản Admin
            if (user.Role == "Admin")
            {
                return BadRequest("Cannot modify admin account!");
            }

            // Đảo ngược trạng thái hiện tại (Đang Yes thành No, đang No thành Yes)
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