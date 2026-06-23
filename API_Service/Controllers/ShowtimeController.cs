using DTO.Theater;
using Microsoft.AspNetCore.Mvc;
using Services.Theater;

namespace API_Service.Controllers;

[Route("api/showtimes")]
[ApiController]
public class ShowtimesController(IShowtimeService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? keyword,
        [FromQuery] int? movieId,
        [FromQuery] int? cinemaId,
        [FromQuery] int? hallId,
        [FromQuery] DateTime? date,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 12,
        [FromQuery] bool upcomingOnly = false) =>
        Ok(await service.GetAllShowtimesAsync(
            keyword, movieId, cinemaId, hallId, date, status, page, pageSize, upcomingOnly));

    [HttpPost("generate")]
    public async Task<IActionResult> Generate([FromQuery] int days = 5) =>
        Ok(await service.GenerateUpcomingAsync(days));

    [HttpGet("{id:int}")]
    public Task<IActionResult> GetById(int id) => ExecuteAsync(async () =>
    {
        var result = await service.GetShowtimeDetailsAsync(id);
        return result == null ? NotFound(new { message = "Showtime not found" }) : Ok(result);
    });

    [HttpGet("{id:int}/seats")]
    public Task<IActionResult> GetSeats(int id, [FromQuery] int? userId, [FromQuery] string? sessionId) =>
        ExecuteAsync(async () => Ok(await service.GetSeatsAsync(id, userId, sessionId)));

    [HttpPost]
    public Task<IActionResult> Create([FromBody] ShowtimeDTO.ShowtimeRequest request) => ExecuteAsync(async () =>
    {
        await service.CreateAsync(request);
        return NoContent();
    });

    [HttpPut("{id:int}")]
    public Task<IActionResult> Update(int id, [FromBody] ShowtimeDTO.ShowtimeRequest request) => ExecuteAsync(async () =>
    {
        await service.UpdateAsync(id, request);
        return Ok(await service.GetShowtimeByIdAsync(id));
    });

    [HttpDelete("{id:int}")]
    public Task<IActionResult> Delete(int id) => ExecuteAsync(async () =>
    {
        await service.DeleteAsync(id);
        return NoContent();
    });

    [HttpPost("{id:int}/locks")]
    public Task<IActionResult> LockSeats(int id, [FromBody] ShowtimeDTO.SeatLockRequest request) =>
        ExecuteAsync(async () => Ok(await service.LockSeatsAsync(
            id, request.UserId, request.SessionId ?? "", request.SeatIds, request.Minutes)));

    [HttpPost("{id:int}/unlocks")]
    public Task<IActionResult> UnlockSeats(int id, [FromBody] ShowtimeDTO.SeatUnlockRequest request) =>
        ExecuteAsync(async () =>
        {
            await service.UnlockSeatsAsync(id, request.UserId, request.SessionId ?? "");
            return Ok(new { message = "Seats unlocked" });
        });
}
