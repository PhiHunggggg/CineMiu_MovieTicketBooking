using DTO.Authen;
using Entities;
using Libs.Auth;
using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.DataProtection.Repositories;
using Microsoft.AspNetCore.Identity.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Ocelot.Values;
using Services.Authen;
using Repository;
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
            var token = TokenHelper.GenerateToken(_secretKey, TokenExpirationMinutes, user.UserId.ToString(), user.Email, roleName);

            return Ok(new DTO.Authen.LoginDto.LoginResponse
            {
                Token = token,
                UserId = user.UserId.ToString(),
                RoleId = user.RoleId,
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

    }
}

