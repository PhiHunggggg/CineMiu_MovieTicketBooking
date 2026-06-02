using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace DTO.Booking
{
    public class BookingDto
    {
        public class BookingResponse
        {
            public int BookingId { get; set; }

            public string BookingCode { get; set; } = string.Empty;
            public int UserId { get; set; }
            public string FullName { get; set; } = string.Empty;
            public string email { get; set; } = string.Empty;
            public string? phone { get; set; }
            public int ShowtimeId { get; set; }
            public decimal TotalAmount { get; set; }
            public decimal DiscountAmount { get; set; }
            public decimal FinalAmount { get; set; }
            public string Status { get; set; } = "pending";
            public string BookingChannel { get; set; } = "web";
            public DateTime CreatedAt { get; set; }
            public DateTime? ConfirmedAt { get; set; }
            public DateTime? CancelledAt { get; set; }
            public string? CancelReason { get; set; }
            public string MovieTitle { get; set; } = string.Empty;
            public string CinemaName { get; set; } = string.Empty;
            public string HallName { get; set; } = string.Empty;
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public int TicketCount { get; set; }
            public int UsedTicketCount { get; set; }
        }
        public class BookingCreateRequest
        {
            public string? BookingCode { get; set; }
            public int UserId { get; set; }
            [Required]
            public int ShowtimeId { get; set; }
            public List<BookingSeatDto> Seats { get; set; } = new List<BookingSeatDto>();
            public List<BookingConcessionDto> Concessions { get; set; } = new List<BookingConcessionDto>();
            public decimal DiscountAmount { get; set; }
            public string? PromoCode { get; set; }
            public string? BookingChannel { get; set; }
            public string? Notes { get; set; }
            public List<int> SeatIds => Seats.Select(x => x.SeatId).ToList();
        }
        public class BookingSeatDto
        {
            public int SeatId { get; set; }
            public decimal Price { get; set; }
            public string? QrCode { get; set; }
        }
        public class BookingConcessionDto
        {
            public int ItemId { get; set; }
            public byte Quantity { get; set; } = 1;
        }
        public class CancelBookingDto
        {
            public string? Reason { get; set; }
        }
        public class TicketCheckInDto
        {
            public int? TicketId { get; set; }
            public string? QrCode { get; set; }
            public int? CheckedBy { get; set; }
        }
    }
}