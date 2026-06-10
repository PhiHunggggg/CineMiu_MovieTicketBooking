using DTO.Booking;
using Entities;
using System;
using System.Collections.Generic;
using System.Text;
using static DTO.Booking.BookingDto;
using static Entities.Bookings;

namespace Repository.EFCore.Bookings
{
    public interface IBookingRepository
    {
        Task<List<BookingDto.BookingResponse>> GetAllAsync(string? keyword, string? status, int? cinemaId, DateTime? date);
        Task<BookingDto.BookingResponse?> GetByIdAsync(int id);
        Task<BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode);
        Task<List<BookingDto.BookingResponse>> GetByUser(int userId);
        Task<List<BookingDto.BookingResponse>> GetByUserEmail(string email);
        Task<int> Create(BookingDto.BookingCreateRequest request);
        Task<BookingDto.BookingResponse?> AddPaymentAsync(int bookingId, BookingDto.BookingPaymentCreateRequest request, int currentUserId);
        Task Cancel(int bookingId, BookingDto.CancelBookingDto dto, int currentUserId, string currentUserRole, int? currentUserCinemaId);
        Task<(Booking? booking, Users? user, List<Tickets.Ticket> tickets)> GetCheckInDataAsync(int bookingId, int userId, TicketCheckInDto dto);
        Task<bool> HasRemainingUnusedTicketsAsync(int bookingId, List<int> checkedTicketIds);
        Task SaveChangesAsync();
    }
}
