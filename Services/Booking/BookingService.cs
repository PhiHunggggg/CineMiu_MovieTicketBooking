using DTO.Booking;
using DTO.Common;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Repository.EFCore.Bookings;
using Repository.EFCore.Authen;
using Services.Administration;
using Services.Loyalty;
using Microsoft.Extensions.Logging;
using static DTO.Booking.BookingDto;

namespace Services.Booking
{
    public class BookingService(
        IBookingRepository bookingRepository,
        IUserRepository userRepository,
        ILoyaltyService loyaltyService,
        INotificationService notificationService,
        ILogger<BookkingService> logger) : IBookingService
    {
        public Task<Paging.PaginationResponse<BookingResponse>> GetAllAsync(string? keyword, string? status, int? movieId, int? cinemaId, DateTime? date, int pageNumber = 1, int pageSize = 10)
        {
            pageNumber = Math.Max(1, pageNumber);
            pageSize = Math.Clamp(pageSize, 1, 500);
            return bookingRepository.GetAllAsync(keyword, status, movieId, cinemaId, date, pageNumber, pageSize);
        }

        public Task<BookingResponse?> GetByIdAsync(int id) => bookingRepository.GetByIdAsync(id);
        public Task<BookingDetailResponse?> GetDetailAsync(int id) => bookingRepository.GetDetailAsync(id);
        public Task<BookingResponse?> GetByBookingCodeAsync(string bookingCode) => bookingRepository.GetByBookingCodeAsync(bookingCode);
        public Task<List<BookingDetailResponse>> GetByUserAsync(int userId) => bookingRepository.GetByUser(userId);
        public Task<List<BookingDetailResponse>> GetByUserEmailAsync(string email) => bookingRepository.GetByUserEmail(email);
        public Task<int> Create(BookingCreateRequest request) => bookingRepository.Create(request);
        public Task Cancel(int bookingId, CancelBookingDto cancel, int currentUserId, string currentUserRole, int? currentUserCinemaId) => bookingRepository.Cancel(bookingId, cancel, currentUserId, currentUserRole, currentUserCinemaId);
        public Task RefundAsync(int bookingId, RefundBookingDto refund) => bookingRepository.RefundAsync(bookingId, refund);
        public Task<int?> GetBookingIdByTicketQrAsync(string qrCode) => bookingRepository.GetBookingIdByTicketQrAsync(qrCode);
        public Task<int?> GetBookingIdByTicketAsync(int? ticketId, string? qrCode) => bookingRepository.GetBookingIdByTicketAsync(ticketId, qrCode);

        public async Task<IActionResult> CheckInAsync(int bookingId, TicketCheckInDto dto, int checkInUserId)
        {
            var specificTicket = dto.TicketId.HasValue || !string.IsNullOrWhiteSpace(dto.QrCode);
            var (booking, user, tickets) = await bookingRepository.GetCheckInDataAsync(bookingId, checkInUserId, dto);
            if (booking == null) return new NotFoundObjectResult(new { message = "Booking not found" });

            var roleName = user == null
                ? null
                : (await userRepository.ResolveRoleName(user.RoleId))?.Trim().ToLowerInvariant();
            var canCheckIn = roleName != null &&
                (roleName.Contains("admin") ||
                 roleName.Contains("staff") ||
                 roleName.Contains("manager"));
            if (user == null || !user.IsActive || !canCheckIn)
            {
                return new ObjectResult(new { message = "Only ticket staff, cinema managers or admins can check in tickets" })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
            }
            if (booking.Status == "cancelled") return new BadRequestObjectResult(new { message = "Booking has been cancelled" });
            if (booking.Status is not ("confirmed" or "paid" or "completed"))
                return new BadRequestObjectResult(new { message = "Booking must be paid before check-in" });

            if (!specificTicket) tickets = tickets.Where(x => !x.IsUsed).ToList();
            if (tickets.Count == 0)
                return specificTicket
                    ? new NotFoundObjectResult(new { message = "Ticket not found for this booking" })
                    : new ConflictObjectResult(new { message = "All tickets in this booking have already been checked in" });

            var usedTickets = tickets.Where(x => x.IsUsed).ToList();
            if (specificTicket && usedTickets.Count > 0)
                return new ConflictObjectResult(new { message = "Ticket has already been checked in", tickets = usedTickets });

            var now = DateTime.UtcNow;
            foreach (var ticket in tickets)
            {
                ticket.IsUsed = true;
                ticket.UsedAt = now;
                ticket.CheckedBy = checkInUserId;
            }

            var checkedIds = tickets.Select(x => x.TicketId).ToList();
            if (!await bookingRepository.HasRemainingUnusedTicketsAsync(bookingId, checkedIds)) booking.Status = "completed";
            await bookingRepository.SaveChangesAsync();
            return new OkObjectResult(new
            {
                message = "Check-in successful",
                booking.BookingId,
                booking.BookingCode,
                checkedAt = now,
                checkedTicketCount = tickets.Count,
                tickets = tickets.Select(x => new { x.TicketId, x.QrCode, x.IsUsed, x.UsedAt, x.CheckedBy })
            });
        }

        public async Task<(bool Success, string Message, PaymentResponse? Payment)> AddPaymentAsync(int bookingId, PaymentDto dto)
        {
            var result = await bookingRepository.AddPaymentAsync(bookingId, dto);
            if (result.Success && result.NewlyConfirmed)
            {
                await loyaltyService.AddPointsAsync(
                    result.UserId,
                    (int)Math.Floor(result.FinalAmount / 1000m),
                    bookingId,
                    $"Dat ve {result.BookingCode}");

                try
                {
                    var booking = await bookingRepository.GetDetailAsync(bookingId);
                    if (booking == null)
                        throw new InvalidOperationException("Confirmed booking detail was not found");

                    await notificationService.CreatePaymentSuccessAsync(booking);
                }
                catch (Exception exception)
                {
                    // Payment has already been committed. Email failure must not turn a
                    // successful payment response into an error for the customer.
                    logger.LogError(
                        exception,
                        "PaymentConfirmationEmailFailed bookingId={BookingId} bookingCode={BookingCode}",
                        bookingId,
                        result.BookingCode);
                }
            }
            return (result.Success, result.Message, result.Payment);
        }
    }
}
