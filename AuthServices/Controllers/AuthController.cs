using DTO.Authen;
using Entities;
using Libs.Auth;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using Ocelot.Values;
using Services.Authen;
using Repository;
using System.Security.Claims;
namespace AuthServices.Controllers
{
    [Microsoft.AspNetCore.Mvc.Route("api/[controller]")]
    [Microsoft.AspNetCore.Mvc.ApiController]
    public class AuthController : Microsoft.AspNetCore.Mvc.ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IConfiguration _configuration;
        private readonly SqlServerDbContext _context;
        private readonly string _secretKey;
        private const int TokenExpirationMinutes = 480;
        public AuthController(IUserService userService, IConfiguration configuration, SqlServerDbContext context)
        {
                _userService = userService;
                _configuration = configuration;
                _context = context;
                _secretKey = _configuration["Jwt:SecretKey"] ?? "default_secret_key_12345";
            }
        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto.LoginRequest request)
        {
            var identifier = request.Username ?? request.Email;
            if (request == null || string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            var user = await _userService.Authenticate(identifier, request.Password);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }
            var roleName = await _userService.ResolveRoleName(user.RoleId);
            var token = TokenHelper.GenerateToken(_secretKey, TokenExpirationMinutes, user.UserId.ToString(), user.Email, roleName, user.CinemaId);

            return Ok(new DTO.Authen.LoginDto.LoginResponse
            {
                Token = token,
                UserId = user.UserId.ToString(),
                RoleId = user.RoleId,
                CinemaId = user.CinemaId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                Role = roleName ?? "User",
                ExpiresIn = TokenExpirationMinutes * 60

            });
        }
        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto.RegisterRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request" });
            }

            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Full name, email and password are required" });
            }

            if (request.Password.Length < 6)
            {
                return BadRequest(new { message = "Password must be at least 6 characters" });
            }

            if (await _context.Users.AnyAsync(x => x.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            try
            {
                var user = new Users
                {
                    RoleId = request.RoleId,
                    CinemaId = request.CinemaId,
                    FullName = request.FullName,
                    Email = request.Email,
                    Phone = request.Phone,
                    DateOfBirth = request.DateOfBirth,
                    Gender = request.Gender,
                    AvatarUrl = request.AvatarUrl
                };

                var createdUser = await _userService.CreateAsync(user, request.Password,request.RoleId);
                return Ok(new { message = "Registration successful", userId = createdUser.UserId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Registration failed: " + ex.Message });
            }
        }

        public class UpdateProfileRequest
        {
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public string? AvatarUrl { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Gender { get; set; }
        }

        [Authorize]
        [HttpGet("profile")]
        public async Task<IActionResult> Profile()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimValue, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            var role = await _context.Roles.AsNoTracking().FirstOrDefaultAsync(x => x.RoleId == user.RoleId);

            return Ok(new
            {
                user.UserId,
                user.RoleId,
                user.CinemaId,
                user.FullName,
                user.Email,
                user.Phone,
                user.AvatarUrl,
                user.DateOfBirth,
                user.Gender,
                Role = role?.RoleName ?? "customer"
            });
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimValue, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            var user = await _context.Users.FirstOrDefaultAsync(x => x.UserId == userId);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                user.FullName = request.FullName.Trim();
            }

            user.Phone = request.Phone;
            user.AvatarUrl = request.AvatarUrl;
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = request.Gender;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return await Profile();
        }

    }
}

