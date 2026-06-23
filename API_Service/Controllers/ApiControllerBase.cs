using Microsoft.AspNetCore.Mvc;

namespace API_Service.Controllers
{
    [ApiController]
    public class ApiControllerBase : ControllerBase
    {
        protected async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action)
        {
            try
            {
                return await action();
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
            catch (Exception exception)
            {
                return StatusCode(500, new { message = exception.Message });
            }
        }
    }
}
