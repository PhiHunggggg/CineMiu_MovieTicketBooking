using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers
{
    [Route("api/cinemas")]
    [ApiController]
    public class CinemasController(ICinemaService cinemaService) : ControllerBase
    {
        [HttpGet]
        public Task<IActionResult> GetAll([FromQuery] string? city, [FromQuery] bool activeOnly = true) =>
            ExecuteAsync(() => cinemaService.GetAllAsync(city, activeOnly), Ok);

        [HttpGet("by-movie/{movieId:int}")]
        public Task<IActionResult> GetByMovie(
            int movieId,
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo) =>
            ExecuteAsync(() => cinemaService.GetByMovieAsync(movieId, dateFrom, dateTo), Ok);

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) =>
            ExecuteAsync(() => cinemaService.GetDetailAsync(id), Ok);

        [HttpGet("{cinemaId:int}/halls")]
        public Task<IActionResult> GetHalls(int cinemaId) =>
            ExecuteAsync(() => cinemaService.GetHallsAsync(cinemaId), Ok);

        [HttpPost]
        public Task<IActionResult> Create([FromBody] CinemaDTO.CinemaRequest request) =>
            ExecuteAsync(
                () => cinemaService.CreateAsync(request),
                cinema => CreatedAtAction(nameof(GetById), new { id = cinema.CinemaId }, cinema));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] CinemaDTO.CinemaRequest request) =>
            ExecuteAsync(() => cinemaService.UpdateAsync(id, request), Ok);

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) =>
            ExecuteAsync(() => cinemaService.DeleteAsync(id), NoContent);

        [HttpPost("{cinemaId:int}/halls")]
        public Task<IActionResult> CreateHall(int cinemaId, [FromBody] CinemaDTO.HallRequest request) =>
            ExecuteAsync(() => cinemaService.CreateHallAsync(cinemaId, request), Ok);

        [HttpPut("halls/{hallId:int}")]
        public Task<IActionResult> UpdateHall(int hallId, [FromBody] CinemaDTO.HallRequest request) =>
            ExecuteAsync(() => cinemaService.UpdateHallAsync(hallId, request), Ok);

        [HttpDelete("halls/{hallId:int}")]
        public Task<IActionResult> DeleteHall(int hallId) =>
            ExecuteAsync(() => cinemaService.DeleteHallAsync(hallId), NoContent);

        [HttpGet("halls/{hallId:int}/seats")]
        public Task<IActionResult> GetSeats(int hallId) =>
            ExecuteAsync(() => cinemaService.GetSeatsAsync(hallId), Ok);

        [HttpPost("halls/{hallId:int}/seats")]
        public Task<IActionResult> CreateSeat(int hallId, [FromBody] CinemaDTO.SeatRequest request) =>
            ExecuteAsync(() => cinemaService.CreateSeatAsync(hallId, request), Ok);

        [HttpPut("halls/{hallId:int}/seats")]
        public Task<IActionResult> UpdateSeats(
            int hallId,
            [FromBody] List<CinemaDTO.SeatRequest>? requests) =>
            ExecuteAsync(() => cinemaService.ReplaceSeatsAsync(hallId, requests ?? []), Ok);

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
