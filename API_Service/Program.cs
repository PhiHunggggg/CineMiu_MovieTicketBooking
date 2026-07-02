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
using Repository.EFCore.Loyalty;
using Repository.EFCore.Pricing;
using Repository.EFCore.Product;
using Repository.EFCore.Promotion;
using Repository.EFCore.Reports;
using Repository.EFCore.Authen;
using Services.Authen;
using Services.Administration;
using Services.Concessions;
using Services.Pricing;
using Services.Product;
using Services.Promotion;
using Services.Reports;
using System.Text;
using API_Service.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys")));

builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<ICategoriesService, CategoriesService>();
builder.Services.AddScoped<IShowtimeService, ShowtimeService>();
builder.Services.AddScoped<ICinemaService, CinemaService>();
builder.Services.AddScoped<ICinemaLookupService, CinemaLookupService>();
builder.Services.AddScoped<IHallService, HallService>();
builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
builder.Services.AddScoped<ILoyaltyRepository, LoyaltyRepository>();
builder.Services.AddScoped<IPromotionRepository, PromotionRepository>();
builder.Services.AddScoped<IPromotionService, PromotionService>();
builder.Services.AddScoped<IProductRepository, ProductRepository>();
builder.Services.AddScoped<IProductService, ProductService>();
builder.Services.AddScoped<ICategoryRepository, CategoryRepository>();
builder.Services.AddScoped<ICategoryService, CategoryService>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();
builder.Services.AddScoped<IBookingService, BookkingService>();
// Register EFCore theater repositories
builder.Services.AddScoped<IMovieRepository, MovieRepository>();
builder.Services.AddScoped<ICategoriesRepository, CategoriesRepository>();
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<ICinemaRepository, CinemaRepository>();
builder.Services.AddScoped<ICinemaLookupRepository, CinemaLookupRepository>();
builder.Services.AddScoped<IHallRepository, HallRepository>();
builder.Services.AddScoped<IConcessionRepository, ConcessionRepository>();
builder.Services.AddScoped<IConcessionService, ConcessionService>();
builder.Services.AddScoped<INotificationRepository, NotificationRepository>();
builder.Services.AddScoped<INotificationService, NotificationService>();
builder.Services.AddScoped<IReviewRepository, ReviewRepository>();
builder.Services.AddScoped<IReviewService, ReviewService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<ICinemaUserRepository, CinemaUserRepository>();
builder.Services.AddScoped<ICinemaUserService, CinemaUserService>();
builder.Services.AddScoped<IAdminSystemRepository, AdminSystemRepository>();
builder.Services.AddScoped<IAdminSystemService, AdminSystemService>();
builder.Services.AddScoped<ITicketPriceRepository, TicketPriceRepository>();
builder.Services.AddScoped<ITicketPriceService, TicketPriceService>();
builder.Services.AddScoped<IReportRepository, ReportRepository>();
builder.Services.AddScoped<IReportService, ReportService>();
builder.Services.AddScoped<IRoleRepository, RoleRepository>();
builder.Services.Configure<NotificationApiOptions>(
    builder.Configuration.GetSection(NotificationApiOptions.SectionName));
builder.Services.AddHttpClient<IEmailSender, PhpEmailSender>(client =>
{
    // Gmail SMTP can take more than 15 seconds to negotiate TLS and authenticate,
    // especially on the first connection after the PHP process starts.
    client.Timeout = TimeSpan.FromSeconds(60);
});
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
builder.Services.AddSwaggerGen(options =>
{
    options.CustomSchemaIds(type =>
        type.FullName!.Replace("+", "."));
});
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
app.UseMiddleware<ExceptionHandlingMiddleware>();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

app.Lifetime.ApplicationStarted.Register(() =>
{
    Console.WriteLine($"Cinema Booking API Service running at {string.Join(", ", app.Urls)}");
    Console.WriteLine("Endpoints: /api/movies, /api/cinemas, /api/showtimes, /api/bookings");
});

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
