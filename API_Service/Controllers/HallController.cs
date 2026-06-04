using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/halls")]
    [ApiController]
    public class HallController(IHallService hallService) : ControllerBase
    {
        [HttpGet("types")]
        public async Task<IActionResult> GetHallTypes()
        {
            var result = await hallService.GetHallTypesAsync();
            return Ok(result);
        }

        [HttpGet("seat-types")]
        public async Task<IActionResult> GetSeatTypes()
        {
            var result = await hallService.GetSeatTypesAsync();
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAllHalls([FromQuery] string? keyword, [FromQuery] int? cinemaId, [FromQuery] string? status, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            var result = await hallService.GetAllHallsAsync(keyword, cinemaId, status, page, pageSize);
            return Ok(result);
        }

        [HttpGet("{hallId:int}")]
        public async Task<IActionResult> GetHallById(int hallId)
        {
            try
            {
                var result = await hallService.GetHallByIdAsync(hallId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpGet("{hallId:int}/seats")]
        public async Task<IActionResult> GetSeats(int hallId)
        {
            try
            {
                var result = await hallService.GetSeatsAsync(hallId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPut("seats/{seatId:int}")]
        public async Task<IActionResult> UpdateSeat(int seatId, [FromBody] HallDTO.SeatUpdateRequest seatRequest)
        {
            try
            {
                var result = await hallService.UpdateSeatAsync(seatId, seatRequest);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{hallId:int}/seats")]
        public async Task<IActionResult> UpdateSeats(int hallId, [FromBody] HallDTO.SeatBulkUpdateRequest seatRequest)
        {
            try
            {
                var result = await hallService.UpdateSeatsAsync(hallId, seatRequest);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] HallDTO.HallRequest hallRequest)
        {
            try
            {
                await hallService.CreateAsync(hallRequest);
                return Ok(new { message = "Hall created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{hallId:int}")]
        public async Task<IActionResult> Update(int hallId, [FromBody] HallDTO.HallRequest hallRequest)
        {
            try
            {
                await hallService.UpdateAsync(hallId, hallRequest);
                return Ok(new { message = "Hall updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{hallId:int}")]
        public async Task<IActionResult> Delete(int hallId)
        {
            try
            {
                await hallService.DeleteAsync(hallId);
                return Ok(new { message = "Hall deleted successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
