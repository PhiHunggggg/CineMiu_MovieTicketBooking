using Microsoft.AspNetCore.Mvc;
using Services.Theater;
namespace API_Service.Controllers
{
    [Route("api/movies")]
    [ApiController]
    public class MovieController(IMovieService movieService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllMovies([FromQuery] string? keyword, [FromQuery] string? status, [FromQuery] int? cinemaId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            var result = await movieService.GetAllMoviesAsync(keyword, status, cinemaId, page, pageSize);
            return Ok(result);
        }

        [HttpGet("genres")]
        public async Task<IActionResult> GetGenres()
        {
            var result = await movieService.GetGenresAsync();
            return Ok(result);
        }

        [HttpGet("{movieId:int}")]
        public async Task<IActionResult> GetMovieById(int movieId)
        {
            try
            {
                var result = await movieService.GetMovieByIdAsync(movieId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DTO.Theater.MovieDTO.MovieRequest movieRequest)
        {
            try
            {
                await movieService.CreateAsync(movieRequest);
                return Ok(new { message = "Movie created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpPut("{movieId:int}")]
        public async Task<IActionResult> Update(int movieId, [FromBody] DTO.Theater.MovieDTO.MovieRequest movieRequest)
        {
            try
            {
                await movieService.UpdateAsync(movieId, movieRequest);
                return Ok(new { message = "Movie updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
        [HttpDelete("{movieId:int}")]
        public async Task<IActionResult> Delete(int movieId)
        {
            try
            {
                await movieService.DeleteAsync(movieId);
                return Ok(new { message = "Movie deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    } 
}
