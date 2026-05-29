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

        [HttpGet("{movieId:int}")]
        public async Task<IActionResult> GetMovieById(int movieId)
        { 
            var result = await movieService.GetMovieByIdAsync(movieId);
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] DTO.Theater.MovieDTO.MovieRequest movieRequest)
        { 
            await movieService.CreateAsync(movieRequest);
            return Ok();
        }
        [HttpPut("{movieId:int}")]
        public async Task<IActionResult> Update(int movieId, [FromBody] DTO.Theater.MovieDTO.MovieRequest movieRequest)
        {
            await movieService.UpdateAsync(movieId, movieRequest);
            return Ok();
        }
        [HttpDelete("{movieId:int}")]
        public async Task<IActionResult> Delete(int movieId)
        {
            await movieService.DeleteAsync(movieId);
            return Ok();
        }
    } 
}
