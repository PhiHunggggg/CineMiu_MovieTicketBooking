using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Repository.EFCore.Bookings;
using System;
using System.Collections.Generic;
using System.Text;
using static DTO.Booking.BookingDto;

namespace Services.Booking
{
    public class BookkingService(IBookingRepository bookingRepository) : IBookingService
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

            if (user == null ||
                !user.IsActive ||
                (user.RoleId != 2 &&
                 user.RoleId != 3 &&
                 user.RoleId != 4))
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
                ticket.CheckedBy = checkInUserId;
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
    }
}
