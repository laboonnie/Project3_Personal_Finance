using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Project3_Personal_Finance.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") ??
    "Server=localhost;Port=3306;Database=personalfinancedb;User=root;Password=;";

builder.Services.AddDbContext<PersonalFinanceDbContext>(options =>
    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));
// Add services to the container.

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        // Lệnh này giúp cắt đứt vòng lặp vô tận khi gửi dữ liệu có chứa khóa ngoại (JOIN)
        options.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy",
        policy =>
        {
            policy.WithOrigins("http://localhost:3000") // React port
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// Cấu hình JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8
                .GetBytes(builder.Configuration.GetSection("Jwt:Key").Value!)),
            ValidateIssuer = false,
            ValidateAudience = false
        };
    });

var app = builder.Build();

// --- BẮT ĐẦU ĐOẠN CODE TEST KẾT NỐI ---
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<PersonalFinanceDbContext>();

        // Dùng lệnh này để ép mở kết nối, nếu lỗi nó sẽ văng thẳng xuống catch
        context.Database.OpenConnection();

        Console.WriteLine("\n=================================================");
        Console.WriteLine("✅ KẾT NỐI DATABASE THÀNH CÔNG RỰC RỠ!");
        Console.WriteLine("=================================================\n");

        context.Database.CloseConnection();
    }
    catch (Exception ex)
    {
        Console.WriteLine("\n=================================================");
        Console.WriteLine("❌ LỖI GỐC CỦA SQL SERVER LÀ: ");
        Console.WriteLine(ex.Message); // IN RA CHI TIẾT LỖI
        Console.WriteLine("=================================================\n");
    }
}
// --- KẾT THÚC ĐOẠN CODE TEST KẾT NỐI ---

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Configure the HTTP request pipeline.
app.UseHttpsRedirection();

app.UseCors("ReactPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
