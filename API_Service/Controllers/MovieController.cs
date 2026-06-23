using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/movies")]
    [ApiController]
    public class MoviesController(IMovieService movieService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] string? status,
            [FromQuery] int? cinemaId,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12) =>
            Ok(await movieService.GetAllMoviesAsync(keyword, status, cinemaId, page, pageSize));

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) =>
            ExecuteAsync(() => movieService.GetMovieByIdAsync(id), Ok);

        [HttpPost]
        public Task<IActionResult> Create([FromBody] MovieDTO.MovieRequest request) =>
            ExecuteAsync(
                () => movieService.CreateAsync(request),
                movie => CreatedAtAction(nameof(GetById), new { id = movie.MovieId }, movie));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] MovieDTO.MovieRequest request) =>
            ExecuteAsync(() => movieService.UpdateAsync(id, request), Ok);

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) =>
            ExecuteAsync(() => movieService.DeleteAsync(id), NoContent);

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

        private async Task<IActionResult> ExecuteAsync(Func<Task> action, Func<IActionResult> onSuccess)
        {
            try
            {
                await action();
                return onSuccess();
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
