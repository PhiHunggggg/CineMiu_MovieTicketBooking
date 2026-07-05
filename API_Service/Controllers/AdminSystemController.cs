using DTO.Administration;
using Services.Administration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace APIService.Controllers
{
    [Route("api/admin-system")]
    [ApiController]
    [Authorize(Roles = "admin")]
    public class AdminSystemController : ControllerBase
    {
        private readonly IAdminSystemService _adminSystemService;

        public AdminSystemController(IAdminSystemService adminSystemService)
        {
            _adminSystemService = adminSystemService;
        }

        [HttpGet("summary")]
        public async Task<IActionResult> GetSummary()
        {
            return Ok(await _adminSystemService.GetSummaryAsync());
        }

        [HttpPost("roles")]
        public async Task<IActionResult> CreateRole([FromBody] AdminSystemDTO.RoleRequest dto)
        {
            try
            {
                return Ok(await _adminSystemService.CreateRoleAsync(dto));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("roles/{id:int}")]
        public async Task<IActionResult> UpdateRole(byte id, [FromBody] AdminSystemDTO.RoleRequest dto)
        {
            try
            {
                var role = await _adminSystemService.UpdateRoleAsync(id, dto);
                return Ok(role);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Role not found" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("roles/{id:int}")]
        public async Task<IActionResult> DeleteRole(byte id)
        {
            try
            {
                await _adminSystemService.DeleteRoleAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Role not found" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpGet("sessions")]
        public async Task<IActionResult> GetSessions()
        {
            return Ok(await _adminSystemService.GetSessionsAsync());
        }

        [HttpDelete("sessions/{sessionId}")]
        public async Task<IActionResult> DeleteSession(string sessionId)
        {
            try
            {
                await _adminSystemService.DeleteSessionAsync(sessionId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
