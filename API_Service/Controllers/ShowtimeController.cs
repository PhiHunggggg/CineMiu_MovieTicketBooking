using Entities;
using Repository;
using Services;
using Services.Booking;
using Services.Theater;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;
using System.Text;

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
            [FromQuery] DateTime? dateFrom,
            [FromQuery] DateTime? dateTo,
            [FromQuery] string? status,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 12,
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
                dateFrom,
                dateTo,
                status,
                page,
                pageSize);
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

            var now = DateTime.UtcNow;
            var seats = await _context.CinemaSeats.AsNoTracking()
                .Where(x => x.HallId == details.HallId && x.IsActive)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToListAsync();
            var seatIds = seats.Select(x => x.SeatId).ToList();
            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => seats.Select(seat => seat.SeatTypeId).Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId);
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
            var dayTypes = await _context.CinemaDayTypes.AsNoTracking().ToListAsync();
            var dayTypeId = ResolveDayTypeId(details.StartTime, details.IsSpecial, dayTypes);
            var timeSlot = ResolveTimeSlot(details.StartTime);
            var seatTypeIds = seats.Select(x => x.SeatTypeId).Distinct().ToList();
            var priceRules = dayTypeId.HasValue
                ? await _context.CinemaTicketPrices.AsNoTracking()
                    .Where(x =>
                        x.CinemaId == details.Cinema.CinemaId &&
                        x.HallTypeId == details.Hall.HallTypeId &&
                        seatTypeIds.Contains(x.SeatTypeId) &&
                        x.DayTypeId == dayTypeId.Value &&
                        x.EffectiveFrom <= details.StartTime &&
                        (!x.EffectiveTo.HasValue || x.EffectiveTo.Value >= details.StartTime))
                    .ToListAsync()
                : [];

            decimal ResolveSeatPrice(byte seatTypeId, decimal modifier)
            {
                var rule = priceRules
                    .Where(x => x.SeatTypeId == seatTypeId &&
                        (string.Equals(x.TimeSlot, timeSlot, StringComparison.OrdinalIgnoreCase) ||
                         string.Equals(x.TimeSlot, "all_day", StringComparison.OrdinalIgnoreCase)))
                    .OrderByDescending(x => string.Equals(x.TimeSlot, timeSlot, StringComparison.OrdinalIgnoreCase))
                    .ThenByDescending(x => x.EffectiveFrom)
                    .FirstOrDefault();

                // BasePrice in ticket_prices is already the final price for a seat type.
                // PriceModifier is only a backwards-compatible fallback when no rule exists.
                return rule?.BasePrice ?? Math.Max(0, details.BasePrice + modifier);
            }

            return Ok(seats.Select(seat =>
            {
                seatTypes.TryGetValue(seat.SeatTypeId, out var seatType);
                lockBySeat.TryGetValue(seat.SeatId, out var seatLock);
                var isCurrentSession = seatLock != null &&
                    userId.HasValue &&
                    seatLock.UserId == userId.Value &&
                    seatLock.SessionId == sessionId;
                var isBooked = bookedSeatIds.Contains(seat.SeatId);
                var isLocked = seatLock != null && !isCurrentSession;
                var finalPrice = ResolveSeatPrice(seat.SeatTypeId, seatType?.PriceModifier ?? 0);

                return new
                {
                    seatId = seat.SeatId,
                    seat.HallId,
                    seat.SeatTypeId,
                    seatTypeName = seatType?.TypeName,
                    seat.RowLabel,
                    seat.ColNumber,
                    seat.SeatCode,
                    price = finalPrice,
                    finalPrice,
                    status = isBooked ? "booked" : isLocked ? "locked" : "available",
                    isBooked,
                    isLocked,
                    isLockedByCurrentSession = isCurrentSession,
                    lockExpiresAt = seatLock?.ExpiresAt
                };
            }));
        }

        private static byte? ResolveDayTypeId(DateTime startTime, bool isSpecial, List<DayType> dayTypes)
        {
            if (dayTypes.Count == 0) return null;

            var names = isSpecial
                ? new[] { "holiday", "ngay le", "special" }
                : startTime.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
                    ? new[] { "weekend", "cuoi tuan" }
                    : new[] { "weekday", "ngay thuong" };

            foreach (var name in names)
            {
                var match = dayTypes.FirstOrDefault(x =>
                    NormalizeLookup(x.TypeName).Contains(name) ||
                    (!string.IsNullOrWhiteSpace(x.Description) && NormalizeLookup(x.Description).Contains(name)));
                if (match != null) return match.DayTypeId;
            }

            return dayTypes.OrderBy(x => x.DayTypeId).First().DayTypeId;
        }

        private static string ResolveTimeSlot(DateTime startTime) => startTime.Hour switch
        {
            < 12 => "morning",
            < 18 => "afternoon",
            < 23 => "evening",
            _ => "late_night"
        };

        private static string NormalizeLookup(string value)
        {
            var normalized = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var result = new StringBuilder(normalized.Length);
            foreach (var character in normalized)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    result.Append(character);
                }
            }
            return result.ToString().Normalize(NormalizationForm.FormC);
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
