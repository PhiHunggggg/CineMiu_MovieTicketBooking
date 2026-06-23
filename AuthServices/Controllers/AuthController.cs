using DTO.Authen;
using Entities;
using Libs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ocelot.Values;
using Repository;
using Services.Authen;
using System.Security.Claims;
using static DTO.Authen.UserDto;
namespace AuthServices.Controllers
{
    [Microsoft.AspNetCore.Mvc.Route("api/auth")]
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
            if (request == null)
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            var identifier = request.Username ?? request.Email;
            if (string.IsNullOrWhiteSpace(identifier) || string.IsNullOrWhiteSpace(request.Password))
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

            if (await _context.Users.AnyAsync(x => x.Email == request.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            try
            {
                const byte customerRoleId = 1;
                var user = new Users
                {
                    RoleId = customerRoleId,
                    CinemaId = null,
                    FullName = request.FullName,
                    Email = request.Email,
                    Phone = request.Phone,
                    DateOfBirth = request.DateOfBirth,
                    Gender = request.Gender,
                    AvatarUrl = request.AvatarUrl
                };

                var createdUser = await _userService.CreateAsync(user, request.Password, customerRoleId);
                return Ok(new { message = "Registration successful", userId = createdUser.UserId });
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
            try{
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimValue, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }
            return Ok(await _userService.GetProfile(userId));
            }
            catch
            {
                return NotFound("Không tìm thấy User hoặc user ko hợp lệ !");
            }
        }

        [Authorize]
        [HttpPut("profile")]
<<<<<<< HEAD
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

        [Authorize]
        [HttpPut("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.CurrentPassword) ||
                string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return BadRequest(new { message = "Current password and new password are required" });
            }

            if (request.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "New password must be at least 6 characters" });
            }

            var user = await GetAuthenticatedUser(trackChanges: true);
            if (user == null)
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            if (!TokenHelper.IsValidStoredPassword(request.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            await _userService.UpdateAsync(user, request.NewPassword);
            return Ok(new { message = "Password changed successfully" });
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
=======
        public async Task<IActionResult> UpdateProfile([FromBody] UserRequest request)
>>>>>>> origin/develop
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(claimValue, out var userId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            await _userService.UpdateUserAsync(userId, request);
            return await Profile();
        }

<<<<<<< HEAD
        public class UpdateProfileRequest
        {
            public string? FullName { get; set; }
            public string? Phone { get; set; }
            public string? AvatarUrl { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Gender { get; set; }
        }

        public class ChangePasswordRequest
        {
            public string CurrentPassword { get; set; } = "";
            public string NewPassword { get; set; } = "";
        }
=======
>>>>>>> origin/develop
    }
}

