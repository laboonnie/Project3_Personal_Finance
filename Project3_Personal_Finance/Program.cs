using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<PersonalFinanceDbContext>(options => options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Server=localhost;Database=PersonalFinanceDB;Trusted_Connection=True;TrustServerCertificate=True"));
// Add services to the container.

builder.Services.AddControllers();
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

var app = builder.Build();
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Configure the HTTP request pipeline.
app.UseCors("ReactPolicy");

app.UseAuthorization();

app.MapControllers();

app.Run();
