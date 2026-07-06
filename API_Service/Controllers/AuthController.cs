using Common;
using Entities;
using Repository.EFCore.Authen;
using Services.Authen;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace APIService.Controllers
{
    [Route("api/auth")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly IUserService _userService;
        private readonly IUserRepository _userRepository;
        private readonly IConfiguration _configuration;

        public AuthController(IUserService userService, IUserRepository userRepository, IConfiguration configuration)
        {
            _userService = userService;
            _userRepository = userRepository;
            _configuration = configuration;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Full name, email and password are required" });
            }

            if (await _userRepository.EmailExistsAsync(dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            var user = new CinemaUser
            {
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            var createdUser = await _userService.CreateAsync(user, dto.Password, 1);
            var roleName = await _userService.ResolveRoleName(createdUser.RoleId) ?? "customer";
            var token = GenerateJwtToken(createdUser, roleName);

            return Ok(new
            {
                token,
                role = roleName,
                user = new
                {
                    createdUser.UserId,
                    createdUser.RoleId,
                    cinemaId = createdUser.CinemaId,
                    createdUser.FullName,
                    createdUser.Email,
                    createdUser.Phone,
                    createdUser.AvatarUrl,
                    createdUser.DateOfBirth,
                    createdUser.Gender,
                    createdUser.IsActive
                }
            });
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return BadRequest(new { message = "Email and password are required" });
            }

            var user = await _userService.Authenticate(dto.Email, dto.Password);
            if (user == null)
            {
                return Unauthorized(new { message = "Invalid email or password" });
            }

            var roleName = await _userService.ResolveRoleName(user.RoleId) ?? "customer";
            var token = GenerateJwtToken(user, roleName);

            return Ok(new
            {
                token,
                role = roleName,
                user = new
                {
                    user.UserId,
                    user.RoleId,
                    cinemaId = user.CinemaId,
                    user.FullName,
                    user.Email,
                    user.Phone,
                    user.AvatarUrl,
                    user.DateOfBirth,
                    user.Gender,
                    user.IsActive
                }
            });
        }

        [HttpGet("me")]
        [HttpGet("profile")]
        public async Task<IActionResult> GetProfile()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            var token = authHeader.Substring("Bearer ".Length);
            var userId = ValidateTokenAndGetUserId(token);
            if (userId == null)
            {
                return Unauthorized(new { message = "Token expired or invalid" });
            }

            var user = await _userService.GetById(userId.Value);
            if (user == null || !user.IsActive)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(new
            {
                user.UserId,
                user.RoleId,
                cinemaId = user.CinemaId,
                user.FullName,
                user.Email,
                user.Phone,
                user.AvatarUrl,
                user.DateOfBirth,
                user.Gender,
                user.IsActive
            });
        }

        [HttpPut("password")]
        public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CurrentPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
            {
                return BadRequest(new { message = "Current password and new password are required" });
            }

            if (dto.NewPassword.Length < 6)
            {
                return BadRequest(new { message = "New password must contain at least 6 characters" });
            }

            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            var userId = ValidateTokenAndGetUserId(authHeader.Substring("Bearer ".Length));
            var user = userId.HasValue ? await _userService.GetById(userId.Value) : null;
            if (user == null)
            {
                return Unauthorized(new { message = "Token expired or invalid" });
            }

            if (!TokenHelper.IsValidStoredPassword(dto.CurrentPassword, user.PasswordHash))
            {
                return BadRequest(new { message = "Current password is incorrect" });
            }

            await _userService.UpdateAsync(user, dto.NewPassword);
            return Ok(new { message = "Password changed successfully" });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized(new { message = "Invalid token" });
            }

            var token = authHeader.Substring("Bearer ".Length);
            var userId = ValidateTokenAndGetUserId(token);
            if (userId == null)
            {
                return Unauthorized(new { message = "Token expired or invalid" });
            }

            var user = await _userService.GetById(userId.Value);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.FullName = dto.FullName ?? user.FullName;
            user.Phone = dto.Phone ?? user.Phone;
            user.DateOfBirth = dto.DateOfBirth ?? user.DateOfBirth;
            user.Gender = dto.Gender ?? user.Gender;
            user.AvatarUrl = dto.AvatarUrl ?? user.AvatarUrl;

            await _userService.UpdateAsync(user, null);

            return Ok(new
            {
                user.UserId,
                user.RoleId,
                user.FullName,
                user.Email,
                user.Phone,
                user.AvatarUrl,
                user.DateOfBirth,
                user.Gender,
                user.IsActive
            });
        }

        private string GenerateJwtToken(CinemaUser user, string roleName)
        {
            var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
            var tokenHandler = new JwtSecurityTokenHandler();

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Name, user.FullName),
                new Claim(ClaimTypes.Role, roleName)
            };

            if (user.CinemaId.HasValue)
            {
                claims.Add(new Claim("cinemaId", user.CinemaId.Value.ToString()));
            }

            var descriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(7),
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(descriptor);
            return tokenHandler.WriteToken(token);
        }

        private int? ValidateTokenAndGetUserId(string token)
        {
            try
            {
                var key = Encoding.ASCII.GetBytes(_configuration["Jwt:SecretKey"] ?? "YourSecretKeyForAuthenticationShouldBeLongEnough");
                var tokenHandler = new JwtSecurityTokenHandler();
                var principal = tokenHandler.ValidateToken(token, new TokenValidationParameters
                {
                    ValidateIssuerSigningKey = true,
                    IssuerSigningKey = new SymmetricSecurityKey(key),
                    ValidateIssuer = false,
                    ValidateAudience = false,
                    ClockSkew = TimeSpan.Zero
                }, out _);

                var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
                return userIdClaim != null ? int.Parse(userIdClaim.Value) : null;
            }
            catch
            {
                return null;
            }
        }
    }

    public class RegisterDto
    {
        public byte? RoleId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
    }

    public class LoginDto
    {
        public string Email { get; set; } = "";
        public string Password { get; set; } = "";
    }

    public class UpdateProfileDto
    {
        public string? FullName { get; set; }
        public string? Phone { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public string? AvatarUrl { get; set; }
    }

    public class ChangePasswordDto
    {
        public string CurrentPassword { get; set; } = "";
        public string NewPassword { get; set; } = "";
    }
}
