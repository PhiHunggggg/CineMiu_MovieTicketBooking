using DTO.Theater;
using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/cinemas")]
    [ApiController]
    public class CinemasController(ICinemaService cinemaService) : ControllerBase
    {
        private readonly ICinemaService _cinemaService;
        private readonly IHallService _hallService;

        public CinemasController(ICinemaService cinemaService, IHallService hallService)
        {
            _cinemaService = cinemaService;
            _hallService = hallService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? city,
            [FromQuery] bool activeOnly = true)
        {
            return Ok(await _cinemaService.GetAllAsync(city, activeOnly));
        }

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id)
        {
            return ExecuteAsync(async () =>
            {
                var cinema = await _cinemaService.GetCinemaByIdAsync(id);
                var halls = await _hallService.GetHallsByCinemaAsync(id);
                return Ok(new { cinema, halls });
            });
        }

        [HttpGet("{cinemaId:int}/halls")]
        public Task<IActionResult> GetHalls(int cinemaId)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.GetHallsByCinemaAsync(cinemaId)));
        }

        [HttpPost]
        public Task<IActionResult> Create([FromBody] CinemaDTO.CinemaRequest request)
        {
            return ExecuteAsync(async () =>
            {
                var cinema = await _cinemaService.CreateAsync(request);
                return CreatedAtAction(nameof(GetById), new { id = cinema.CinemaId }, cinema);
            });
        }

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] CinemaDTO.CinemaRequest request)
        {
            return ExecuteAsync(async () =>
                Ok(await _cinemaService.UpdateAsync(id, request)));
        }

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id)
        {
            return ExecuteAsync(async () =>
            {
                await _cinemaService.DeleteAsync(id);
                return NoContent();
            });
        }

        [HttpPost("{cinemaId:int}/halls")]
        public Task<IActionResult> CreateHall(
            int cinemaId,
            [FromBody] HallDTO.HallRequest request)
        {
            request.CinemaId = cinemaId;
            return ExecuteAsync(async () =>
                Ok(await _hallService.CreateAsync(request)));
        }

        [HttpPut("halls/{hallId:int}")]
        public Task<IActionResult> UpdateHall(
            int hallId,
            [FromBody] HallDTO.HallRequest request)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.UpdateAsync(hallId, request)));
        }

        [HttpPatch("halls/{hallId:int}/status")]
        public Task<IActionResult> UpdateHallStatus(
            int hallId,
            [FromBody] HallDTO.HallStatusRequest request)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.UpdateStatusAsync(hallId, request.Status)));
        }

        [HttpDelete("halls/{hallId:int}")]
        public Task<IActionResult> DeleteHall(int hallId)
        {
            return ExecuteAsync(async () =>
            {
                await _hallService.DeleteAsync(hallId);
                return NoContent();
            });
        }

        [HttpGet("halls/{hallId:int}/seats")]
        public Task<IActionResult> GetSeats(int hallId)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.GetSeatsAsync(hallId)));
        }

        [HttpPost("halls/{hallId:int}/seats")]
        public Task<IActionResult> CreateSeat(
            int hallId,
            [FromBody] HallDTO.SeatLayoutItemRequest request)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.CreateSeatAsync(hallId, request)));
        }

        [HttpPut("halls/{hallId:int}/seats")]
        public Task<IActionResult> UpdateSeats(
            int hallId,
            [FromBody] List<HallDTO.SeatLayoutItemRequest> requests)
        {
            return ExecuteAsync(async () =>
                Ok(await _hallService.ReplaceSeatsAsync(hallId, requests)));
        }

        private async Task<IActionResult> ExecuteAsync(Func<Task<IActionResult>> action)
        {
            try
            {
                return await action();
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (InvalidOperationException exception)
            {
                return Conflict(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }
    }
}
