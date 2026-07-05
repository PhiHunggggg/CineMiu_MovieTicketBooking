using Common;
using Entities;
using API_Service.Infrastructure;
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
        private readonly ILogger<AuthController> _logger;

        public AuthController(
            IUserService userService,
            IUserRepository userRepository,
            IConfiguration configuration,
            ILogger<AuthController> logger)
        {
            _userService = userService;
            _userRepository = userRepository;
            _configuration = configuration;
            _logger = logger;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            {
                return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, "Full name, email and password are required");
            }

            if (await _userRepository.EmailExistsAsync(dto.Email))
            {
                _logger.LogWarning("RegisterFailedDuplicateEmail email={Email}", dto.Email);
                return ApiErrors.Conflict(this, ErrorCodes.Conflict, "Email already exists");
            }

            var user = new CinemaUser
            {
                FullName = dto.FullName,
                Email = dto.Email.Trim().ToLowerInvariant(),
                Phone = dto.Phone,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender
            };

            var customerRole = (await _userRepository.GetRolesAsync())
                .FirstOrDefault(role =>
                    string.Equals(role.RoleName, "customer", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(role.RoleName, "user", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(role.RoleName, "member", StringComparison.OrdinalIgnoreCase));
            if (customerRole == null)
            {
                _logger.LogError("Registration failed because the customer role is missing");
                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    message = "Customer role is not configured"
                });
            }

            var createdUser = await _userService.CreateAsync(user, dto.Password, customerRole.RoleId);
            var roleName = await _userService.ResolveRoleName(createdUser.RoleId) ?? "customer";
            var token = GenerateJwtToken(createdUser, roleName);
            _logger.LogInformation(
                "UserRegistered userId={UserId} email={Email} role={Role}",
                createdUser.UserId,
                createdUser.Email,
                roleName);

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
                return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, "Email and password are required");
            }

            var user = await _userService.Authenticate(dto.Email, dto.Password);
            if (user == null)
            {
                _logger.LogWarning("LoginFailed email={Email}", dto.Email);
                return ApiErrors.Unauthorized(this, ErrorCodes.LoginFailed, "Invalid email or password");
            }

            var roleName = await _userService.ResolveRoleName(user.RoleId) ?? "customer";
            var token = GenerateJwtToken(user, roleName);
            _logger.LogInformation(
                "LoginSucceeded userId={UserId} email={Email} role={Role} cinemaId={CinemaId}",
                user.UserId,
                user.Email,
                roleName,
                user.CinemaId);

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
        public async Task<IActionResult> GetProfile()
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.Unauthorized, "Invalid token");
            }

            var token = authHeader.Substring("Bearer ".Length);
            var userId = ValidateTokenAndGetUserId(token);
            if (userId == null)
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.TokenInvalid, "Token expired or invalid");
            }

            var user = await _userService.GetById(userId.Value);
            if (user == null || !user.IsActive)
            {
                return ApiErrors.NotFound(this, ErrorCodes.NotFound, "User not found");
            }

            var roleName = await _userService.ResolveRoleName(user.RoleId) ?? "customer";
            return Ok(new
            {
                user.UserId,
                user.RoleId,
                role = roleName,
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
                return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, "Current password and new password are required");
            }

            if (dto.NewPassword.Length < 6)
            {
                return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, "New password must contain at least 6 characters");
            }

            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.Unauthorized, "Invalid token");
            }

            var userId = ValidateTokenAndGetUserId(authHeader.Substring("Bearer ".Length));
            var user = userId.HasValue ? await _userService.GetById(userId.Value) : null;
            if (user == null)
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.TokenInvalid, "Token expired or invalid");
            }

            if (!TokenHelper.IsValidStoredPassword(dto.CurrentPassword, user.PasswordHash))
            {
                _logger.LogWarning("PasswordChangeFailed userId={UserId} reason=InvalidCurrentPassword", user.UserId);
                return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, "Current password is incorrect");
            }

            await _userService.UpdateAsync(user, dto.NewPassword);
            _logger.LogInformation("PasswordChanged userId={UserId}", user.UserId);
            return Ok(new { message = "Password changed successfully" });
        }

        [HttpPut("profile")]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
        {
            var authHeader = Request.Headers["Authorization"].ToString();
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.Unauthorized, "Invalid token");
            }

            var token = authHeader.Substring("Bearer ".Length);
            var userId = ValidateTokenAndGetUserId(token);
            if (userId == null)
            {
                return ApiErrors.Unauthorized(this, ErrorCodes.TokenInvalid, "Token expired or invalid");
            }

            var user = await _userService.GetById(userId.Value);
            if (user == null)
            {
                return ApiErrors.NotFound(this, ErrorCodes.NotFound, "User not found");
            }

            user.FullName = dto.FullName ?? user.FullName;
            user.Phone = dto.Phone ?? user.Phone;
            user.DateOfBirth = dto.DateOfBirth ?? user.DateOfBirth;
            user.Gender = dto.Gender ?? user.Gender;
            user.AvatarUrl = dto.AvatarUrl ?? user.AvatarUrl;

            await _userService.UpdateAsync(user, null);
            _logger.LogInformation("ProfileUpdated userId={UserId}", user.UserId);

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
