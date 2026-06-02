using DTO.Booking;
using DTO.Common;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Text;
using static DTO.Booking.BookingDto;

namespace Services.Booking
{
    public interface IBookingService
    {
        Task<Paging.PaginationResponse<BookingDto.BookingResponse>> GetAllAsync(string? keyword, string? status, int? cinemaId, DateTime? date, int pageNumber=1, int pageSize=10);
        Task<BookingDto.BookingResponse?> GetByIdAsync(int id);
        Task<BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode);
        Task<BookingDto.BookingResponse?> GetByUserEmailAsync(string email);
        Task<BookingDto.BookingResponse?> GetByUserAsync(int userId);
        Task<int> Create(BookingDto.BookingCreateRequest request);
        Task Cancel(int bookingId, BookingDto.CancelBookingDto cancel, int currentUserId, string currentUserRole, int? currentUserCinemaId);
        Task<IActionResult> CheckInAsync(int bookingId, TicketCheckInDto dto, int checkInUserId);
    }
}
