using DTO.Booking;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Booking;
using System.Security.Claims;
using static DTO.Booking.BookingDto;

namespace API_Service.Controllers
{
    [Route("api/bookings")]
    [ApiController]
    public class BookingsController(IBookingService bookingService) : ControllerBase
    {
        private const string CheckInRoles = "admin,ticket_staff,staff,cinema_manager,manager";

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] string? status,
            [FromQuery] int? movieId,
            [FromQuery] int? cinemaId,
            [FromQuery] DateTime? date,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);
<<<<<<< HEAD

            var query =
                from booking in _context.CinemaBookings.AsNoTracking()
                join user in _context.CinemaUsers.AsNoTracking() on booking.UserId equals user.UserId
                join showtime in _context.CinemaShowtimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                join movie in _context.CinemaMovies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in _context.CinemaHalls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in _context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                select new { booking, user, showtime, movie, hall, cinema };

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var search = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.booking.BookingCode.ToLower().Contains(search) ||
                    x.user.FullName.ToLower().Contains(search) ||
                    x.user.Email.ToLower().Contains(search) ||
                    (x.user.Phone != null && x.user.Phone.Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.booking.Status == status);
            }

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.cinema.CinemaId == cinemaId.Value);
            }

            if (movieId.HasValue)
            {
                query = query.Where(x => x.movie.MovieId == movieId.Value);
            }

            if (date.HasValue)
            {
                var day = date.Value.Date;
                var nextDay = day.AddDays(1);
                query = query.Where(x => x.booking.CreatedAt >= day && x.booking.CreatedAt < nextDay);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.booking.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.booking.BookingId,
                    x.booking.BookingCode,
                    x.booking.UserId,
                    x.user.FullName,
                    x.user.Email,
                    x.user.Phone,
                    x.booking.ShowtimeId,
                    x.booking.TotalAmount,
                    x.booking.DiscountAmount,
                    x.booking.FinalAmount,
                    x.booking.Status,
                    x.booking.BookingChannel,
                    x.booking.CreatedAt,
                    x.booking.ConfirmedAt,
                    x.booking.CancelledAt,
                    x.booking.CancelReason,
                    MovieTitle = x.movie.Title,
                    CinemaName = x.cinema.CinemaName,
                    HallName = x.hall.HallName,
                    x.showtime.StartTime,
                    x.showtime.EndTime,
                    TicketCount = _context.CinemaTickets.Count(t => t.BookingId == x.booking.BookingId),
                    UsedTicketCount = _context.CinemaTickets.Count(t => t.BookingId == x.booking.BookingId && t.IsUsed),
                    RefundAmount = _context.CinemaPayments
                        .Where(p => p.BookingId == x.booking.BookingId)
                        .Sum(p => p.RefundAmount ?? 0),
                    RefundedAt = _context.CinemaPayments
                        .Where(p => p.BookingId == x.booking.BookingId && p.RefundedAt != null)
                        .Max(p => p.RefundedAt)
                })
                .ToListAsync();

            return Ok(new { total, items });
=======
            var result = await bookingService.GetAllAsync(keyword, status, cinemaId, date, page, pageSize);
            return Ok(new { total = result.TotalCount, result.Items });
>>>>>>> origin/develop
        }

        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var booking = await bookingService.GetByBookingCodeAsync(code);
            if (booking == null) return NotFound(new { message = "Booking not found" });

            return Ok(await bookingService.GetDetailAsync(booking.BookingId));
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await bookingService.GetDetailAsync(id);
            return booking == null
                ? NotFound(new { message = "Booking not found" })
                : Ok(booking);
        }

        [HttpGet("user/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            return Ok(await bookingService.GetByUserAsync(userId));
        }

        [HttpGet("user-by-email")]
        public async Task<IActionResult> GetByUserEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required" });
            }

            var bookings = await bookingService.GetByUserEmailAsync(email.Trim());
            return bookings.Count == 0
                ? NotFound(new { message = "User or booking not found" })
                : Ok(bookings);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] BookingCreateRequest request)
        {
            try
            {
                var bookingId = await bookingService.Create(request);
                var booking = await bookingService.GetDetailAsync(bookingId);
                return CreatedAtAction(nameof(GetById), new { id = bookingId }, booking);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/payments")]
        public async Task<IActionResult> AddPayment(int id, [FromBody] PaymentDto request)
        {
            var result = await bookingService.AddPaymentAsync(id, request);
            if (!result.Success)
            {
                return result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase)
                    ? NotFound(new { message = result.Message })
                    : BadRequest(new { message = result.Message });
            }

            return Ok(result.Payment);
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelBookingDto request)
        {
            try
            {
                await bookingService.Cancel(
                    id,
                    request,
                    ResolveAuthenticatedUserId() ?? 0,
                    User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
                    ResolveCinemaId());

                return Ok(await bookingService.GetByIdAsync(id));
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex);
            }
        }

        [HttpPost("{id:int}/refund")]
        public async Task<IActionResult> Refund(int id, [FromBody] RefundBookingDto request)
        {
            try
            {
                await bookingService.RefundAsync(id, request);
                return Ok(new { message = "Refund successful", booking = await bookingService.GetDetailAsync(id) });
            }
            catch (Exception ex)
            {
                return ErrorResponse(ex);
            }
        }

        [Authorize(Roles = CheckInRoles)]
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckInByTicket([FromBody] TicketCheckInDto request)
        {
            if (!request.TicketId.HasValue && string.IsNullOrWhiteSpace(request.QrCode))
            {
                return BadRequest(new { message = "TicketId or QrCode is required" });
            }

            var bookingId = await bookingService.GetBookingIdByTicketAsync(request.TicketId, request.QrCode);
            if (!bookingId.HasValue) return NotFound(new { message = "Ticket not found" });

            return await CheckIn(bookingId.Value, request);
        }

        [Authorize(Roles = CheckInRoles)]
        [HttpPost("{id:int}/check-in")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] TicketCheckInDto request)
        {
            var userId = ResolveAuthenticatedUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { message = "Authenticated staff account is required" });
            }

            return await bookingService.CheckInAsync(id, request, userId.Value);
        }

        private int? ResolveAuthenticatedUserId()
        {
            return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) && userId > 0
                ? userId
                : null;
        }

        private int? ResolveCinemaId()
        {
            var value = User.FindFirstValue("cinemaId") ?? User.FindFirstValue("cinema_id");
            return int.TryParse(value, out var cinemaId) ? cinemaId : null;
        }

        private IActionResult ErrorResponse(Exception exception)
        {
            if (exception.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return NotFound(new { message = exception.Message });
            }

            if (exception.Message.Contains("authorized", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = exception.Message });
            }

            return BadRequest(new { message = exception.Message });
        }
    }
}
