using Entities;
using Repository;
using Services;
using Services.Booking;
using Services.Theater;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository.Pricing;

namespace API_Service.Controllers
{
    [Route("api/showtimes")]
    [ApiController]
    public class ShowtimesController : ControllerBase
    {
        private readonly IShowtimeService _showtimeService;
        private readonly SqlServerDbContext _context;

        public ShowtimesController(IShowtimeService showtimeService, SqlServerDbContext context)
        {
            _showtimeService = showtimeService;
            _context = context;
        }

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
            [FromQuery] bool upcomingOnly = false,
            [FromQuery] int? seatTypeId = null,
            [FromQuery] int? dayTypeId = null,
            [FromQuery] int? hallTypeId = null)
        {
            var response = await _showtimeService.GetAllShowtimesAsync(
                keyword,
                movieId,
                cinemaId,
                hallId,
                date,
                status,
                page,
                pageSize,
                upcomingOnly);
            return Ok(response);
        }

        [HttpPost("generate")]
        public async Task<IActionResult> Generate([FromQuery] int days = 5)
        {
            var result = await _showtimeService.GenerateUpcomingAsync(days);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _showtimeService.GetShowtimeDetailsAsync(id);
            if (result == null) return NotFound(new { message = "Showtime not found" });
            return Ok(result);
        }

        [HttpGet("{id:int}/seats")]
        public async Task<IActionResult> GetSeats(
            int id,
            [FromQuery] int? userId,
            [FromQuery] string? sessionId)
        {
            var details = await _showtimeService.GetShowtimeDetailsAsync(id);
            if (details == null)
            {
                return NotFound(new { message = "Showtime not found" });
            }

            if (!string.Equals(details.Hall.Status, "active", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "This hall is currently unavailable" });
            }

            if (string.Equals(details.Status, "cancelled", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(details.Status, "completed", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(details.Status, "ended", StringComparison.OrdinalIgnoreCase) ||
                details.EndTime <= DateTime.Now)
            {
                return Conflict(new { message = "This showtime is no longer available" });
            }

            var now = DateTime.UtcNow;
            var showtime = await _context.CinemaShowtimes.AsNoTracking()
                .FirstAsync(x => x.ShowtimeId == id);
            var seats = await _context.CinemaSeats.AsNoTracking()
                .Where(x => x.HallId == details.HallId && x.IsActive)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToListAsync();
            var seatIds = seats.Select(x => x.SeatId).ToList();
            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => seats.Select(seat => seat.SeatTypeId).Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId);
            var standardSeatTypeId = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => x.TypeName.ToLower().Contains("standard"))
                .OrderBy(x => x.SeatTypeId)
                .Select(x => x.SeatTypeId)
                .FirstOrDefaultAsync();
            if (standardSeatTypeId == 0)
            {
                standardSeatTypeId = await _context.CinemaSeatTypes.AsNoTracking()
                    .OrderBy(x => x.SeatTypeId)
                    .Select(x => x.SeatTypeId)
                    .FirstOrDefaultAsync();
            }

            var dayTypes = await _context.CinemaDayTypes.AsNoTracking().ToListAsync();
            var priceSeatTypeIds = seatTypes.Keys.Append(standardSeatTypeId).Distinct().ToList();
            var priceRules = await _context.CinemaTicketPrices.AsNoTracking()
                .Where(x =>
                    x.CinemaId == details.Hall.CinemaId &&
                    x.HallTypeId == details.Hall.HallTypeId &&
                    priceSeatTypeIds.Contains(x.SeatTypeId))
                .ToListAsync();
            var bookedSeatIds = await _context.CinemaTickets.AsNoTracking()
                .Join(
                    _context.CinemaBookings.AsNoTracking()
                        .Where(x => x.ShowtimeId == id && x.Status != "cancelled"),
                    ticket => ticket.BookingId,
                    booking => booking.BookingId,
                    (ticket, booking) => ticket.SeatId)
                .Where(x => seatIds.Contains(x))
                .ToHashSetAsync();
            var locks = await _context.CinemaSeatLocks.AsNoTracking()
                .Where(x => x.ShowtimeId == id && x.ExpiresAt > now && seatIds.Contains(x.SeatId))
                .ToListAsync();
            var lockBySeat = locks.ToDictionary(x => x.SeatId);

            return Ok(seats.Select(seat =>
            {
                seatTypes.TryGetValue(seat.SeatTypeId, out var seatType);
                lockBySeat.TryGetValue(seat.SeatId, out var seatLock);
                var isCurrentSession = seatLock != null &&
                    userId.HasValue &&
                    seatLock.UserId == userId.Value &&
                    seatLock.SessionId == sessionId;

                return new
                {
                    seatId = seat.SeatId,
                    seat.HallId,
                    seat.SeatTypeId,
                    seatTypeName = seatType?.TypeName,
                    seat.RowLabel,
                    seat.ColNumber,
                    seat.SeatCode,
                    price = TicketPriceCalculator.ResolvePrice(
                        showtime,
                        details.Hall.CinemaId,
                        details.Hall.HallTypeId,
                        seat.SeatTypeId,
                        seatType?.PriceModifier ?? 0,
                        standardSeatTypeId,
                        dayTypes,
                        priceRules),
                    isBooked = bookedSeatIds.Contains(seat.SeatId),
                    isLocked = seatLock != null && !isCurrentSession,
                    isLockedByCurrentSession = isCurrentSession,
                    lockExpiresAt = seatLock?.ExpiresAt
                };
            }));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ShowtimeDto dto)
        {
            if (!await _context.CinemaMovies.AnyAsync(x => x.MovieId == dto.MovieId))
            {
                return BadRequest(new { message = "Movie not found" });
            }

            if (!await _context.CinemaHalls.AnyAsync(x => x.HallId == dto.HallId))
            {
                return BadRequest(new { message = "Hall not found" });
            }

            var request = new DTO.Theater.ShowtimeDTO.ShowtimeRequest
            {
                MovieId = dto.MovieId,
                HallId = dto.HallId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LanguageType = dto.LanguageType ?? "subtitled",
                IsSpecial = dto.IsSpecial,
                Status = dto.Status ?? "scheduled"
            };

            try
            {
                await _showtimeService.CreateAsync(request);
                return NoContent();
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] ShowtimeDto dto)
        {
            var showtime = await _context.CinemaShowtimes.FindAsync(id);
            if (showtime == null)
            {
                return NotFound(new { message = "Showtime not found" });
            }

            if (!await _context.CinemaMovies.AnyAsync(x => x.MovieId == dto.MovieId))
            {
                return BadRequest(new { message = "Movie not found" });
            }

            if (!await _context.CinemaHalls.AnyAsync(x => x.HallId == dto.HallId))
            {
                return BadRequest(new { message = "Hall not found" });
            }

            var request = new DTO.Theater.ShowtimeDTO.ShowtimeRequest
            {
                MovieId = dto.MovieId,
                HallId = dto.HallId,
                StartTime = dto.StartTime,
                EndTime = dto.EndTime,
                LanguageType = dto.LanguageType,
                IsSpecial = dto.IsSpecial,
                Status = dto.Status
            };

            try
            {
                await _showtimeService.UpdateAsync(id, request);
                return Ok(await _showtimeService.GetShowtimeByIdAsync(id));
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var showtime = await _context.CinemaShowtimes.FindAsync(id);
            if (showtime == null)
            {
                return NotFound(new { message = "Showtime not found" });
            }

            if (await _context.CinemaBookings.AnyAsync(x => x.ShowtimeId == id && x.Status != "cancelled"))
            {
                return BadRequest(new { message = "Cannot delete showtime because it has bookings" });
            }

            _context.CinemaSeatLocks.RemoveRange(_context.CinemaSeatLocks.Where(x => x.ShowtimeId == id));
            _context.CinemaShowtimes.Remove(showtime);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{id:int}/locks")]
        public async Task<IActionResult> LockSeats(int id, [FromBody] SeatLockDto dto)
        {
            if (dto.UserId <= 0 || string.IsNullOrWhiteSpace(dto.SessionId))
            {
                return BadRequest(new { message = "UserId and SessionId are required" });
            }

            try
            {
                var locks = await _showtimeService.LockSeatsAsync(id, dto.UserId, dto.SessionId, dto.SeatIds, dto.Minutes);
                return Ok(locks);
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/unlocks")]
        public async Task<IActionResult> UnlockSeats(int id, [FromBody] SeatUnlockDto dto)
        {
            if (dto.UserId <= 0 || string.IsNullOrWhiteSpace(dto.SessionId))
            {
                return BadRequest(new { message = "UserId and SessionId are required" });
            }

            await _showtimeService.UnlockSeatsAsync(id, dto.UserId, dto.SessionId);
            return Ok(new { message = "Seats unlocked" });
        }
    }

    public class SeatUnlockDto
    {
        public int UserId { get; set; }
        public string? SessionId { get; set; }
    }

    public class ShowtimeDto
    {
        public int MovieId { get; set; }
        public int HallId { get; set; }
        public DateTime StartTime { get; set; }
        public DateTime? EndTime { get; set; }
        public string? LanguageType { get; set; }
        public bool IsSpecial { get; set; }
        public string? Status { get; set; }
    }

    public class SeatLockDto
    {
        public int UserId { get; set; }
        public string? SessionId { get; set; }
        public int Minutes { get; set; } = 10;
        public List<int> SeatIds { get; set; } = new();
    }
}
