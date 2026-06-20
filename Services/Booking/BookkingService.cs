using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;
using Repository.EFCore.Bookings;
using Services.Loyalty;
using System;
using System.Collections.Generic;
using System.Text;
using static DTO.Booking.BookingDto;

namespace Services.Booking
{
    public class BookkingService(
        IBookingRepository bookingRepository,
        SqlServerDbContext context,
        ILoyaltyService loyaltyService) : IBookingService
    {
        public async Task<DTO.Common.Paging.PaginationResponse<DTO.Booking.BookingDto.BookingResponse>> GetAllAsync(string? keyword, string? status, int? cinemaId, DateTime? date, int pageNumber = 1, int pageSize = 10)
        {
            var allBookings = await bookingRepository.GetAllAsync(keyword, status, cinemaId, date);
            var totalCount = allBookings.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var pagedBookings = allBookings.Skip((pageNumber - 1) * pageSize).Take(pageSize).ToList();
            return new DTO.Common.Paging.PaginationResponse<DTO.Booking.BookingDto.BookingResponse>
            {
                Page = pageNumber,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = pagedBookings
            };
        }
        public Task<DTO.Booking.BookingDto.BookingResponse?> GetByIdAsync(int id)
        {
            return bookingRepository.GetByIdAsync(id);
        }
        public Task<DTO.Booking.BookingDto.BookingDetailResponse?> GetDetailAsync(int id)
        {
            return bookingRepository.GetDetailAsync(id);
        }
        public Task<DTO.Booking.BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode)
        {
            return bookingRepository.GetByBookingCodeAsync(bookingCode);
        }
        public Task<DTO.Booking.BookingDto.BookingResponse?> GetByUserAsync(int userId)
        {
            return bookingRepository.GetByUser(userId);
        }
        public Task<DTO.Booking.BookingDto.BookingResponse?> GetByUserEmailAsync(string email)
        {
            return bookingRepository.GetByUserEmail(email);
        }
        public Task<int> Create(DTO.Booking.BookingDto.BookingCreateRequest request)
        {
            return bookingRepository.Create(request);
        }
        public Task Cancel(int bookingId, DTO.Booking.BookingDto.CancelBookingDto cancel, int currentUserId, string currentUserRole, int? currentUserCinemaId)
        {
            return bookingRepository.Cancel(bookingId, cancel, currentUserId, currentUserRole, currentUserCinemaId);
        }
        public Task RefundAsync(int bookingId, DTO.Booking.BookingDto.RefundBookingDto refund)
        {
            return bookingRepository.RefundAsync(bookingId, refund);
        }
        public Task<int?> GetBookingIdByTicketQrAsync(string qrCode)
        {
            return bookingRepository.GetBookingIdByTicketQrAsync(qrCode);
        }
        public async Task<IActionResult> CheckInAsync(
    int bookingId,
    TicketCheckInDto dto,
    int checkInUserId)
        {
            var isSpecificTicket =
                dto.TicketId.HasValue ||
                !string.IsNullOrWhiteSpace(dto.QrCode);

            var (booking, user, tickets)
                = await bookingRepository.GetCheckInDataAsync(
                    bookingId,
                    checkInUserId,
                    dto);

            if (booking == null)
            {
                return new NotFoundObjectResult(
                    new { message = "Booking not found" });
            }

            var isSystemAdminCheckIn = checkInUserId <= 0;

            if (!isSystemAdminCheckIn &&
                (user == null ||
                !user.IsActive ||
                (user.RoleId != 2 &&
                 user.RoleId != 3 &&
                 user.RoleId != 4)))
            {
                return new ObjectResult(
                    new
                    {
                        message = "Only ticket staff, cinema managers or admins can check in tickets"
                    })
                {
                    StatusCode = StatusCodes.Status403Forbidden
                };
            }

            if (booking.Status == "cancelled")
            {
                return new BadRequestObjectResult(
                    new { message = "Booking has been cancelled" });
            }

            if (booking.Status != "confirmed" &&
                booking.Status != "paid" &&
                booking.Status != "completed")
            {
                return new BadRequestObjectResult(
                    new { message = "Booking must be paid before check-in" });
            }

            if (!isSpecificTicket)
            {
                tickets = tickets
                    .Where(x => !x.IsUsed)
                    .ToList();
            }

            if (tickets.Count == 0)
            {
                return isSpecificTicket
                    ? new NotFoundObjectResult(
                        new { message = "Ticket not found for this booking" })
                    : new ConflictObjectResult(
                        new { message = "All tickets in this booking have already been checked in" });
            }

            if (isSpecificTicket)
            {
                var usedTickets = tickets
                    .Where(x => x.IsUsed)
                    .ToList();

                if (usedTickets.Any())
                {
                    return new ConflictObjectResult(new
                    {
                        message = "Ticket has already been checked in",
                        tickets = usedTickets.Select(x => new
                        {
                            x.TicketId,
                            x.QrCode,
                            x.UsedAt,
                            x.CheckedBy
                        })
                    });
                }
            }

            var now = DateTime.UtcNow;

            foreach (var ticket in tickets)
            {
                ticket.IsUsed = true;
                ticket.UsedAt = now;
                ticket.CheckedBy = isSystemAdminCheckIn ? null : checkInUserId;
            }

            var checkedTicketIds =
                tickets.Select(x => x.TicketId).ToList();

            var hasRemainingUnusedTickets =
                await bookingRepository.HasRemainingUnusedTicketsAsync(
                    bookingId,
                    checkedTicketIds);

            if (!hasRemainingUnusedTickets)
            {
                booking.Status = "completed";
            }

            await bookingRepository.SaveChangesAsync();

            return new OkObjectResult(new
            {
                message = "Check-in successful",
                booking.BookingId,
                booking.BookingCode,
                checkedAt = now,
                checkedTicketCount = tickets.Count,
                tickets = tickets.Select(x => new
                {
                    x.TicketId,
                    x.QrCode,
                    x.IsUsed,
                    x.UsedAt,
                    x.CheckedBy
                })
            });
        }

        public async Task<(bool Success, string Message, DTO.Booking.BookingDto.PaymentResponse? Payment)> AddPaymentAsync(int bookingId, DTO.Booking.PaymentDto dto)
        {
            var booking = await context.Bookings.FirstOrDefaultAsync(x => x.BookingId == bookingId);
            if (booking == null)
            {
                return (false, "Booking not found", null);
            }

            if (booking.Status is "cancelled" or "completed")
            {
                return (false, $"Cannot pay for a {booking.Status} booking", null);
            }

            var paymentMethodExists = await context.PaymentMethods
                .AnyAsync(x => x.MethodId == dto.MethodId && x.IsActive);
            if (!paymentMethodExists)
            {
                return (false, "Payment method not found or inactive", null);
            }

            if (!string.IsNullOrWhiteSpace(dto.TransactionRef))
            {
                var normalizedReference = dto.TransactionRef.Trim();
                if (await context.Payments.AnyAsync(x => x.TransactionRef == normalizedReference))
                {
                    return (false, "Transaction reference already exists", null);
                }
            }

            var paidAmount = await context.Payments
                .Where(x => x.BookingId == bookingId && (x.Status == "paid" || x.Status == "success"))
                .SumAsync(x => x.Amount - (x.RefundAmount ?? 0));
            var outstandingAmount = Math.Max(booking.FinalAmount - paidAmount, 0);

            if (dto.Amount < 0 || (outstandingAmount > 0 && dto.Amount <= 0))
            {
                return (false, "Payment amount must be greater than zero", null);
            }

            if (dto.Amount > outstandingAmount)
            {
                return (false, $"Payment amount exceeds outstanding amount ({outstandingAmount:n0} VND)", null);
            }

            var now = DateTime.UtcNow;
            var paymentEntity = new Entities.Bookings.Payment
            {
                BookingId = bookingId,
                MethodId = dto.MethodId,
                TransactionRef = string.IsNullOrWhiteSpace(dto.TransactionRef)
                    ? $"PAY-{booking.BookingCode}-{now:yyyyMMddHHmmssfff}"
                    : dto.TransactionRef.Trim(),
                Amount = dto.Amount,
                Currency = "VND",
                Status = "paid",
                PaidAt = now
            };

            context.Payments.Add(paymentEntity);

            var isNewlyConfirmed = paidAmount + dto.Amount >= booking.FinalAmount &&
                                   booking.Status is not ("confirmed" or "paid");
            if (isNewlyConfirmed)
            {
                booking.Status = "confirmed";
                booking.ConfirmedAt = now;
                booking.ExpiresAt = null;
            }

            await context.SaveChangesAsync();

            if (isNewlyConfirmed)
            {
                var earnedPoints = (int)Math.Floor(booking.FinalAmount / 1000m);
                await loyaltyService.AddPointsAsync(
                    booking.UserId,
                    earnedPoints,
                    booking.BookingId,
                    $"Đặt vé {booking.BookingCode}");
            }

            var payment = new DTO.Booking.BookingDto.PaymentResponse
            {
                PaymentId = paymentEntity.PaymentId,
                BookingId = bookingId,
                MethodId = dto.MethodId,
                TransactionRef = paymentEntity.TransactionRef,
                Amount = dto.Amount,
                Currency = paymentEntity.Currency,
                Status = "paid",
                PaidAt = now
            };
            return (true, "Payment recorded", payment);
        }
    }
}
