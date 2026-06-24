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
        public Task<IActionResult> Create([FromBody] CinemaUserDTO.UserRequest request) =>
            ExecuteAsync(
                () => cinemaUserService.CreateAsync(request),
                user => CreatedAtAction(nameof(GetById), new { id = user.UserId }, user));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] CinemaUserDTO.UserRequest request) =>
            ExecuteAsync(() => cinemaUserService.UpdateAsync(id, request), Ok);

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
}
