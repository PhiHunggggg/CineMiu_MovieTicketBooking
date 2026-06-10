using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;
using static Entities.Bookings;

namespace API_Service.Controllers
{
    [Route("api/showtimes")]
    [ApiController]
    public class ShowtimeController(SqlServerDbContext context) : ControllerBase
    {
        public class SeatLockRequest
        {
            public int? UserId { get; set; }
            public string SessionId { get; set; } = "";
            public List<int> SeatIds { get; set; } = [];
            public int Minutes { get; set; } = 10;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? movieId, [FromQuery] int? cinemaId, [FromQuery] DateTime? date, [FromQuery] DateTime? dateFrom, [FromQuery] DateTime? dateTo)
        {
            var query =
                from st in context.ShowTimes.AsNoTracking()
                join movie in context.Movies.AsNoTracking() on st.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on st.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                where cinema.IsActive
                select new { st, movie, hall, cinema };

            if (movieId.HasValue)
            {
                query = query.Where(x => x.st.MovieId == movieId.Value);
            }

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.hall.CinemaId == cinemaId.Value);
            }

            if (date.HasValue)
            {
                var selectedDate = date.Value.Date;
                query = query.Where(x => x.st.StartTime.Date == selectedDate);
            }
            else
            {
                if (dateFrom.HasValue)
                {
                    var from = dateFrom.Value.Date;
                    query = query.Where(x => x.st.StartTime >= from);
                }

                if (dateTo.HasValue)
                {
                    var toExclusive = dateTo.Value.Date.AddDays(1);
                    query = query.Where(x => x.st.StartTime < toExclusive);
                }
            }

            var rows = await query.OrderBy(x => x.st.StartTime).ToListAsync();
            var showtimeIds = rows.Select(x => x.st.ShowtimeId).ToList();
            var hallIds = rows.Select(x => x.hall.HallId).Distinct().ToList();

            var totalSeatsByHall = await context.Seats
                .AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
                .GroupBy(x => x.HallId)
                .Select(x => new { HallId = x.Key, TotalSeats = x.Count() })
                .ToDictionaryAsync(x => x.HallId, x => x.TotalSeats);

            var bookingIds = await context.Bookings
                .AsNoTracking()
                .Where(x => showtimeIds.Contains(x.ShowtimeId) && x.Status != "cancelled")
                .Select(x => x.BookingId)
                .ToListAsync();

            var bookedSeatsByShowtime = await context.Tickets
                .AsNoTracking()
                .Join(context.Bookings.AsNoTracking(), t => t.BookingId, b => b.BookingId, (t, b) => new { t.SeatId, b.ShowtimeId, b.BookingId })
                .Where(x => bookingIds.Contains(x.BookingId))
                .GroupBy(x => x.ShowtimeId)
                .Select(x => new { ShowtimeId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.ShowtimeId, x => x.Count);

            var now = DateTime.UtcNow;
            var lockedSeatsByShowtime = await context.SeatLocks
                .AsNoTracking()
                .Where(x => showtimeIds.Contains(x.ShowtimeId) && x.ExpiresAt > now)
                .GroupBy(x => x.ShowtimeId)
                .Select(x => new { ShowtimeId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.ShowtimeId, x => x.Count);

            var result = rows.Select(x =>
            {
                var totalSeats = totalSeatsByHall.GetValueOrDefault(x.hall.HallId, 0);
                var usedSeats = bookedSeatsByShowtime.GetValueOrDefault(x.st.ShowtimeId, 0) + lockedSeatsByShowtime.GetValueOrDefault(x.st.ShowtimeId, 0);
                var availableSeats = Math.Max(0, totalSeats - usedSeats);

                return new
                {
                    showtime = new
                    {
                        x.st.ShowtimeId,
                        Id = x.st.ShowtimeId,
                        x.st.MovieId,
                        x.st.HallId,
                        x.st.StartTime,
                        x.st.EndTime,
                        x.st.LanguageType,
                        x.st.IsSpecial,
                        x.st.Status,
                        BasePrice = 75000m,
                        TotalSeats = totalSeats,
                        AvailableSeats = availableSeats
                    },
                    movie = new
                    {
                        x.movie.MovieId,
                        Id = x.movie.MovieId,
                        x.movie.Title,
                        x.movie.PosterUrl,
                        x.movie.DurationMins,
                        x.movie.AgeRating
                    },
                    hall = new
                    {
                        x.hall.HallId,
                        Id = x.hall.HallId,
                        Name = x.hall.HallName,
                        HallName = x.hall.HallName,
                        x.hall.HallTypeId,
                        x.hall.TotalSeats
                    },
                    cinema = new
                    {
                        x.cinema.CinemaId,
                        Id = x.cinema.CinemaId,
                        Name = x.cinema.CinemaName,
                        CinemaName = x.cinema.CinemaName,
                        x.cinema.Address,
                        x.cinema.City,
                        x.cinema.District,
                        x.cinema.ImageUrl
                    }
                };
            });

            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var detail = await (
                from st in context.ShowTimes.AsNoTracking()
                join hall in context.Halls.AsNoTracking() on st.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                where st.ShowtimeId == id
                select new { st, hall, cinema }
            ).FirstOrDefaultAsync();

            if (detail == null)
            {
                return NotFound();
            }

            var bookingIds = await context.Bookings
                .AsNoTracking()
                .Where(x => x.ShowtimeId == id && x.Status != "cancelled")
                .Select(x => x.BookingId)
                .ToListAsync();

            var bookedSeatIds = await context.Tickets
                .AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .Select(x => x.SeatId)
                .ToListAsync();

            var lockedSeatIds = await context.SeatLocks
                .AsNoTracking()
                .Where(x => x.ShowtimeId == id && x.ExpiresAt > DateTime.UtcNow)
                .Select(x => x.SeatId)
                .ToListAsync();

            var unavailable = bookedSeatIds.Concat(lockedSeatIds).ToHashSet();

            var seats = await context.Seats
                .AsNoTracking()
                .Where(x => x.HallId == detail.hall.HallId && x.IsActive)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .Select(x => new
                {
                    Id = x.SeatId,
                    x.SeatId,
                    x.SeatCode,
                    x.RowLabel,
                    x.ColNumber,
                    x.SeatTypeId,
                    FinalPrice = 75000m,
                    Status = unavailable.Contains(x.SeatId) ? "booked" : "available"
                })
                .ToListAsync();

            return Ok(new
            {
                showtime = new
                {
                    detail.st.ShowtimeId,
                    Id = detail.st.ShowtimeId,
                    detail.st.MovieId,
                    detail.st.HallId,
                    detail.st.StartTime,
                    detail.st.EndTime,
                    detail.st.Status,
                    BasePrice = 75000m
                },
                hall = new
                {
                    detail.hall.HallId,
                    Name = detail.hall.HallName,
                    HallName = detail.hall.HallName
                },
                cinema = new
                {
                    detail.cinema.CinemaId,
                    Name = detail.cinema.CinemaName,
                    CinemaName = detail.cinema.CinemaName
                },
                seats
            });
        }

        [HttpPost("{id:int}/lock-seats")]
        [HttpPost("{id:int}/locks")]
        public async Task<IActionResult> LockSeats(int id, [FromBody] SeatLockRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.SessionId) || request.SeatIds.Count == 0)
            {
                return BadRequest(new { message = "Thiếu thông tin giữ ghế." });
            }

            var now = DateTime.UtcNow;
            var expiresAt = now.AddMinutes(Math.Clamp(request.Minutes, 1, 30));
            var userId = request.UserId ?? 0;

            var existingLocks = await context.SeatLocks
                .Where(x => x.ShowtimeId == id && request.SeatIds.Contains(x.SeatId))
                .ToListAsync();

            var lockedByOthers = existingLocks
                .Where(x => x.ExpiresAt > now && x.SessionId != request.SessionId)
                .Select(x => x.SeatId)
                .ToList();

            if (lockedByOthers.Count > 0)
            {
                return Conflict(new { message = "Một số ghế vừa được người khác giữ.", seatIds = lockedByOthers });
            }

            context.SeatLocks.RemoveRange(existingLocks.Where(x => x.ExpiresAt <= now || x.SessionId == request.SessionId));

            var locks = request.SeatIds.Distinct().Select(seatId => new SeatLock
            {
                ShowtimeId = id,
                SeatId = seatId,
                UserId = userId,
                SessionId = request.SessionId,
                LockedAt = now,
                ExpiresAt = expiresAt
            });

            context.SeatLocks.AddRange(locks);
            await context.SaveChangesAsync();

            return Ok(new { message = "Seats locked", sessionId = request.SessionId, expiresAt });
        }

        [HttpPost("{id:int}/unlock-seats")]
        [HttpPost("{id:int}/unlocks")]
        public async Task<IActionResult> UnlockSeats(int id, [FromBody] SeatLockRequest request)
        {
            var locks = await context.SeatLocks
                .Where(x => x.ShowtimeId == id && x.SessionId == request.SessionId)
                .ToListAsync();

            context.SeatLocks.RemoveRange(locks);
            await context.SaveChangesAsync();

            return Ok(new { message = "Seats unlocked" });
        }
    }
}
