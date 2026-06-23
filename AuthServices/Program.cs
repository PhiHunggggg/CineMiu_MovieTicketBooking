using Entities;
using Repository;
using Repository.EFCore.Authen;
using Services.Authen;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Data.SqlClient;
using Microsoft.OpenApi.Models;
using Libs.Auth;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys")));

builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    });
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

builder.Services.AddSwaggerGen();

var useInMemoryDatabase = builder.Configuration.GetValue("UseInMemoryDatabase", true);
var connectionString = useInMemoryDatabase
    ? null
    : BuildSqlServerConnectionString(builder.Configuration, "SqlServerConnection");
builder.Services.AddDbContext<SqlServerDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase("BaseCoreBookingMovie");
    }
    else
    {
        options.UseSqlServer(connectionString!, sql => sql.EnableRetryOnFailure());
    }
});

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();

var key = Encoding.ASCII.GetBytes(builder.Configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
builder.Services.AddAuthentication(x =>
{
    x.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    x.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false
    };
});

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();

        if (!db.Roles.Any())
        {
            db.Roles.AddRange(
                new Role { RoleId = 1, RoleName = "customer", Description = "Khach hang dat ve truc tuyen" },
                new Role { RoleId = 2, RoleName = "ticket_staff", Description = "Nhan vien soat ve tai rap" },
                new Role { RoleId = 3, RoleName = "cinema_manager", Description = "Quan ly rap chieu phim" },
                new Role { RoleId = 4, RoleName = "admin", Description = "Quan tri vien he thong" });
            db.SaveChanges();
        }

        if (!db.Users.Any(u => u.Email == "admin@basecore.local"))
        {
            db.Users.Add(new Users
            {
                RoleId = 4,
                FullName = "Administrator",
                Email = "admin@basecore.local",
                Phone = "0123456789",
                PasswordHash = TokenHelper.HashPasswordForStorage("admin123"),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });
            db.SaveChanges();
            Console.WriteLine("Admin user created: admin@basecore.local / admin123");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Skipping auth seed because database is not ready: {ex.Message}");
    }
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Console.WriteLine("BaseCore Auth Service running on port 5002");
Console.WriteLine("Endpoints: /api/auth, /api/users, /api/roles");
app.Run();

static string BuildSqlServerConnectionString(IConfiguration configuration, string connectionStringName)
{
    if (!configuration.GetValue("SqlServerAuth:Enabled", false))
    {
        return configuration.GetConnectionString(connectionStringName)
            ?? "Server=DESKTOP-FNMVI5L;Database=BaseCoreBookingMovie;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False";
    }

    var userId = Environment.GetEnvironmentVariable("CINEMIU_DB_USER")
        ?? configuration["SqlServerAuth:UserId"];
    var password = Environment.GetEnvironmentVariable("CINEMIU_DB_PASSWORD")
        ?? configuration["SqlServerAuth:Password"];

    if (string.IsNullOrWhiteSpace(userId))
    {
        throw new InvalidOperationException("SqlServerAuth:UserId or CINEMIU_DB_USER must be set when SQL Server authentication is enabled.");
    }

    if (string.IsNullOrWhiteSpace(password))
    {
        throw new InvalidOperationException("SqlServerAuth:Password or CINEMIU_DB_PASSWORD must be set when SQL Server authentication is enabled.");
    }

    var sqlConnection = new SqlConnectionStringBuilder
    {
        DataSource = configuration["SqlServerAuth:Server"] ?? "DESKTOP-FNMVI5L",
        InitialCatalog = configuration["SqlServerAuth:Database"] ?? "BaseCoreBookingMovie",
        UserID = userId,
        Password = password,
        IntegratedSecurity = false,
        TrustServerCertificate = true
    };
    sqlConnection["Encrypt"] = false;

    return sqlConnection.ConnectionString;
}
