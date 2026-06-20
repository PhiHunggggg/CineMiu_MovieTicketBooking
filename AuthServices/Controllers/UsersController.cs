using Entities;
using Services.Authen;
using DTO.Authen;
using Libs.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace AuthService.Controllers
{
    [Route("api/users")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;

        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll([FromQuery] string keyword = "", [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var resp = await _userService.GetUsersAsync(keyword, null, null, page, pageSize);
            return Ok(new
            {
                data = resp.Items,
                resp.TotalCount,
                resp.Page,
                resp.PageSize,
                resp.TotalPages
            });
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _userService.GetUserByIdAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(user);
        }

        [HttpPost]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Create([FromBody] CreateUserRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request" });
            }

            if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password))
            {
                return BadRequest(new { message = "Full name, email and password are required" });
            }

            try
            {
                var dto = new UserDto.UserRequest
                {
                    RoleId = request.RoleId ?? 1,
                    CinemaId = null,
                    FullName = request.FullName,
                    Email = request.Email,
                    Password = request.Password,
                    Phone = request.Phone,
                    AvatarUrl = request.AvatarUrl,
                    DateOfBirth = request.DateOfBirth,
                    Gender = request.Gender,
                    IsActive = request.IsActive ?? true
                };

                await _userService.CreateUserAsync(dto);
                return NoContent();
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Failed to create user: " + ex.Message });
            }
        }

        [HttpPut("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUserRequest request)
        {
            if (request == null)
            {
                return BadRequest(new { message = "Invalid request" });
            }

            var existingUser = await _userService.GetById(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "User not found" });
            }
            var dto = new UserDto.UserRequest
            {
                RoleId = request.RoleId ?? existingUser.RoleId,
                CinemaId = existingUser.CinemaId,
                FullName = request.FullName ?? existingUser.FullName,
                Email = request.Email ?? existingUser.Email,
                Password = request.Password,
                Phone = request.Phone ?? existingUser.Phone,
                AvatarUrl = request.AvatarUrl ?? existingUser.AvatarUrl,
                DateOfBirth = request.DateOfBirth ?? existingUser.DateOfBirth,
                Gender = request.Gender ?? existingUser.Gender,
                IsActive = request.IsActive ?? existingUser.IsActive
            };

            await _userService.UpdateUserAsync(id, dto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> Delete(int id)
        {
            var existingUser = await _userService.GetById(id);
            if (existingUser == null)
            {
                return NotFound(new { message = "User not found" });
            }

            await _userService.DeleteAsync(id);
            return NoContent();
        }

        private static UserResponse ToResponse(Users user)
        {
            return new UserResponse
            {
                UserId = user.UserId,
                RoleId = user.RoleId,
                FullName = user.FullName,
                Email = user.Email,
                Phone = user.Phone,
                AvatarUrl = user.AvatarUrl,
                DateOfBirth = user.DateOfBirth,
                Gender = user.Gender,
                IsActive = user.IsActive,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.UpdatedAt ?? DateTime.UtcNow
            };
        }
    }

    public class UserResponse
    {
        public int UserId { get; set; }
        public byte RoleId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class CreateUserRequest
    {
        public byte? RoleId { get; set; }
        public string FullName { get; set; } = "";
        public string Password { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public bool? IsActive { get; set; }
    }

    public class UpdateUserRequest
    {
        public byte? RoleId { get; set; }
        public string? Password { get; set; }
        public string? FullName { get; set; }
        public string? Email { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public bool? IsActive { get; set; }
    }
}
