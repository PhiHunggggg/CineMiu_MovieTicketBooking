using Common;
using Entities;
using Repository;
using Services.Authen;
using Libs.Auth;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly SqlServerDbContext _context;
        private const string SecretKey = "YourSecretKeyForAuthenticationShouldBeLongEnough";
        private const int TokenExpirationMinutes = 480;

        public AuthController(IUserService userService, SqlServerDbContext context)
        {
            _userService = userService;
            _context = context;
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            var identifier = request?.Email ?? request?.Username;
            if (request == null || string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            var user = await _userService.Authenticate(identifier, request.Password);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            var roleName = await ResolveRoleName(user.RoleId);
            var token = TokenHelper.GenerateToken(
                SecretKey,
                TokenExpirationMinutes,
                user.UserId.ToString(),
                user.Email,
                roleName,
                user.CinemaId);

            return Ok(new LoginResponse
            {
                Token = token,
                UserId = user.UserId.ToString(),
                RoleId = user.RoleId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                Role = roleName,
                ExpiresIn = TokenExpirationMinutes * 60
            });
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
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

            if (await _context.CinemaUsers.AnyAsync(x => x.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            try
            {
                var user = new Users
                {
                    RoleId = request.RoleId ?? 1,
                    FullName = request.FullName,
                    Email = request.Email,
                    Phone = request.Phone,
                    DateOfBirth = request.DateOfBirth,
                    Gender = request.Gender,
                    AvatarUrl = request.AvatarUrl,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                var createdUser = await _userService.CreateAsync(user, request.Password, request.RoleId.GetValueOrDefault(1));
                return Ok(new { message = "Registration successful", userId = createdUser.UserId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Registration failed: " + ex.Message });
            }
        }

        private async Task<string> ResolveRoleName(byte roleId)
        {
            return await _context.CinemaRoles
                .Where(x => x.RoleId == roleId)
                .Select(x => x.RoleName)
                .FirstOrDefaultAsync() ?? "customer";
        }
    }

    public class LoginRequest
    {
        public string? Username { get; set; }
        public string? Email { get; set; }
        public string Password { get; set; } = "";
    }

    public class LoginResponse
    {
        public string Token { get; set; } = "";
        public string UserId { get; set; } = "";
        public byte RoleId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public string Role { get; set; } = "";
        public int ExpiresIn { get; set; }
    }

    public class RegisterRequest
    {
        public byte? RoleId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
