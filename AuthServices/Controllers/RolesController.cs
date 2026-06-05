using Microsoft.AspNetCore.Mvc;
using Services.Authen;

namespace AuthServices.Controllers
{
    [Route("api/roles")]
    [ApiController]
    public class RolesController(IUserService userService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetRoles()
        {
            var result = await userService.GetRolesAsync();
            return Ok(result);
        }
    }
}
