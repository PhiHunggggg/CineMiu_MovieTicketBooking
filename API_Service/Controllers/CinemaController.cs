using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/cinemas")]
    [ApiController]
    public class CinemaController(SqlServerDbContext context) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? city)
        {
            var query = context.Cinemas.AsNoTracking().Where(x => x.IsActive);

            if (!string.IsNullOrWhiteSpace(city))
            {
                query = query.Where(x => x.City == city);
            }

            var cinemas = await query
                .OrderBy(x => x.City)
                .ThenBy(x => x.CinemaName)
                .Select(x => new
                {
                    x.CinemaId,
                    Id = x.CinemaId,
                    Name = x.CinemaName,
                    CinemaName = x.CinemaName,
                    x.Address,
                    x.City,
                    x.District,
                    x.Phone,
                    x.Email,
                    x.Latitude,
                    x.Longitude,
                    x.MapUrl,
                    x.ImageUrl
                })
                .ToListAsync();

            return Ok(cinemas);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cinema = await context.Cinemas
                .AsNoTracking()
                .Where(x => x.CinemaId == id && x.IsActive)
                .Select(x => new
                {
                    x.CinemaId,
                    Id = x.CinemaId,
                    Name = x.CinemaName,
                    CinemaName = x.CinemaName,
                    x.Address,
                    x.City,
                    x.District,
                    x.Phone,
                    x.Email,
                    x.Latitude,
                    x.Longitude,
                    x.MapUrl,
                    x.ImageUrl
                })
                .FirstOrDefaultAsync();

            return cinema == null ? NotFound() : Ok(cinema);
        }

        [HttpGet("halls/{hallId:int}/seats")]
        public async Task<IActionResult> GetSeats(int hallId)
        {
            var seats = await context.Seats
                .AsNoTracking()
                .Where(x => x.HallId == hallId && x.IsActive)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .Select(x => new
                {
                    Id = x.SeatId,
                    x.SeatId,
                    x.HallId,
                    x.SeatTypeId,
                    x.RowLabel,
                    x.ColNumber,
                    x.SeatCode
                })
                .ToListAsync();

            return Ok(seats);
        }
    }
}
