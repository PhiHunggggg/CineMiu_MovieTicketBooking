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
            [FromQuery] int? cinemaId)
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

            var rangeStart = month.HasValue
                ? new DateTime(selectedYear, month.Value, 1)
                : new DateTime(selectedYear, 1, 1);
            var rangeEnd = month.HasValue
                ? rangeStart.AddMonths(1)
                : rangeStart.AddYears(1);

            var bookingRows = await (
                from booking in context.Bookings.AsNoTracking()
                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                where booking.CreatedAt >= rangeStart &&
                      booking.CreatedAt < rangeEnd &&
                      (!cinemaId.HasValue || cinema.CinemaId == cinemaId.Value)
                select new
                {
                    booking.BookingId,
                    booking.Status,
                    booking.FinalAmount,
                    booking.CreatedAt,
                    booking.ConfirmedAt,
                    movie.MovieId,
                    MovieTitle = movie.Title,
                    cinema.CinemaId,
                    CinemaName = cinema.CinemaName
                })
                .ToListAsync();

            var bookingIds = bookingRows.Select(x => x.BookingId).ToList();
            var ticketRows = await (
                from ticket in context.Tickets.AsNoTracking()
                join seatType in context.SeatTypes.AsNoTracking() on ticket.SeatTypeId equals seatType.SeatTypeId
                where bookingIds.Contains(ticket.BookingId)
                select new
                {
                    ticket.BookingId,
                    ticket.Price,
                    seatType.SeatTypeId,
                    SeatTypeName = seatType.TypeName
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

            var successfulStatuses = new[] { "confirmed", "paid", "completed" };
            var soldBookings = bookingRows
                .Where(x => successfulStatuses.Contains(x.Status))
                .ToList();
            var soldBookingIds = soldBookings.Select(x => x.BookingId).ToHashSet();
            var soldTickets = ticketRows.Where(x => soldBookingIds.Contains(x.BookingId)).ToList();

            decimal NetRevenue(dynamic booking)
            {
                return Math.Max((decimal)booking.FinalAmount - refunds.GetValueOrDefault((int)booking.BookingId), 0);
            }

            var monthlyRevenue = soldBookings
                .GroupBy(x => (x.ConfirmedAt ?? x.CreatedAt).Month)
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

            var revenueBySeatType = soldTickets
                .GroupBy(x => new { x.SeatTypeId, x.SeatTypeName })
                .Select(group => new
                {
                    seatTypeId = group.Key.SeatTypeId,
                    seatTypeName = group.Key.SeatTypeName,
                    totalTickets = group.Count(),
                    totalRevenue = group.Sum(x => x.Price)
                })
                .OrderByDescending(x => x.totalRevenue)
                .ToList();

            var dailyDetails = soldBookings
                .GroupBy(x => new
                {
                    Date = (x.ConfirmedAt ?? x.CreatedAt).Date,
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

            var cancelledIds = bookingRows.Where(x => x.Status == "cancelled").Select(x => x.BookingId).ToHashSet();
            var pendingIds = bookingRows.Where(x => x.Status == "pending").Select(x => x.BookingId).ToHashSet();
            var ticketStatusSummary = new[]
            {
                new
                {
                    status = "sold",
                    label = "Vé bán thành công",
                    totalBookings = soldBookings.Count,
                    totalTickets = soldTickets.Count
                },
                new
                {
                    status = "refunded",
                    label = "Vé hủy/hoàn tiền",
                    totalBookings = cancelledIds.Count,
                    totalTickets = ticketRows.Count(x => cancelledIds.Contains(x.BookingId))
                },
                new
                {
                    status = "pending",
                    label = "Vé chờ xử lý",
                    totalBookings = pendingIds.Count,
                    totalTickets = ticketRows.Count(x => pendingIds.Contains(x.BookingId))
                }
            };

            return Ok(new
            {
                year = selectedYear,
                month,
                cinemaId,
                totalRevenue = soldBookings.Sum(NetRevenue),
                totalBookings = soldBookings.Count,
                totalTickets = soldTickets.Count,
                monthlyRevenue,
                revenueBySeatType,
                revenueByMovie,
                ticketStatusSummary,
                dailyDetails,
                items
            });
        }
    }
}
