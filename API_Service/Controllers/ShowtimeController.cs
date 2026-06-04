using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/showtimes")]
    [ApiController]
    public class ShowtimeController(IShowtimeService showtimeService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllShowtimes([FromQuery] string? keyword, [FromQuery] int? movieId, [FromQuery] int? cinemaId, [FromQuery] int? hallId, [FromQuery] DateTime? date, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            var result = await showtimeService.GetAllShowtimesAsync(keyword, movieId, cinemaId, hallId, date, status, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{showtimeId:int}")]
        public async Task<IActionResult> GetShowtimeById(int showtimeId)
        {
            try
            {
                var result = await showtimeService.GetShowtimeByIdAsync(showtimeId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            try
            {
                await showtimeService.CreateAsync(showtimeRequest);
                return Ok(new { message = "Showtime created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{showtimeId:int}")]
        public async Task<IActionResult> Update(int showtimeId, [FromBody] ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            try
            {
                await showtimeService.UpdateAsync(showtimeId, showtimeRequest);
                return Ok(new { message = "Showtime updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{showtimeId:int}")]
        public async Task<IActionResult> Delete(int showtimeId)
        {
            try
            {
                await showtimeService.DeleteAsync(showtimeId);
                return Ok(new { message = "Showtime deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
