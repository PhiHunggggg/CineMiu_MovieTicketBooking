using DTO.Authen;
using Microsoft.AspNetCore.Mvc;
using Services.Authen;

namespace AuthServices.Controllers
{
    [Route("api/users")]
    [ApiController]
    public class UsersController(IUserService userService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetUsers(
            [FromQuery] string? keyword,
            [FromQuery] byte? roleId,
            [FromQuery] bool? isActive,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12)
        {
            var result = await userService.GetUsersAsync(keyword, roleId, isActive, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{userId:int}")]
        public async Task<IActionResult> GetUserById(int userId)
        {
            try
            {
                var result = await userService.GetUserByIdAsync(userId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] UserDto.UserRequest request)
        {
            try
            {
                await userService.CreateUserAsync(request);
                return Ok(new { message = "User created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{userId:int}")]
        public async Task<IActionResult> Update(int userId, [FromBody] UserDto.UserRequest request)
        {
            try
            {
                await userService.UpdateUserAsync(userId, request);
                return Ok(new { message = "User updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{userId:int}")]
        public async Task<IActionResult> Delete(int userId)
        {
            await userService.DeleteAsync(userId);
            return Ok(new { message = "User deleted successfully" });
        }
    }
}
