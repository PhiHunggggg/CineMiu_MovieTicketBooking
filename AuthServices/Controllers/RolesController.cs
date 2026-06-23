using Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Services.Authen;

namespace BaseCore.AuthService.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class RolesController : ControllerBase
    {
        private readonly RoleService roleService;

        public RolesController(RoleService _roleService)
        {
            roleService = _roleService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var roles = await roleService.GetAll();
            return Ok(roles);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            try{
                var role = await roleService.GetById(id);
                return Ok(role);
            }
            catch
            {
                return NotFound(new { message = "Role not found" });
            }
        }

        [HttpGet("by-name/{roleName}")]
        public async Task<IActionResult> GetByName(string roleName)
        {
            try
            {
              var role = await roleService.GetByName(roleName);
                return Ok(role);  
            }
            catch
            {
                return NotFound(new { message = "Role not found" });
            }
        }

        [HttpGet("{id}/permissions")]
        public async Task<IActionResult> GetPermissions(int id)
        {
            var role = await roleService.GetById(id);
            if (role == null)
            {
                return NotFound(new { message = "Role not found" });
            }

            var permissions = role.RoleName switch
            {
                "admin" => new[] { "users.read", "users.write", "users.delete", "roles.read", "roles.write", "movies.write", "showtimes.write", "bookings.read", "promotions.write" },
                "cinema_manager" => new[] { "movies.read", "movies.write", "showtimes.read", "showtimes.write", "bookings.read", "cinemas.read" },
                "ticket_staff" => new[] { "bookings.read", "tickets.scan", "showtimes.read" },
                _ => new[] { "movies.read", "showtimes.read", "bookings.write" }
            };

            return Ok(new
            {
                role = role.RoleName,
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
