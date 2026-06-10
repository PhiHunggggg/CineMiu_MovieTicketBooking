using Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class RolesController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public RolesController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var roles = await _context.CinemaRoles.AsNoTracking()
                .OrderBy(x => x.RoleId)
                .Select(x => new RoleDto
                {
                    Id = x.RoleId,
                    Name = x.RoleName,
                    Description = x.Description
                })
                .ToListAsync();

            return Ok(roles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var role = await _context.CinemaRoles.AsNoTracking()
                .Where(x => x.RoleId == id)
                .Select(x => new RoleDto
                {
                    Id = x.RoleId,
                    Name = x.RoleName,
                    Description = x.Description
                })
                .FirstOrDefaultAsync();

            return role == null ? NotFound(new { message = "Role not found" }) : Ok(role);
        }

        [HttpGet("by-name/{roleName}")]
        public async Task<IActionResult> GetByName(string roleName)
        {
            var role = await _context.CinemaRoles.AsNoTracking()
                .Where(x => x.RoleName == roleName)
                .Select(x => new RoleDto
                {
                    Id = x.RoleId,
                    Name = x.RoleName,
                    Description = x.Description
                })
                .FirstOrDefaultAsync();

            return role == null ? NotFound(new { message = "Role not found" }) : Ok(role);
        }

        [HttpGet("{id}/permissions")]
        public async Task<IActionResult> GetPermissions(int id)
        {
            var role = await _context.CinemaRoles.AsNoTracking()
                .Where(x => x.RoleId == id)
                .Select(x => new RoleDto
                {
                    Id = x.RoleId,
                    Name = x.RoleName,
                    Description = x.Description
                })
                .FirstOrDefaultAsync();

            if (role == null)
            {
                return NotFound(new { message = "Role not found" });
            }

            var permissions = role.Name switch
            {
                "admin" => new[] { "users.read", "users.write", "users.delete", "roles.read", "roles.write", "movies.write", "showtimes.write", "bookings.read", "promotions.write" },
                "cinema_manager" => new[] { "movies.read", "movies.write", "showtimes.read", "showtimes.write", "bookings.read", "cinemas.read" },
                "ticket_staff" => new[] { "bookings.read", "tickets.scan", "showtimes.read" },
                _ => new[] { "movies.read", "showtimes.read", "bookings.write" }
            };

            return Ok(new
            {
                role = role.Name,
                permissions
            });
        }
    }

    public class RoleDto
    {
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }
}
