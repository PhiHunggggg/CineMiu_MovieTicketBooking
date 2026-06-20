using DTO.Authen;
using Entities;
using Libs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;
using Services.Authen;
using System.Security.Claims;

namespace AuthServices.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly SqlServerDbContext _context;
        private readonly string _secretKey;
        private const int TokenExpirationMinutes = 480;

        public AuthController(IUserService userService, IConfiguration configuration, SqlServerDbContext context)
        {
            _userService = userService;
            _context = context;
            _secretKey = configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough";
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto.LoginRequest request)
        {
            var identifier = request?.Username ?? request?.Email;
            if (request == null || string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            var user = await _userService.Authenticate(identifier, request.Password);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            return Ok(await BuildAuthResponse(user));
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto.RegisterRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request" });
            }

            if (string.IsNullOrWhiteSpace(request.FullName) ||
                string.IsNullOrWhiteSpace(request.Email) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Full name, email and password are required" });
            }

            if (request.Password.Length < 6)
            {
                return BadRequest(new { message = "Password must be at least 6 characters" });
            }

            var email = request.Email.Trim();
            if (await _context.Users.AnyAsync(x => x.Email == email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            try
            {
                var roleId = request.RoleId == 0 ? (byte)1 : request.RoleId;
                var user = new Users
                {
                    RoleId = roleId,
                    CinemaId = request.CinemaId,
                    FullName = request.FullName.Trim(),
                    Email = email,
                    Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
                    DateOfBirth = request.DateOfBirth,
                    Gender = string.IsNullOrWhiteSpace(request.Gender) ? null : request.Gender.Trim(),
                    AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim()
                };

                var createdUser = await _userService.CreateAsync(user, request.Password, roleId);
                return Ok(await BuildAuthResponse(createdUser, "Registration successful"));
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Registration failed: " + ex.Message });
            }
        }

        [Authorize]
        [HttpGet("profile")]
        [HttpGet("me")]
        public async Task<IActionResult> Profile()
        {
            var user = await GetAuthenticatedUser();
            if (user == null)
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            return Ok(await BuildUserPayload(user));
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            var user = await GetAuthenticatedUser(trackChanges: true);
            if (user == null)
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            if (!string.IsNullOrWhiteSpace(request.FullName))
            {
                user.FullName = request.FullName.Trim();
            }

            user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
            user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = string.IsNullOrWhiteSpace(request.Gender) ? null : request.Gender.Trim();
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(await BuildUserPayload(user));
        }

        private async Task<object> BuildAuthResponse(Users user, string? message = null)
        {
            var roleName = await _userService.ResolveRoleName(user.RoleId) ?? "customer";
            var token = TokenHelper.GenerateToken(
                _secretKey,
                TokenExpirationMinutes,
                user.UserId.ToString(),
                user.Email,
                roleName,
                user.CinemaId);
            var payload = await BuildUserPayload(user, roleName);

            return new
            {
                message,
                token,
                user = payload,
                userId = user.UserId.ToString(),
                roleId = user.RoleId,
                cinemaId = user.CinemaId,
                fullName = user.FullName,
                email = user.Email,
                phone = user.Phone,
                avatarUrl = user.AvatarUrl,
                role = roleName,
                expiresIn = TokenExpirationMinutes * 60
            };
        }

        private async Task<object> BuildUserPayload(Users user, string? roleName = null)
        {
            roleName ??= await _userService.ResolveRoleName(user.RoleId) ?? "customer";
            return new
            {
                userId = user.UserId,
                id = user.UserId,
                roleId = user.RoleId,
                cinemaId = user.CinemaId,
                fullName = user.FullName,
                email = user.Email,
                phone = user.Phone,
                avatarUrl = user.AvatarUrl,
                dateOfBirth = user.DateOfBirth,
                gender = user.Gender,
                role = roleName
            };
        }

        private async Task<Users?> GetAuthenticatedUser(bool trackChanges = false)
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimValue, out var userId))
            {
                return null;
            }

            var query = trackChanges ? _context.Users.AsQueryable() : _context.Users.AsNoTracking();
            return await query.FirstOrDefaultAsync(x => x.UserId == userId);
        }

        public class UpdateProfileRequest
        {
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public string? AvatarUrl { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Gender { get; set; }
        }
    }
}
