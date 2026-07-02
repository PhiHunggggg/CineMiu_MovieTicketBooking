using DTO.Booking;
using API_Service.Infrastructure;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Booking;
using System.Security.Claims;
using static DTO.Booking.BookingDto;

namespace API_Service.Controllers
{
    [Route("api/bookings")]
    [ApiController]
    public class BookingsController(IBookingService bookingService, ILogger<BookingsController> logger) : ControllerBase
    {
        private const string CheckInRoles = "admin,ticket_staff,staff,cinema_manager,manager";

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] string? status,
            [FromQuery] int? cinemaId,
            [FromQuery] DateTime? date,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);
            var result = await bookingService.GetAllAsync(keyword, status, cinemaId, date, page, pageSize);
            return Ok(new { total = result.TotalCount, result.Items });
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
                logger.LogInformation(
                    "BookingCreateRequested userId={UserId} showtimeId={ShowtimeId} seatIds={SeatIds}",
                    request.UserId,
                    request.ShowtimeId,
                    string.Join(",", request.SeatIds));

                var bookingId = await bookingService.Create(request);
                var booking = await bookingService.GetDetailAsync(bookingId);
                logger.LogInformation(
                    "BookingCreated bookingId={BookingId} bookingCode={BookingCode} userId={UserId} showtimeId={ShowtimeId}",
                    bookingId,
                    booking?.Booking.BookingCode,
                    request.UserId,
                    request.ShowtimeId);
                return CreatedAtAction(nameof(GetById), new { id = bookingId }, booking);
            }
            catch (Exception ex)
            {
                logger.LogWarning(
                    ex,
                    "BookingCreateFailed userId={UserId} showtimeId={ShowtimeId} seatIds={SeatIds}",
                    request.UserId,
                    request.ShowtimeId,
                    string.Join(",", request.SeatIds));
                return MapKnownBookingError(ex.Message);
            }
        }

        [HttpPost("{id:int}/payments")]
        public async Task<IActionResult> AddPayment(int id, [FromBody] PaymentDto request)
        {
            logger.LogInformation(
                "PaymentAddRequested bookingId={BookingId} methodId={MethodId} amount={Amount} transactionRef={TransactionRef}",
                id,
                request.MethodId,
                request.Amount,
                request.TransactionRef);

            var result = await bookingService.AddPaymentAsync(id, request);
            if (!result.Success)
            {
                logger.LogWarning(
                    "PaymentAddFailed bookingId={BookingId} methodId={MethodId} amount={Amount} transactionRef={TransactionRef} message={Message}",
                    id,
                    request.MethodId,
                    request.Amount,
                    request.TransactionRef,
                    result.Message);
                return MapKnownBookingError(result.Message);
            }

            logger.LogInformation(
                "PaymentAdded bookingId={BookingId} paymentId={PaymentId} amount={Amount} transactionRef={TransactionRef}",
                id,
                result.Payment?.PaymentId,
                result.Payment?.Amount,
                result.Payment?.TransactionRef);
            return Ok(result.Payment);
        }

        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelBookingDto request)
        {
            try
            {
                logger.LogInformation(
                    "BookingCancelRequested bookingId={BookingId} userId={UserId} role={Role} cinemaId={CinemaId}",
                    id,
                    ResolveAuthenticatedUserId(),
                    User.FindFirstValue(ClaimTypes.Role),
                    ResolveCinemaId());

                await bookingService.Cancel(
                    id,
                    request,
                    ResolveAuthenticatedUserId() ?? 0,
                    User.FindFirstValue(ClaimTypes.Role) ?? string.Empty,
                    ResolveCinemaId());

                logger.LogInformation("BookingCancelled bookingId={BookingId}", id);
                return Ok(await bookingService.GetByIdAsync(id));
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "BookingCancelFailed bookingId={BookingId}", id);
                return ErrorResponse(ex);
            }
        }

        [HttpPost("{id:int}/refund")]
        public async Task<IActionResult> Refund(int id, [FromBody] RefundBookingDto request)
        {
            try
            {
                logger.LogInformation("BookingRefundRequested bookingId={BookingId} reason={Reason}", id, request.Reason);
                await bookingService.RefundAsync(id, request);
                logger.LogInformation("BookingRefunded bookingId={BookingId}", id);
                return Ok(new { message = "Refund successful", booking = await bookingService.GetDetailAsync(id) });
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "BookingRefundFailed bookingId={BookingId}", id);
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

            logger.LogInformation(
                "TicketCheckInLookupRequested staffUserId={StaffUserId} ticketId={TicketId} hasQrCode={HasQrCode}",
                ResolveAuthenticatedUserId(),
                request.TicketId,
                !string.IsNullOrWhiteSpace(request.QrCode));

            var bookingId = await bookingService.GetBookingIdByTicketAsync(request.TicketId, request.QrCode);
            if (!bookingId.HasValue)
            {
                logger.LogWarning(
                    "TicketCheckInTicketNotFound staffUserId={StaffUserId} ticketId={TicketId} hasQrCode={HasQrCode}",
                    ResolveAuthenticatedUserId(),
                    request.TicketId,
                    !string.IsNullOrWhiteSpace(request.QrCode));
                return ApiErrors.NotFound(this, ErrorCodes.TicketNotFound, "Ticket not found");
            }

            return await CheckIn(bookingId.Value, request);
        }

        [Authorize(Roles = CheckInRoles)]
        [HttpPost("{id:int}/check-in")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] TicketCheckInDto request)
        {
            var userId = ResolveAuthenticatedUserId();
            if (!userId.HasValue)
            {
                logger.LogWarning("TicketCheckInUnauthorized bookingId={BookingId}", id);
                return ApiErrors.Unauthorized(this, ErrorCodes.Unauthorized, "Authenticated staff account is required");
            }

            logger.LogInformation(
                "TicketCheckInRequested bookingId={BookingId} staffUserId={StaffUserId} ticketId={TicketId} hasQrCode={HasQrCode}",
                id,
                userId.Value,
                request.TicketId,
                !string.IsNullOrWhiteSpace(request.QrCode));

            var response = await bookingService.CheckInAsync(id, request, userId.Value);
            logger.LogInformation("TicketCheckInCompleted bookingId={BookingId} staffUserId={StaffUserId}", id, userId.Value);
            return response;
        }

        private int? ResolveAuthenticatedUserId()
        {
            return int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier), out var userId) && userId > 0
                ? userId
                : null;
        }

        private int? ResolveCinemaId()
        {
            var value = User.FindFirstValue("cinemaId") ?? User.FindFirstValue("cinema_id") ?? User.FindFirstValue("CinemaId");
            return int.TryParse(value, out var cinemaId) ? cinemaId : null;
        }

        private IActionResult ErrorResponse(Exception exception)
        {
            if (exception.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrors.NotFound(this, ErrorCodes.BookingNotFound, exception.Message);
            }

            if (exception.Message.Contains("authorized", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrors.Forbidden(this, ErrorCodes.BookingAccessDenied, exception.Message);
            }

            return MapKnownBookingError(exception.Message);
        }

        private IActionResult MapKnownBookingError(string message)
        {
            if (message.Contains("not found", StringComparison.OrdinalIgnoreCase))
            {
                var code = message.Contains("payment method", StringComparison.OrdinalIgnoreCase)
                    ? ErrorCodes.PaymentMethodNotFound
                    : message.Contains("booking", StringComparison.OrdinalIgnoreCase)
                        ? ErrorCodes.BookingNotFound
                        : ErrorCodes.NotFound;
                return ApiErrors.NotFound(this, code, message);
            }

            if (message.Contains("transaction reference", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrors.Conflict(this, ErrorCodes.PaymentDuplicateTransaction, message);
            }

            if (message.Contains("seat", StringComparison.OrdinalIgnoreCase) &&
                (message.Contains("not available", StringComparison.OrdinalIgnoreCase) ||
                 message.Contains("already", StringComparison.OrdinalIgnoreCase)))
            {
                return ApiErrors.Conflict(this, ErrorCodes.SeatAlreadyBooked, message);
            }

            if (message.Contains("Cannot pay", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrors.BadRequest(this, ErrorCodes.BookingNotPayable, message);
            }

            if (message.Contains("refund", StringComparison.OrdinalIgnoreCase))
            {
                return ApiErrors.BadRequest(this, ErrorCodes.RefundNotAllowed, message);
            }

            return ApiErrors.BadRequest(this, ErrorCodes.ValidationFailed, message);
        }
    }
}
