using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    public class Bookings
    {
        [Table("bookings")]
        public class Booking
        {
            [Key]
            [Column("booking_id")]
            public int BookingId { get; set; }

            [Column("user_id")]
            public int UserId { get; set; }

            [Column("showtime_id")]
            public int ShowtimeId { get; set; }

            [Column("booking_code")]
            public string BookingCode { get; set; } = "";

            [Column("total_amount")]
            public decimal TotalAmount { get; set; }

            [Column("discount_amount")]
            public decimal DiscountAmount { get; set; }

            [Column("final_amount")]
            public decimal FinalAmount { get; set; }

            [Column("status")]
            public string Status { get; set; } = "pending";

            [Column("booking_channel")]
            public string BookingChannel { get; set; } = "web";

            [Column("created_at")]
            public DateTime CreatedAt { get; set; }

            [Column("expires_at")]
            public DateTime? ExpiresAt { get; set; }

            [Column("confirmed_at")]
            public DateTime? ConfirmedAt { get; set; }

            [Column("cancelled_at")]
            public DateTime? CancelledAt { get; set; }

            [Column("cancel_reason")]
            public string? CancelReason { get; set; }

            [Column("notes")]
            public string? Notes { get; set; }
        }
        [Table("booking_concessions")]
        public class BookingConcession
        {
            [Key]
            [Column("id")]
            public int Id { get; set; }

            [Column("booking_id")]
            public int BookingId { get; set; }

            [Column("item_id")]
            public int ItemId { get; set; }

            [Column("quantity")]
            public byte Quantity { get; set; } = 1;

            [Column("unit_price")]
            public decimal UnitPrice { get; set; }

            [Column("subtotal")]
            public decimal Subtotal { get; set; }
        }

        [Table("payments")]
        public class Payment
        {
            [Key]
            [Column("payment_id")]
            public int PaymentId { get; set; }

            [Column("booking_id")]
            public int BookingId { get; set; }

            [Column("method_id")]
            public byte MethodId { get; set; }

            [Column("transaction_ref")]
            public string? TransactionRef { get; set; }

            [Column("amount")]
            public decimal Amount { get; set; }

            [Column("currency")]
            public string Currency { get; set; } = "VND";

            [Column("status")]
            public string Status { get; set; } = "pending";

            [Column("gateway_response")]
            public string? GatewayResponse { get; set; }

            [Column("paid_at")]
            public DateTime? PaidAt { get; set; }

            [Column("refund_amount")]
            public decimal? RefundAmount { get; set; }

            [Column("refunded_at")]
            public DateTime? RefundedAt { get; set; }
        }

        [Table("seat_locks")]
        public class SeatLock
        {
            [Key]
            [Column("lock_id")]
            public int LockId { get; set; }

            [Column("showtime_id")]
            public int ShowtimeId { get; set; }

            [Column("seat_id")]
            public int SeatId { get; set; }

            [Column("user_id")]
            public int UserId { get; set; }

            [Column("session_id")]
            public string SessionId { get; set; } = "";

            [Column("locked_at")]
            public DateTime LockedAt { get; set; }

            [Column("expires_at")]
            public DateTime ExpiresAt { get; set; }
        }
    }
}
