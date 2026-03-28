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
                return Unauthorized("Email or password is incorrect.");
            }

            if (user.IsActive == false)
            {
                return Unauthorized("Account has been locked.");
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
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == request.Email);
            if (user == null)
            {
                return BadRequest("The email address does not exist in the system.");
            }

            string newPassword = Guid.NewGuid().ToString().Substring(0, 6).ToUpper();

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(newPassword);
            await _context.SaveChangesAsync();

            // TRONG THỰC TẾ: Bạn sẽ gửi newPassword qua Email ở đây bằng thư viện MailKit.
            // TRONG ĐỒ ÁN: Ta có thể trả thẳng về thông báo để người dùng đăng nhập tạm, sau đó họ tự đổi lại.
            
            return Ok(new { message = $"Your new password: {newPassword} (Login again and change password)" });
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
            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetUser", new { id = user.Id }, user);
        }

        // DELETE: api/Users/5
        [Authorize(Roles = "Admin")]
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound("Không tìm thấy người dùng.");
            }

            var currentUserIdString = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (currentUserIdString != null && int.Parse(currentUserIdString) == id)
            {
                return BadRequest("Bạn không thể tự xóa tài khoản Admin đang đăng nhập!");
            }

            // BỌC TRONG TRY...CATCH ĐỂ BẮT LỖI RÕ RÀNG, KHÔNG BỊ TRÀN TEXT RA MÀN HÌNH REACT
            try
            {
                // THÊM .ToListAsync() ĐỂ TẢI DỮ LIỆU VÀO RAM TRƯỚC KHI XÓA (Sửa lỗi RemoveRange)
                var transactions = await _context.Transactions.Where(t => t.UserId == id).ToListAsync();
                _context.Transactions.RemoveRange(transactions);

                var goals = await _context.Goals.Where(g => g.UserId == id).ToListAsync();
                _context.Goals.RemoveRange(goals);

                var debts = await _context.Debts.Where(d => d.UserId == id).ToListAsync();
                _context.Debts.RemoveRange(debts);

                var investments = await _context.Investments.Where(i => i.UserId == id).ToListAsync();
                _context.Investments.RemoveRange(investments);

                // --- NẾU BẠN CÓ BẢNG BUDGETS HOẶC CATEGORIES, BỎ COMMENT ĐOẠN NÀY ĐỂ XÓA NỐT ---
                var budgets = await _context.Budgets.Where(b => b.UserId == id).ToListAsync();
                _context.Budgets.RemoveRange(budgets);
                
                //// Nếu bảng Categories của bạn có cột UserId (User tự tạo danh mục riêng)
                //var categories = await _context.Categories.Where(c => c.user == id).ToListAsync();
                //_context.Categories.RemoveRange(categories);


                // Cuối cùng mới xóa User
                _context.Users.Remove(user);
                await _context.SaveChangesAsync();

                return Ok(new { message = "Đã xóa thành công người dùng và toàn bộ dữ liệu liên quan!" });
            }
            catch (Exception ex)
            {
                // Nếu lỗi khóa ngoại vẫn còn, nó sẽ báo cực kỳ ngắn gọn thay vì dài dòng
                var errorMessage = ex.InnerException != null ? ex.InnerException.Message : ex.Message;
                return BadRequest($"Lỗi Database khi xóa: {errorMessage}");
            }
        }

        private bool UserExists(int id)
        {
            return _context.Users.Any(e => e.Id == id);
        }
    }
}
