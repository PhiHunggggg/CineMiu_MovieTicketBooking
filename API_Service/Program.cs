using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.Data.SqlClient;
using Microsoft.OpenApi.Models;
using Entities;
using Repository;
using Repository.EFCore.Theater;
using Services.Theater;
using Services.Booking;
using Services.Loyalty;
using Repository.EFCore.Bookings;
using Repository.EFCore.Administration;
using Repository.EFCore.Concessions;
using Repository.EFCore.Pricing;
using Repository.EFCore.Reports;
using Repository.EFCore.Authen;
using Services.Authen;
using Services.Administration;
using Services.Concessions;
using Services.Pricing;
using Services.Reports;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys")));

builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IShowtimeService, ShowtimeService>();
builder.Services.AddScoped<ICinemaService, CinemaService>();
builder.Services.AddScoped<IHallService, HallService>();
builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookkingService>();
// Register EFCore theater repositories
builder.Services.AddScoped<IMovieRepository, MovieRepository>();
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<ICinemaRepository, CinemaRepository>();
builder.Services.AddScoped<IHallRepository, HallRepository>();
builder.Services.AddScoped<IConcessionRepository, ConcessionRepository>();
builder.Services.AddScoped<IConcessionService, ConcessionService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<IAdminSystemRepository, AdminSystemRepository>();
builder.Services.AddScoped<IAdminSystemService, AdminSystemService>();
builder.Services.AddScoped<ITicketPriceRepository, TicketPriceRepository>();
builder.Services.AddScoped<ITicketPriceService, TicketPriceService>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IReportService, ReportService>();
var foodClientPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, "..", "BaseCore.Food"));

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    });

builder.Services.AddEndpointsApiExplorer();

// Swagger Configuration
builder.Services.AddSwaggerGen();

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

//MySQL Configuration with EF Core
//var connectionString = builder.Configuration.GetConnectionString("MySQL")
//    ?? "Server=localhost;Database=BaseCoreSales;User=root;Password=;";
//builder.Services.AddDbContext<MySqlDbContext>(options =>
//    options.UseMySql(connectionString, ServerVersion.AutoDetect(connectionString)));



var useInMemoryDatabase = builder.Configuration.GetValue("UseInMemoryDatabase", true);
var connectionString = useInMemoryDatabase
    ? null
    : BuildSqlServerConnectionString(builder.Configuration, "ConnectedDb");
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


// JWT Authentication
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

await EnsureCinemaRolesAsync(app.Services);
await EnsureAdminUserAsync(app.Services);
await EnsureShowtimesAsync(app.Services);



// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

if (Directory.Exists(foodClientPath))
{
    var foodClientProvider = new PhysicalFileProvider(foodClientPath);
    app.UseDefaultFiles(new DefaultFilesOptions
    {
        FileProvider = foodClientProvider
    });
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = foodClientProvider
    });
}

app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    Console.WriteLine($"Cinema Booking API Service running at {string.Join(", ", app.Urls)}");
    Console.WriteLine("Endpoints: /api/movies, /api/cinemas, /api/showtimes, /api/bookings");
});

app.Run();

static async Task EnsureCinemaRolesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();
        var existingRoles = await db.CinemaRoles.ToListAsync();
        var requiredRoles = new[]
        {
            new CinemaRole { RoleId = 1, RoleName = "customer", Description = "Khach hang dat ve truc tuyen" },
            new CinemaRole { RoleId = 2, RoleName = "ticket_staff", Description = "Nhan vien soat ve tai rap" },
            new CinemaRole { RoleId = 3, RoleName = "cinema_manager", Description = "Quan ly rap chieu phim" },
            new CinemaRole { RoleId = 4, RoleName = "admin", Description = "Quan tri vien he thong" }
        };

        foreach (var requiredRole in requiredRoles)
        {
            var existingByName = existingRoles.FirstOrDefault(x =>
                string.Equals(x.RoleName, requiredRole.RoleName, StringComparison.OrdinalIgnoreCase));
            if (existingByName != null)
            {
                existingByName.Description ??= requiredRole.Description;
                continue;
            }

            if (existingRoles.Any(x => x.RoleId == requiredRole.RoleId))
            {
                Console.WriteLine($"Skipping role seed for {requiredRole.RoleName}: role id {requiredRole.RoleId} is already used.");
                continue;
            }

            db.CinemaRoles.Add(requiredRole);
            existingRoles.Add(requiredRole);
        }

        await db.SaveChangesAsync();
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Skipping cinema role seed because database is not ready: {ex.Message}");
    }
}

static async Task EnsureAdminUserAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    try
    {
        var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();

        if (!await db.CinemaUsers.AnyAsync(u => u.Email == "admin@basecore.local"))
        {
            db.CinemaUsers.Add(new CinemaUser
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

            await db.SaveChangesAsync();
            Console.WriteLine("Admin user created: admin@basecore.local / admin123");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Skipping admin seed because database is not ready: {ex.Message}");
    }
}

static async Task EnsureShowtimesAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    try
    {
        var showtimeService = scope.ServiceProvider.GetRequiredService<IShowtimeService>();
        var result = await showtimeService.GenerateUpcomingAsync(5);
        var created = (result as System.Collections.ICollection)?.Count ?? 0;
        Console.WriteLine($"Showtime auto-generation: created {created}, skipped 0 for 5 days.");
    }
    catch (Exception ex)
    {
        Console.WriteLine($"Skipping showtime auto-generation because database is not ready: {ex.Message}");
    }
}

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
