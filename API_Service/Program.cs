using Repository;
using Services;
using Entities;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi;
using Services.Theater;
using System.Text;
using Repository.EFCore.Theater;
using Services.Booking;
using Repository.EFCore.Bookings;


var builder = WebApplication.CreateBuilder(args);


builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();

builder.Services.AddDataProtection()
    .PersistKeysToFileSystem(new DirectoryInfo(Path.Combine(builder.Environment.ContentRootPath, "App_Data", "DataProtectionKeys")));

builder.Services.AddScoped<IMovieService, MovieService>();
builder.Services.AddScoped<IMovieRepository, MovieRepository>();
builder.Services.AddScoped<ICinemaService, CinemaService>();
builder.Services.AddScoped<ICinemaRepository, CinemaRepository>();
builder.Services.AddScoped<IHallService, HallService>();
builder.Services.AddScoped<IHallRepository, HallRepository>();
builder.Services.AddScoped<IShowtimeService, ShowtimeService>();
builder.Services.AddScoped<IShowtimeRepository, ShowtimeRepository>();
builder.Services.AddScoped<IBookingService, BookkingService>();
builder.Services.AddScoped<IBookingRepository, BookingRepository>();

//builder.Services.AddScoped<ILoyaltyService, LoyaltyService>();
//builder.Services.AddScoped<IBookingRepository, BookingRepository>();
//builder.Services.AddScoped<IBookingService, BookingService>();

// Add services to the container
builder.Services.AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
        options.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
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

builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Cinema Booking API Service",
        Version = "v1",
        Description = "Cinema ticket booking backend"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT token",
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        BearerFormat = "JWT",
        Scheme = "bearer"
    });
    c.AddSecurityRequirement(doc => new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecuritySchemeReference("Bearer"),
            new List<string>()
        }
    });
});

// CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});





var connectionString = builder.Configuration.GetConnectionString("ConnectedDb")
    ?? "Server=(localdb)\\MSSQLLocalDB;Database=BaseCoreBookingMovie;Trusted_Connection=True;TrustServerCertificate=True;Encrypt=False";
var useInMemoryDatabase = builder.Configuration.GetValue("UseInMemoryDatabase", true);
builder.Services.AddDbContext<SqlServerDbContext>(options =>
{
    if (useInMemoryDatabase)
    {
        options.UseInMemoryDatabase("BaseCoreBookingMovie");
    }
    else
    {
        options.UseSqlServer(connectionString, sql => sql.EnableRetryOnFailure());
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


app.UseCors("AllowAll");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

await SeedLookupsAsync(app.Services);

Console.WriteLine("Cinema Booking API Service running on port 5001");
Console.WriteLine("Endpoints: /api/movies, /api/cinemas, /api/showtimes, /api/bookings");
app.Run();

static async Task SeedLookupsAsync(IServiceProvider services)
{
    using var scope = services.CreateScope();
    var context = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();
    var now = DateTime.UtcNow;

    if (!await context.Countries.AnyAsync())
    {
        context.Countries.AddRange(
            new Country { CountryName = "Vietnam", CountryCode = "VN" },
            new Country { CountryName = "United States", CountryCode = "US" },
            new Country { CountryName = "South Korea", CountryCode = "KR" },
            new Country { CountryName = "Japan", CountryCode = "JP" },
            new Country { CountryName = "China", CountryCode = "CN" },
            new Country { CountryName = "Thailand", CountryCode = "TH" },
            new Country { CountryName = "France", CountryCode = "FR" }
        );
    }

    if (!await context.Chains.AnyAsync())
    {
        context.Chains.AddRange(
            new Chain { ChainName = "CineMiu", LogoUrl = null, Website = "https://cinemiu.local" },
            new Chain { ChainName = "Galaxy Cinema", LogoUrl = null, Website = "https://www.galaxycine.vn" },
            new Chain { ChainName = "CGV", LogoUrl = null, Website = "https://www.cgv.vn" }
        );
    }

    if (!await context.HallTypes.AnyAsync())
    {
        context.HallTypes.AddRange(
            new HallType { HallTypeId = 1, TypeName = "2D", Description = "Phong chieu tieu chuan", SurchargePct = 0 },
            new HallType { HallTypeId = 2, TypeName = "3D", Description = "Phong chieu 3D", SurchargePct = 15 },
            new HallType { HallTypeId = 3, TypeName = "IMAX", Description = "Phong chieu IMAX", SurchargePct = 30 },
            new HallType { HallTypeId = 4, TypeName = "4DX", Description = "Phong chieu 4DX", SurchargePct = 35 }
        );
    }

    if (!await context.SeatTypes.AnyAsync())
    {
        context.SeatTypes.AddRange(
            new SeatType
            {
                SeatTypeId = 1,
                TypeName = "Standard",
                Description = "Ghe tieu chuan",
                PriceModifier = 0,
                CreatedAt = now,
                UpdatedAt = now
            },
            new SeatType
            {
                SeatTypeId = 2,
                TypeName = "VIP",
                Description = "Ghe VIP",
                PriceModifier = 20000,
                CreatedAt = now,
                UpdatedAt = now
            },
            new SeatType
            {
                SeatTypeId = 3,
                TypeName = "Couple",
                Description = "Ghe doi",
                PriceModifier = 45000,
                CreatedAt = now,
                UpdatedAt = now
            }
        );
    }

    await context.SaveChangesAsync();

    if (!await context.Cinemas.AnyAsync())
    {
        var cinemiuChainId = await context.Chains
            .Where(x => x.ChainName == "CineMiu")
            .Select(x => x.ChainId)
            .FirstAsync();

        context.Cinemas.AddRange(
            new Cinema
            {
                ChainId = cinemiuChainId,
                CinemaName = "CineMiu Nguyen Trai",
                Address = "123 Nguyen Trai",
                City = "Ho Chi Minh",
                District = "Ben Thanh",
                Phone = "02812345678",
                Email = "nguyentrai@cinemiu.local",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            },
            new Cinema
            {
                ChainId = cinemiuChainId,
                CinemaName = "CineMiu Cau Giay",
                Address = "45 Cau Giay",
                City = "Ha Noi",
                District = "Quan Hoa",
                Phone = "02412345678",
                Email = "caugiay@cinemiu.local",
                IsActive = true,
                CreatedAt = now,
                UpdatedAt = now
            }
        );
    }

    var defaultGenres = new[]
    {
        (GenreId: (byte)1, GenreName: "Hài", Description: "Phim hài"),
        (GenreId: (byte)2, GenreName: "Hành động", Description: "Phim hành động"),
        (GenreId: (byte)3, GenreName: "Hoạt hình", Description: "Phim hoạt hình"),
        (GenreId: (byte)4, GenreName: "Kinh dị", Description: "Phim kinh dị"),
        (GenreId: (byte)5, GenreName: "Tâm lý", Description: "Phim tâm lý"),
        (GenreId: (byte)6, GenreName: "Tình cảm", Description: "Phim tình cảm"),
        (GenreId: (byte)7, GenreName: "Viễn tưởng", Description: "Phim viễn tưởng"),
        (GenreId: (byte)8, GenreName: "Phiêu lưu", Description: "Phim phiêu lưu"),
        (GenreId: (byte)9, GenreName: "Chính kịch", Description: "Phim chính kịch"),
        (GenreId: (byte)10, GenreName: "Giật gân", Description: "Phim giật gân"),
        (GenreId: (byte)11, GenreName: "Tội phạm", Description: "Phim tội phạm"),
        (GenreId: (byte)12, GenreName: "Gia đình", Description: "Phim gia đình"),
        (GenreId: (byte)13, GenreName: "Âm nhạc", Description: "Phim âm nhạc"),
        (GenreId: (byte)14, GenreName: "Thần thoại", Description: "Phim thần thoại"),
        (GenreId: (byte)15, GenreName: "Lịch sử", Description: "Phim lịch sử"),
        (GenreId: (byte)16, GenreName: "Chiến tranh", Description: "Phim chiến tranh"),
        (GenreId: (byte)17, GenreName: "Tài liệu", Description: "Phim tài liệu"),
        (GenreId: (byte)18, GenreName: "Bí ẩn", Description: "Phim bí ẩn"),
        (GenreId: (byte)19, GenreName: "Võ thuật", Description: "Phim võ thuật"),
        (GenreId: (byte)20, GenreName: "Cổ trang", Description: "Phim cổ trang")
    };

    var existingGenres = await context.Genres.ToDictionaryAsync(x => x.GenreId);
    foreach (var defaultGenre in defaultGenres)
    {
        if (existingGenres.TryGetValue(defaultGenre.GenreId, out var genre))
        {
            genre.GenreName = defaultGenre.GenreName;
            genre.Description = defaultGenre.Description;
            genre.UpdatedAt = now;
            continue;
        }

        context.Genres.Add(new Genre
        {
            GenreId = defaultGenre.GenreId,
            GenreName = defaultGenre.GenreName,
            Description = defaultGenre.Description,
            CreatedAt = now,
            UpdatedAt = now
        });
    }

    await context.SaveChangesAsync();
}
