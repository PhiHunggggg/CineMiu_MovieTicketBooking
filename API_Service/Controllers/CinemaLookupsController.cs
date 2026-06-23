using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/cinema-lookups")]
    [ApiController]
    public class CinemaLookupsController(ICinemaLookupService cinemaLookupService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await cinemaLookupService.GetAllAsync());

        [HttpPost("genres")]
        public async Task<IActionResult> CreateGenre([FromBody] CinemaLookupDTO.GenreRequest request)
        {
            try
            {
                return Ok(await cinemaLookupService.CreateGenreAsync(request));
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }
    }
}
