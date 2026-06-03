using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/cinemas")]
    [ApiController]
    public class CinemaController(ICinemaService cinemaService) : ControllerBase
    {
        [HttpGet("chains")]
        public async Task<IActionResult> GetChains()
        {
            var result = await cinemaService.GetChainsAsync();
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllCinemas([FromQuery] string? keyword, [FromQuery] string? city, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            var result = await cinemaService.GetAllCinemasAsync(keyword, city, isActive, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{cinemaId:int}")]
        public async Task<IActionResult> GetCinemaById(int cinemaId)
        {
            try
            {
                var result = await cinemaService.GetCinemaByIdAsync(cinemaId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CinemaDTO.CinemaRequest cinemaRequest)
        {
            try
            {
                await cinemaService.CreateAsync(cinemaRequest);
                return Ok(new { message = "Cinema created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{cinemaId:int}")]
        public async Task<IActionResult> Update(int cinemaId, [FromBody] CinemaDTO.CinemaRequest cinemaRequest)
        {
            try
            {
                await cinemaService.UpdateAsync(cinemaId, cinemaRequest);
                return Ok(new { message = "Cinema updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{cinemaId:int}")]
        public async Task<IActionResult> Delete(int cinemaId)
        {
            try
            {
                await cinemaService.DeleteAsync(cinemaId);
                return Ok(new { message = "Cinema deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
