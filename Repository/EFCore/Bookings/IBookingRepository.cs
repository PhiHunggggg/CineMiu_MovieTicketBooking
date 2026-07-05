using BaseCore.Repository.EFCore;
using DTO.Booking;
using DTO.Common;
using Entities;
using System;
using System.Collections.Generic;
using System.Text;
using static DTO.Booking.BookingDto;
using static Entities.Bookings;

namespace Repository.EFCore.Bookings
{
    public interface IBookingRepository : IRepository<Booking>
    {
        Task<Paging.PaginationResponse<BookingDto.BookingResponse>> GetAllAsync(string? keyword, string? status, int? movieId, int? cinemaId, DateTime? date, int pageNumber, int pageSize);
        Task<BookingDto.BookingResponse?> GetByIdAsync(int id);
        Task<BookingDto.BookingDetailResponse?> GetDetailAsync(int id);
        Task<BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode);
        Task<List<BookingDto.BookingDetailResponse>> GetByUser(int userId);
        Task<List<BookingDto.BookingDetailResponse>> GetByUserEmail(string email);
        Task<int> Create(BookingDto.BookingCreateRequest request);
        Task Cancel(int bookingId, BookingDto.CancelBookingDto dto, int currentUserId, string currentUserRole, int? currentUserCinemaId);
        Task RefundAsync(int bookingId, BookingDto.RefundBookingDto dto);
        Task<int?> GetBookingIdByTicketQrAsync(string qrCode);
        Task<int?> GetBookingIdByTicketAsync(int? ticketId, string? qrCode);
        Task<(Booking? booking, Users? user, List<Tickets.Ticket> tickets)> GetCheckInDataAsync(int bookingId, int userId, TicketCheckInDto dto);
        Task<bool> HasRemainingUnusedTicketsAsync(int bookingId, List<int> checkedTicketIds);
        Task<BookingDto.PaymentProcessResult> AddPaymentAsync(int bookingId, PaymentDto dto);
        Task SaveChangesAsync();
    }
}
