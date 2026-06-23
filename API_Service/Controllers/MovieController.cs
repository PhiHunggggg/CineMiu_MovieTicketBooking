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
            var result = await movieService.GetAllMoviesAsync(keyword, status, cinemaId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            try
            {
                var movie = await movieService.GetMovieByIdAsync(id);
                return Ok(new { movie, genreIds = movie.GenreIds ?? [] });
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MovieDTO.MovieRequest request)
        {
            try
            {
                await movieService.CreateAsync(request);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] MovieDTO.MovieRequest request)
        {
            try
            {
                await movieService.UpdateAsync(id, request);
                return Ok(await movieService.GetMovieByIdAsync(id));
            }
            catch (ArgumentException ex) when (ex.Message == "Movie not found")
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await movieService.DeleteAsync(id);
                return NoContent();
            }
            catch (ArgumentException ex) when (ex.Message == "Movie not found")
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
