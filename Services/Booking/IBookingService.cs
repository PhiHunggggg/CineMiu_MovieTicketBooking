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
        Task<BookingDto.BookingDetailResponse?> GetDetailAsync(int id);
        Task<BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode);
        Task<List<BookingDto.BookingDetailResponse>> GetByUserEmailAsync(string email);
        Task<List<BookingDto.BookingDetailResponse>> GetByUserAsync(int userId);
        Task<int> Create(BookingDto.BookingCreateRequest request);
        Task Cancel(int bookingId, BookingDto.CancelBookingDto cancel, int currentUserId, string currentUserRole, int? currentUserCinemaId);
        Task RefundAsync(int bookingId, BookingDto.RefundBookingDto refund);
        Task<int?> GetBookingIdByTicketQrAsync(string qrCode);
        Task<int?> GetBookingIdByTicketAsync(int? ticketId, string? qrCode);
        Task<IActionResult> CheckInAsync(int bookingId, TicketCheckInDto dto, int checkInUserId);
        Task<(bool Success, string Message, DTO.Booking.BookingDto.PaymentResponse? Payment)> AddPaymentAsync(int bookingId, DTO.Booking.PaymentDto dto);
    }
}
