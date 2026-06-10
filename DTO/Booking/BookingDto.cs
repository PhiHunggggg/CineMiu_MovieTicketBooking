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
            public decimal RefundAmount { get; set; }
            public DateTime? RefundedAt { get; set; }
        }
        public class BookingDetailResponse
        {
            public BookingResponse Booking { get; set; } = new();
            public List<TicketResponse> Tickets { get; set; } = new();
            public List<BookingConcessionResponse> Concessions { get; set; } = new();
            public List<PaymentResponse> Payments { get; set; } = new();
        }
        public class TicketResponse
        {
            public int TicketId { get; set; }
            public int BookingId { get; set; }
            public int SeatId { get; set; }
            public string SeatCode { get; set; } = string.Empty;
            public byte SeatTypeId { get; set; }
            public string SeatTypeName { get; set; } = string.Empty;
            public decimal Price { get; set; }
            public string QrCode { get; set; } = string.Empty;
            public bool IsUsed { get; set; }
            public DateTime? UsedAt { get; set; }
            public int? CheckedBy { get; set; }
        }
        public class BookingConcessionResponse
        {
            public int Id { get; set; }
            public int BookingId { get; set; }
            public int ItemId { get; set; }
            public string ItemName { get; set; } = string.Empty;
            public byte Quantity { get; set; }
            public decimal UnitPrice { get; set; }
            public decimal Subtotal { get; set; }
        }
        public class PaymentResponse
        {
            public int PaymentId { get; set; }
            public int BookingId { get; set; }
            public byte MethodId { get; set; }
            public string? TransactionRef { get; set; }
            public decimal Amount { get; set; }
            public string Currency { get; set; } = "VND";
            public string Status { get; set; } = "pending";
            public DateTime? PaidAt { get; set; }
            public decimal? RefundAmount { get; set; }
            public DateTime? RefundedAt { get; set; }
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
        public class RefundBookingDto
        {
            public string? Reason { get; set; }
        }
    }
}
