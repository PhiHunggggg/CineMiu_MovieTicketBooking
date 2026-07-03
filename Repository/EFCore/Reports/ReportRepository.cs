using DTO.Reports;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Reports;

public class ReportRepository(SqlServerDbContext context) : IReportRepository
{
    public async Task<object> GetRevenueAsync(ReportDTO.Range range)
    {
        var bookingRows = await (
            from booking in context.Bookings.AsNoTracking()
            join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
            join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
            join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
            join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
            let revenueDate = booking.ConfirmedAt ?? booking.CreatedAt
            where revenueDate >= range.Start && revenueDate < range.EndExclusive &&
                  (!range.CinemaId.HasValue || cinema.CinemaId == range.CinemaId.Value) &&
                  (!range.MovieId.HasValue || movie.MovieId == range.MovieId.Value)
            select new
            {
                booking.BookingId,
                booking.Status,
                booking.FinalAmount,
                RevenueDate = revenueDate,
                movie.MovieId,
                MovieTitle = movie.Title,
                cinema.CinemaId,
                CinemaName = cinema.CinemaName
            }).ToListAsync();

        var bookingIds = bookingRows.Select(x => x.BookingId).ToList();
        var ticketRows = await (
            from ticket in context.Tickets.AsNoTracking()
            where bookingIds.Contains(ticket.BookingId)
            join seatType in context.SeatTypes.AsNoTracking() on ticket.SeatTypeId equals seatType.SeatTypeId into seatTypeJoin
            from seatType in seatTypeJoin.DefaultIfEmpty()
            select new
            {
                ticket.BookingId,
                ticket.TicketId,
                ticket.Price,
                ticket.SeatTypeId,
                SeatTypeName = seatType != null ? seatType.TypeName : "Khac"
            }).ToListAsync();
        var concessionRows = await context.BookingConcessions.AsNoTracking()
            .Where(x => bookingIds.Contains(x.BookingId))
            .Select(x => new { x.BookingId, x.Subtotal }).ToListAsync();
        var refunds = await context.Payments.AsNoTracking()
            .Where(x => bookingIds.Contains(x.BookingId))
            .GroupBy(x => x.BookingId)
            .Select(group => new { BookingId = group.Key, Refunded = group.Sum(x => x.RefundAmount ?? 0) })
            .ToDictionaryAsync(x => x.BookingId, x => x.Refunded);

        var soldBookings = bookingRows.Where(x => IsSuccessful(x.Status)).ToList();
        var soldIds = soldBookings.Select(x => x.BookingId).ToHashSet();
        var soldTickets = ticketRows.Where(x => soldIds.Contains(x.BookingId)).ToList();
        var soldConcessions = concessionRows.Where(x => soldIds.Contains(x.BookingId)).ToList();

        decimal NetRevenue(int bookingId, decimal finalAmount) =>
            Math.Max(finalAmount - refunds.GetValueOrDefault(bookingId), 0);

        var monthlyRevenue = soldBookings.GroupBy(x => x.RevenueDate.Month).Select(group => new
        {
            month = group.Key,
            label = $"Tháng {group.Key}",
            totalBookings = group.Count(),
            totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
            totalRevenue = group.Sum(x => NetRevenue(x.BookingId, x.FinalAmount))
        }).OrderBy(x => x.month).ToList();

        var revenueByMovie = soldBookings.GroupBy(x => new { x.MovieId, x.MovieTitle }).Select(group => new
        {
            movieId = group.Key.MovieId,
            movieTitle = group.Key.MovieTitle,
            totalBookings = group.Count(),
            totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
            totalRevenue = group.Sum(x => NetRevenue(x.BookingId, x.FinalAmount))
        }).OrderByDescending(x => x.totalRevenue).ToList();

        var revenueBySeatType = soldTickets.GroupBy(x => new { x.SeatTypeId, x.SeatTypeName }).Select(group => new
        {
            seatTypeId = group.Key.SeatTypeId,
            seatTypeName = group.Key.SeatTypeName,
            totalTickets = group.Count(),
            totalRevenue = group.Sum(x => x.Price)
        }).OrderByDescending(x => x.totalRevenue).ToList();

        var dailyDetails = soldBookings.GroupBy(x => new
        {
            Date = x.RevenueDate.Date,
            x.CinemaId,
            x.CinemaName,
            x.MovieId,
            x.MovieTitle
        }).Select(group => new
        {
            date = group.Key.Date,
            cinemaId = group.Key.CinemaId,
            cinemaName = group.Key.CinemaName,
            movieId = group.Key.MovieId,
            movieTitle = group.Key.MovieTitle,
            totalBookings = group.Count(),
            totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
            totalRevenue = group.Sum(x => NetRevenue(x.BookingId, x.FinalAmount))
        }).OrderBy(x => x.date).ThenBy(x => x.cinemaName).ToList();

        var items = soldBookings.GroupBy(x => new { x.CinemaId, x.CinemaName }).Select(group => new
        {
            cinemaId = group.Key.CinemaId,
            cinemaName = group.Key.CinemaName,
            totalBookings = group.Count(),
            totalTickets = soldTickets.Count(ticket => group.Any(x => x.BookingId == ticket.BookingId)),
            totalRevenue = group.Sum(x => NetRevenue(x.BookingId, x.FinalAmount))
        }).OrderByDescending(x => x.totalRevenue).ToList();

        var cancelledIds = bookingRows.Where(x => IsStatus(x.Status, "cancelled")).Select(x => x.BookingId).ToHashSet();
        var pendingIds = bookingRows.Where(x => IsStatus(x.Status, "pending")).Select(x => x.BookingId).ToHashSet();
        var soldTicketCount = soldTickets.Count;
        var cancelledTicketCount = ticketRows.Count(x => cancelledIds.Contains(x.BookingId));
        var pendingTicketCount = ticketRows.Count(x => pendingIds.Contains(x.BookingId));
        var ticketTotal = soldTicketCount + cancelledTicketCount + pendingTicketCount;

        var ticketStatusSummary = new[]
        {
            new { status = "sold", label = "Vé bán thành công", totalBookings = soldBookings.Count,
                totalTickets = soldTicketCount, percentage = Percent(soldTicketCount, ticketTotal) },
            new { status = "refunded", label = "Vé hủy/hoàn tiền", totalBookings = cancelledIds.Count,
                totalTickets = cancelledTicketCount, percentage = Percent(cancelledTicketCount, ticketTotal) },
            new { status = "pending", label = "Vé chờ xử lý", totalBookings = pendingIds.Count,
                totalTickets = pendingTicketCount, percentage = Percent(pendingTicketCount, ticketTotal) }
        };

        var grossRevenue = soldBookings.Sum(x => x.FinalAmount);
        var netRevenue = soldBookings.Sum(x => NetRevenue(x.BookingId, x.FinalAmount));

        return new
        {
            year = range.Year,
            range.Month,
            range.CinemaId,
            range.MovieId,
            startDate = range.Start,
            endDate = range.EndExclusive.AddDays(-1),
            totalRevenue = netRevenue,
            grossRevenue,
            concessionRevenue = soldConcessions.Sum(x => x.Subtotal),
            netRevenue,
            totalBookings = soldBookings.Count,
            totalTickets = soldTickets.Count,
            monthlyRevenue,
            revenueByMovie,
            revenueBySeatType,
            revenueByCinema = items,
            ticketStatusSummary,
            dailyDetails,
            items
        };
    }

    public async Task<object> GetOccupancyAsync(ReportDTO.Range range)
    {
        var rows = await (
            from showtime in context.ShowTimes.AsNoTracking()
            join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
            join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
            join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
            where showtime.StartTime >= range.Start && showtime.StartTime < range.EndExclusive &&
                  showtime.Status.ToLower() != "cancelled" &&
                  (!range.CinemaId.HasValue || cinema.CinemaId == range.CinemaId.Value) &&
                  (!range.MovieId.HasValue || movie.MovieId == range.MovieId.Value)
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
            }).OrderBy(x => x.StartTime).ToListAsync();

        var showtimeIds = rows.Select(x => x.ShowtimeId).ToList();
        var hallIds = rows.Select(x => x.HallId).Distinct().ToList();
        var activeSeats = await context.Seats.AsNoTracking()
            .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
            .GroupBy(x => x.HallId)
            .Select(group => new { HallId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.HallId, x => x.Count);
        var bookedSeats = await context.Tickets.AsNoTracking()
            .Join(context.Bookings.AsNoTracking().Where(x => showtimeIds.Contains(x.ShowtimeId) &&
                    (x.Status.ToLower() == "confirmed" || x.Status.ToLower() == "paid" || x.Status.ToLower() == "completed")),
                ticket => ticket.BookingId, booking => booking.BookingId,
                (ticket, booking) => new { booking.ShowtimeId, ticket.SeatId })
            .Distinct().GroupBy(x => x.ShowtimeId)
            .Select(group => new { ShowtimeId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(x => x.ShowtimeId, x => x.Count);

        var showtimes = rows.Select(row =>
        {
            var total = activeSeats.GetValueOrDefault(row.HallId, row.TotalSeats);
            var booked = Math.Min(bookedSeats.GetValueOrDefault(row.ShowtimeId), total);
            var empty = Math.Max(total - booked, 0);
            return new
            {
                row.ShowtimeId, row.StartTime, row.EndTime, row.Status,
                row.MovieId, row.MovieTitle, row.HallId, row.HallName,
                row.CinemaId, row.CinemaName,
                totalSeats = total,
                bookedSeats = booked,
                emptySeats = empty,
                occupancyRate = Percent(booked, total),
                vacancyRate = Percent(empty, total)
            };
        }).ToList();

        var byCinema = showtimes.GroupBy(x => new { x.CinemaId, x.CinemaName }).Select(group =>
        {
            var total = group.Sum(x => x.totalSeats);
            var booked = group.Sum(x => x.bookedSeats);
            var empty = group.Sum(x => x.emptySeats);
            return new
            {
                group.Key.CinemaId, group.Key.CinemaName,
                totalShowtimes = group.Count(), totalSeats = total, bookedSeats = booked, emptySeats = empty,
                occupancyRate = Percent(booked, total), vacancyRate = Percent(empty, total)
            };
        }).OrderByDescending(x => x.occupancyRate).ToList();

        var byMovie = showtimes.GroupBy(x => new { x.MovieId, x.MovieTitle }).Select(group =>
        {
            var total = group.Sum(x => x.totalSeats);
            var booked = group.Sum(x => x.bookedSeats);
            var empty = group.Sum(x => x.emptySeats);
            return new
            {
                group.Key.MovieId, group.Key.MovieTitle,
                totalShowtimes = group.Count(), totalSeats = total, bookedSeats = booked, emptySeats = empty,
                occupancyRate = Percent(booked, total), vacancyRate = Percent(empty, total)
            };
        }).OrderByDescending(x => x.occupancyRate).ToList();

        var totalSeats = showtimes.Sum(x => x.totalSeats);
        var bookedSeatCount = showtimes.Sum(x => x.bookedSeats);
        var emptySeatCount = showtimes.Sum(x => x.emptySeats);
        return new
        {
            year = range.Year,
            range.Month,
            range.CinemaId,
            range.MovieId,
            startDate = range.Start,
            endDate = range.EndExclusive.AddDays(-1),
            totalShowtimes = showtimes.Count,
            totalSeats,
            bookedSeats = bookedSeatCount,
            emptySeats = emptySeatCount,
            occupancyRate = Percent(bookedSeatCount, totalSeats),
            vacancyRate = Percent(emptySeatCount, totalSeats),
            byCinema,
            byMovie,
            showtimes
        };
    }

    private static bool IsSuccessful(string? status) =>
        IsStatus(status, "confirmed") || IsStatus(status, "paid") || IsStatus(status, "completed");
    private static bool IsStatus(string? status, string expected) =>
        string.Equals(status, expected, StringComparison.OrdinalIgnoreCase);
    private static decimal Percent(int value, int total) =>
        total <= 0 ? 0 : Math.Round(value * 100m / total, 2);
}
