
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.IdentityModel.Tokens;
using Project3_Personal_Finance.Models;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// WebApplication.CreateBuilder(args) tự động nạp User Secrets
// khi môi trường là Development và project có UserSecretsId.

// Cấu hình Database
builder.Services.AddDbContext<PersonalFinanceDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("DefaultConnection")
        ?? "Server=localhost;Database=PersonalFinanceDB;Trusted_Connection=True;TrustServerCertificate=True"
    ).ReplaceService<IModelCustomizer, LegacyDatabaseModelCustomizer>()
);

// Kiểm tra API Key Groq đã được nạp hay chưa.
// Không in giá trị API Key ra console.
var groqApiKey = builder.Configuration["GroqSettings:ApiKey"];

Console.WriteLine(
    $"Groq API Key loaded: {!string.IsNullOrWhiteSpace(groqApiKey)}"
);

// Đăng ký HttpClient cho Yahoo Finance
builder.Services.AddHttpClient("YahooFinance", client =>
{
    client.BaseAddress = new Uri("https://query1.finance.yahoo.com/");
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (compatible; PersonalFinanceApp/1.0)"
    );
    client.Timeout = TimeSpan.FromSeconds(10);
});

builder.Services.AddMemoryCache();

// Controllers và JSON
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler =
            System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles;
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS cho React
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactPolicy", policy =>
    {
        policy.WithOrigins("http://localhost:3000")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Cấu hình JWT
var jwtKey = builder.Configuration["Jwt:Key"];

if (string.IsNullOrWhiteSpace(jwtKey))
{
    throw new InvalidOperationException(
        "Chưa cấu hình Jwt:Key trong appsettings.json hoặc User Secrets."
    );
}

builder.Services.AddAuthentication(
    JwtBearerDefaults.AuthenticationScheme
)
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(jwtKey)
        ),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

// Kiểm tra kết nối SQL Server
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;

    try
    {
        var context =
            services.GetRequiredService<PersonalFinanceDbContext>();

        context.Database.OpenConnection();

        Console.WriteLine(
            "\n================================================="
        );
        Console.WriteLine("KET NOI DATABASE THANH CONG!");
        Console.WriteLine(
            "=================================================\n"
        );

        context.Database.CloseConnection();
    }
    catch (Exception ex)
    {
        Console.WriteLine(
            "\n================================================="
        );
        Console.WriteLine("LOI KET NOI SQL SERVER:");
        Console.WriteLine(ex.Message);
        Console.WriteLine(
            "=================================================\n"
        );
    }
}

// Swagger
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Middleware
app.UseHttpsRedirection();

app.UseCors("ReactPolicy");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();

internal sealed class LegacyDatabaseModelCustomizer : ModelCustomizer
{
    public LegacyDatabaseModelCustomizer(
        ModelCustomizerDependencies dependencies
    ) : base(dependencies)
    {
    }

    public override void Customize(
        ModelBuilder modelBuilder,
        DbContext context
    )
    {
        base.Customize(modelBuilder, context);

        modelBuilder.Entity<Investment>()
            .Ignore(investment => investment.Quantity);

        var transaction = modelBuilder.Entity<Transaction>();

        var idempotencyKey = transaction.Metadata.FindProperty(
            nameof(Transaction.IdempotencyKey)
        );

        if (idempotencyKey != null)
        {
            var idempotencyIndex =
                transaction.Metadata.FindIndex([idempotencyKey]);

            if (idempotencyIndex != null)
            {
                transaction.Metadata.RemoveIndex(idempotencyIndex);
            }
        }

        transaction.Ignore(item => item.IdempotencyKey);
        transaction.Ignore(item => item.Quantity);
        transaction.Ignore(item => item.UnitPrice);
        transaction.Ignore(item => item.RealizedProfitLoss);
    }
}
