using DTO.Authen;
using Microsoft.AspNetCore.Mvc;
using Services.Authen;

namespace API_Service.Controllers
{
    [Route("api/cinema-users")]
    [ApiController]
    public class CinemaUsersController(ICinemaUserService cinemaUserService) : ControllerBase
    {
        [HttpGet]
        public Task<IActionResult> GetAll([FromQuery] string? keyword) =>
            ExecuteAsync(() => cinemaUserService.GetAllAsync(keyword), Ok);

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) =>
            ExecuteAsync(() => cinemaUserService.GetByIdAsync(id), Ok);

        [HttpPost]
<<<<<<< HEAD
        public async Task<IActionResult> Create([FromBody] CinemaUserDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "FullName and Email are required" });
            }

            if (await _context.CinemaUsers.AnyAsync(x => x.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            if (string.IsNullOrWhiteSpace(dto.Password) && string.IsNullOrWhiteSpace(dto.PasswordHash))
            {
                return BadRequest(new { message = "Password is required" });
            }

            var user = new CinemaUser
            {
                RoleId = dto.RoleId ?? 1,
                CinemaId = dto.CinemaId,
                FullName = dto.FullName,
                Email = dto.Email,
                Phone = dto.Phone,
                PasswordHash = !string.IsNullOrWhiteSpace(dto.PasswordHash)
                    ? dto.PasswordHash
                    : TokenHelper.HashPasswordForStorage(dto.Password!),
                AvatarUrl = dto.AvatarUrl,
                DateOfBirth = dto.DateOfBirth,
                Gender = dto.Gender,
                IsActive = dto.IsActive ?? true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.CinemaUsers.Add(user);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = user.UserId }, user);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CinemaUserDto dto)
        {
            var user = await _context.CinemaUsers.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email))
            {
                return BadRequest(new { message = "FullName and Email are required" });
            }

            if (await _context.CinemaUsers.AnyAsync(x => x.UserId != id && x.Email == dto.Email))
            {
                return BadRequest(new { message = "Email already exists" });
            }

            user.RoleId = dto.RoleId ?? user.RoleId;
            user.CinemaId = dto.CinemaId;
            user.FullName = dto.FullName;
            user.Email = dto.Email;
            user.Phone = dto.Phone;
            user.AvatarUrl = dto.AvatarUrl;
            user.DateOfBirth = dto.DateOfBirth;
            user.Gender = dto.Gender;
            user.IsActive = dto.IsActive ?? user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;

            if (!string.IsNullOrWhiteSpace(dto.PasswordHash))
            {
                user.PasswordHash = dto.PasswordHash;
            }
            else if (!string.IsNullOrWhiteSpace(dto.Password))
            {
                user.PasswordHash = TokenHelper.HashPasswordForStorage(dto.Password);
            }

            await _context.SaveChangesAsync();
            return Ok(user);
        }
=======
        public Task<IActionResult> Create([FromBody] CinemaUserDTO.UserRequest request) =>
            ExecuteAsync(
                () => cinemaUserService.CreateAsync(request),
                user => CreatedAtAction(nameof(GetById), new { id = user.UserId }, user));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] CinemaUserDTO.UserRequest request) =>
            ExecuteAsync(() => cinemaUserService.UpdateAsync(id, request), Ok);
>>>>>>> origin/develop

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) =>
            ExecuteAsync(() => cinemaUserService.DeactivateAsync(id), Ok);

        private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, Func<T, IActionResult> onSuccess)
        {
            try
            {
                return onSuccess(await action());
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }
    }
<<<<<<< HEAD

    public class CinemaUserDto
    {
        public byte? RoleId { get; set; }
        public int? CinemaId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Phone { get; set; }
        public string? Password { get; set; }
        public string? PasswordHash { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public bool? IsActive { get; set; }
    }
=======
>>>>>>> origin/develop
}
