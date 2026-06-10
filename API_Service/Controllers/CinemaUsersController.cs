using Common;
using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

  namespace API_Service.Controllers
{
    [Route("api/cinema-users")]
    [ApiController]
    public class CinemaUsersController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public CinemaUsersController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? keyword)
        {
            var query = _context.CinemaUsers.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                query = query.Where(x => x.FullName.Contains(keyword) || x.Email.Contains(keyword) || (x.Phone != null && x.Phone.Contains(keyword)));
            }

            return Ok(await query.OrderByDescending(x => x.CreatedAt).ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = await _context.CinemaUsers.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == id);
            return user == null ? NotFound(new { message = "User not found" }) : Ok(user);
        }

        [HttpPost]
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

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var user = await _context.CinemaUsers.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = "User not found" });
            }

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(new { message = "User deactivated" });
        }
    }

    public class CinemaUserDto
    {
        public byte? RoleId { get; set; }
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
}
