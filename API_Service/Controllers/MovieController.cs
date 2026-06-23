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
            [FromQuery] int pageSize = 12)
        {
            return Ok(await movieService.GetAllMoviesAsync(keyword, status, cinemaId, page, pageSize));
        }

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) => ExecuteAsync(
            () => movieService.GetMovieByIdAsync(id),
            Ok);

        [HttpPost]
        public Task<IActionResult> Create([FromBody] MovieDTO.MovieRequest request) => ExecuteAsync(
            () => movieService.CreateAsync(request),
            movie => CreatedAtAction(nameof(GetById), new { id = movie.MovieId }, movie));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] MovieDTO.MovieRequest request) => ExecuteAsync(
            () => movieService.UpdateAsync(id, request),
            Ok);

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) => ExecuteAsync(
            async () =>
            {
                await movieService.DeleteAsync(id);
                return true;
            },
            _ => NoContent());

        private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, Func<T, IActionResult> onSuccess)
        {
            try
            {
                return onSuccess(await action());
            }
            catch (ArgumentException ex) when (ex.Message == "Movie not found")
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
