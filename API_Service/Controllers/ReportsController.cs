using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/reports")]
    [ApiController]
    public class ReportsController(SqlServerDbContext context) : ControllerBase
    {
        [HttpGet("revenue")]
        public async Task<IActionResult> GetRevenue(
            [FromQuery] int? year,
            [FromQuery] int? month,
            [FromQuery] int? cinemaId,
            [FromQuery] int? movieId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var selectedYear = year.GetValueOrDefault(DateTime.Today.Year);
            if (selectedYear is < 2000 or > 2100)
            {
                return BadRequest(new { message = "Year is invalid" });
            }

            if (month.HasValue && month is < 1 or > 12)
            {
                return BadRequest(new { message = "Month is invalid" });
            }

            var range = ResolveReportRange(selectedYear, month, startDate, endDate);
            if (range.Error != null)
            {
                return BadRequest(new { message = range.Error });
            }

            var rangeStart = range.Start;
            var rangeEnd = range.End;

            var bookingRows = await (
                from booking in context.Bookings.AsNoTracking()
                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                let revenueDate = booking.ConfirmedAt ?? booking.CreatedAt
                where revenueDate >= rangeStart &&
                      revenueDate < rangeEnd &&
                      (!cinemaId.HasValue || cinema.CinemaId == cinemaId.Value) &&
                      (!movieId.HasValue || movie.MovieId == movieId.Value)
                select new
                {
                    booking.BookingId,
                    booking.Status,
                    booking.FinalAmount,
                    booking.CreatedAt,
                    booking.ConfirmedAt,
                    RevenueDate = revenueDate,
                    movie.MovieId,
                    MovieTitle = movie.Title,
                    cinema.CinemaId,
                    CinemaName = cinema.CinemaName
                })
                .ToListAsync();

            var bookingIds = bookingRows.Select(x => x.BookingId).ToList();
            var ticketRows = await context.Tickets.AsNoTracking()
                .Where(ticket => bookingIds.Contains(ticket.BookingId))
                .Select(ticket => new { ticket.BookingId })
                .ToListAsync();
            var concessionRows = await context.BookingConcessions.AsNoTracking()
                .Where(concession => bookingIds.Contains(concession.BookingId))
                .Select(concession => new
                {
                    concession.BookingId,
                    concession.Subtotal
                })
                .ToListAsync();
            var refunds = await context.Payments.AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .GroupBy(x => x.BookingId)
                .Select(group => new
                {
                    BookingId = group.Key,
                    Refunded = group.Sum(x => x.RefundAmount ?? 0)
                })
                .ToDictionaryAsync(x => x.BookingId, x => x.Refunded);

            var soldBookings = bookingRows
                .Where(x => IsSuccessfulBookingStatus(x.Status))
                .ToList();
            var soldBookingIds = soldBookings.Select(x => x.BookingId).ToHashSet();
            var soldTickets = ticketRows.Where(x => soldBookingIds.Contains(x.BookingId)).ToList();
            var soldConcessions = concessionRows.Where(x => soldBookingIds.Contains(x.BookingId)).ToList();

            decimal NetRevenue(dynamic booking)
            {
                return Math.Max((decimal)booking.FinalAmount - refunds.GetValueOrDefault((int)booking.BookingId), 0);
            }

            var monthlyRevenue = soldBookings
                .GroupBy(x => x.RevenueDate.Month)
                .Select(group => new
                {
                    month = group.Key,
                    label = $"Tháng {group.Key}",
                    totalBookings = group.Count(),
                    totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
                    totalRevenue = group.Sum(NetRevenue)
                })
                .OrderBy(x => x.month)
                .ToList();

            var revenueByMovie = soldBookings
                .GroupBy(x => new { x.MovieId, x.MovieTitle })
                .Select(group => new
                {
                    movieId = group.Key.MovieId,
                    movieTitle = group.Key.MovieTitle,
                    totalBookings = group.Count(),
                    totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
                    totalRevenue = group.Sum(NetRevenue)
                })
                .OrderByDescending(x => x.totalRevenue)
                .ToList();

            var dailyDetails = soldBookings
                .GroupBy(x => new
                {
                    Date = x.RevenueDate.Date,
                    x.CinemaId,
                    x.CinemaName,
                    x.MovieId,
                    x.MovieTitle
                })
                .Select(group => new
                {
                    date = group.Key.Date,
                    cinemaId = group.Key.CinemaId,
                    cinemaName = group.Key.CinemaName,
                    movieId = group.Key.MovieId,
                    movieTitle = group.Key.MovieTitle,
                    totalBookings = group.Count(),
                    totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
                    totalRevenue = group.Sum(NetRevenue)
                })
                .OrderBy(x => x.date)
                .ThenBy(x => x.cinemaName)
                .ToList();

            var items = soldBookings
                .GroupBy(x => new { x.CinemaId, x.CinemaName })
                .Select(group => new
                {
                    cinemaId = group.Key.CinemaId,
                    cinemaName = group.Key.CinemaName,
                    totalBookings = group.Count(),
                    totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
                    totalRevenue = group.Sum(NetRevenue)
                })
                .OrderByDescending(x => x.totalRevenue)
                .ToList();

            var cancelledIds = bookingRows.Where(x => IsBookingStatus(x.Status, "cancelled")).Select(x => x.BookingId).ToHashSet();
            var pendingIds = bookingRows.Where(x => IsBookingStatus(x.Status, "pending")).Select(x => x.BookingId).ToHashSet();
            var soldTicketCount = soldTickets.Count;
            var cancelledTicketCount = ticketRows.Count(x => cancelledIds.Contains(x.BookingId));
            var pendingTicketCount = ticketRows.Count(x => pendingIds.Contains(x.BookingId));
            var ticketStatusTotal = soldTicketCount + cancelledTicketCount + pendingTicketCount;

            static decimal Percent(int value, int total)
            {
                return total <= 0 ? 0 : Math.Round(value * 100m / total, 2);
            }

            var ticketStatusSummary = new[]
            {
                new
                {
                    status = "sold",
                    label = "Vé bán thành công",
                    totalBookings = soldBookings.Count,
                    totalTickets = soldTicketCount,
                    percentage = Percent(soldTicketCount, ticketStatusTotal)
                },
                new
                {
                    status = "refunded",
                    label = "Vé hủy/hoàn tiền",
                    totalBookings = cancelledIds.Count,
                    totalTickets = cancelledTicketCount,
                    percentage = Percent(cancelledTicketCount, ticketStatusTotal)
                },
                new
                {
                    status = "pending",
                    label = "Vé chờ xử lý",
                    totalBookings = pendingIds.Count,
                    totalTickets = pendingTicketCount,
                    percentage = Percent(pendingTicketCount, ticketStatusTotal)
                }
            };

            var grossRevenue = soldBookings.Sum(x => x.FinalAmount);
            var netRevenue = soldBookings.Sum(NetRevenue);
            var concessionRevenue = soldConcessions.Sum(x => x.Subtotal);

            return Ok(new
            {
                year = selectedYear,
                month,
                cinemaId,
                movieId,
                startDate = rangeStart,
                endDate = rangeEnd.AddDays(-1),
                totalRevenue = netRevenue,
                grossRevenue,
                concessionRevenue,
                netRevenue,
                totalBookings = soldBookings.Count,
                totalTickets = soldTickets.Count,
                monthlyRevenue,
                revenueByMovie,
                revenueByCinema = items,
                ticketStatusSummary,
                dailyDetails,
                items
            });
        }

        [HttpGet("occupancy")]
        public async Task<IActionResult> GetOccupancy(
            [FromQuery] int? year,
            [FromQuery] int? month,
            [FromQuery] int? cinemaId,
            [FromQuery] int? movieId,
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var selectedYear = year.GetValueOrDefault(DateTime.Today.Year);
            if (selectedYear is < 2000 or > 2100)
            {
                return BadRequest(new { message = "Year is invalid" });
            }

            if (month.HasValue && month is < 1 or > 12)
            {
                return BadRequest(new { message = "Month is invalid" });
            }

            var range = ResolveReportRange(selectedYear, month, startDate, endDate);
            if (range.Error != null)
            {
                return BadRequest(new { message = range.Error });
            }

            var rangeStart = range.Start;
            var rangeEnd = range.End;

            var showtimeRows = await (
                from showtime in context.ShowTimes.AsNoTracking()
                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                where showtime.StartTime >= rangeStart &&
                      showtime.StartTime < rangeEnd &&
                      showtime.Status.ToLower() != "cancelled" &&
                      (!cinemaId.HasValue || cinema.CinemaId == cinemaId.Value) &&
                      (!movieId.HasValue || movie.MovieId == movieId.Value)
                select new
                {
                    showtime.ShowtimeId,
                    showtime.StartTime,
                    showtime.EndTime,
                    showtime.Status,
                    movie.MovieId,
                    MovieTitle = movie.Title,
                    hall.HallId,
                    hall.HallName,
                    hall.TotalSeats,
                    cinema.CinemaId,
                    CinemaName = cinema.CinemaName
                })
                .OrderBy(x => x.StartTime)
                .ToListAsync();

            var showtimeIds = showtimeRows.Select(x => x.ShowtimeId).ToList();
            var hallIds = showtimeRows.Select(x => x.HallId).Distinct().ToList();

            var activeSeatCounts = await context.Seats.AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
                .GroupBy(x => x.HallId)
                .Select(group => new { HallId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.HallId, x => x.Count);

            var bookedSeatCounts = await context.Tickets.AsNoTracking()
                .Join(
                    context.Bookings.AsNoTracking()
                        .Where(x => showtimeIds.Contains(x.ShowtimeId) &&
                                    (x.Status.ToLower() == "confirmed" ||
                                     x.Status.ToLower() == "paid" ||
                                     x.Status.ToLower() == "completed")),
                    ticket => ticket.BookingId,
                    booking => booking.BookingId,
                    (ticket, booking) => new { booking.ShowtimeId, ticket.SeatId })
                .Distinct()
                .GroupBy(x => x.ShowtimeId)
                .Select(group => new { ShowtimeId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.ShowtimeId, x => x.Count);

            static decimal Percent(int value, int total)
            {
                return total <= 0 ? 0 : Math.Round(value * 100m / total, 2);
            }

            var showtimes = showtimeRows.Select(row =>
            {
                var totalSeats = activeSeatCounts.GetValueOrDefault(row.HallId, row.TotalSeats);
                var bookedSeats = Math.Min(bookedSeatCounts.GetValueOrDefault(row.ShowtimeId), totalSeats);
                var emptySeats = Math.Max(totalSeats - bookedSeats, 0);

                return new
                {
                    row.ShowtimeId,
                    row.StartTime,
                    row.EndTime,
                    row.Status,
                    row.MovieId,
                    row.MovieTitle,
                    row.HallId,
                    row.HallName,
                    row.CinemaId,
                    row.CinemaName,
                    totalSeats,
                    bookedSeats,
                    emptySeats,
                    occupancyRate = Percent(bookedSeats, totalSeats),
                    vacancyRate = Percent(emptySeats, totalSeats)
                };
            }).ToList();

            var totalSeatsAll = showtimes.Sum(x => x.totalSeats);
            var bookedSeatsAll = showtimes.Sum(x => x.bookedSeats);
            var emptySeatsAll = showtimes.Sum(x => x.emptySeats);

            var byCinema = showtimes
                .GroupBy(x => new { x.CinemaId, x.CinemaName })
                .Select(group =>
                {
                    var totalSeats = group.Sum(x => x.totalSeats);
                    var bookedSeats = group.Sum(x => x.bookedSeats);
                    var emptySeats = group.Sum(x => x.emptySeats);
                    return new
                    {
                        group.Key.CinemaId,
                        group.Key.CinemaName,
                        totalShowtimes = group.Count(),
                        totalSeats,
                        bookedSeats,
                        emptySeats,
                        occupancyRate = Percent(bookedSeats, totalSeats),
                        vacancyRate = Percent(emptySeats, totalSeats)
                    };
                })
                .OrderByDescending(x => x.occupancyRate)
                .ToList();

            var byMovie = showtimes
                .GroupBy(x => new { x.MovieId, x.MovieTitle })
                .Select(group =>
                {
                    var totalSeats = group.Sum(x => x.totalSeats);
                    var bookedSeats = group.Sum(x => x.bookedSeats);
                    var emptySeats = group.Sum(x => x.emptySeats);
                    return new
                    {
                        group.Key.MovieId,
                        group.Key.MovieTitle,
                        totalShowtimes = group.Count(),
                        totalSeats,
                        bookedSeats,
                        emptySeats,
                        occupancyRate = Percent(bookedSeats, totalSeats),
                        vacancyRate = Percent(emptySeats, totalSeats)
                    };
                })
                .OrderByDescending(x => x.occupancyRate)
                .ToList();

            return Ok(new
            {
                year = selectedYear,
                month,
                cinemaId,
                movieId,
                startDate = rangeStart,
                endDate = rangeEnd.AddDays(-1),
                totalShowtimes = showtimes.Count,
                totalSeats = totalSeatsAll,
                bookedSeats = bookedSeatsAll,
                emptySeats = emptySeatsAll,
                occupancyRate = Percent(bookedSeatsAll, totalSeatsAll),
                vacancyRate = Percent(emptySeatsAll, totalSeatsAll),
                byCinema,
                byMovie,
                showtimes
            });
        }

        private static bool IsSuccessfulBookingStatus(string? status)
        {
            return IsBookingStatus(status, "confirmed") ||
                   IsBookingStatus(status, "paid") ||
                   IsBookingStatus(status, "completed");
        }

        private static bool IsBookingStatus(string? status, string expected)
        {
            return string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);
        }

        private static (DateTime Start, DateTime End, string? Error) ResolveReportRange(
            int selectedYear,
            int? month,
            DateTime? startDate,
            DateTime? endDate)
        {
            if (startDate.HasValue || endDate.HasValue)
            {
                if (!startDate.HasValue || !endDate.HasValue)
                {
                    return (default, default, "Start date and end date are required together");
                }

                var start = startDate.Value.Date;
                var end = endDate.Value.Date.AddDays(1);
                if (end <= start)
                {
                    return (default, default, "End date must be on or after start date");
                }

                return (start, end, null);
            }

            var rangeStart = month.HasValue
                ? new DateTime(selectedYear, month.Value, 1)
                : new DateTime(selectedYear, 1, 1);
            var rangeEnd = month.HasValue
                ? rangeStart.AddMonths(1)
                : rangeStart.AddYears(1);

            return (rangeStart, rangeEnd, null);
        }
    }
}
