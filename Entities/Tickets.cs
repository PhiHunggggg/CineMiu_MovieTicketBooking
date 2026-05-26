using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    internal class Tickets
    {
        [Table("ticket_prices")]
        public class CinemaTicketPrice
        {
            [Key]
            [Column("price_id")]
            public int PriceId { get; set; }

            [Column("cinema_id")]
            public int CinemaId { get; set; }

            [Column("hall_type_id")]
            public byte HallTypeId { get; set; }

            [Column("seat_type_id")]
            public byte SeatTypeId { get; set; }

            [Column("day_type_id")]
            public byte DayTypeId { get; set; }

            [Column("time_slot")]
            public string TimeSlot { get; set; } = "all_day";

            [Column("base_price")]
            public decimal BasePrice { get; set; }

            [Column("effective_from")]
            public DateTime EffectiveFrom { get; set; }

            [Column("effective_to")]
            public DateTime? EffectiveTo { get; set; }
        }
        [Table("tickets")]
        public class CinemaTicket
        {
            [Key]
            [Column("ticket_id")]
            public int TicketId { get; set; }

            [Column("booking_id")]
            public int BookingId { get; set; }

            [Column("seat_id")]
            public int SeatId { get; set; }

            [Column("seat_type_id")]
            public byte SeatTypeId { get; set; }

            [Column("price")]
            public decimal Price { get; set; }

            [Column("qr_code")]
            public string QrCode { get; set; } = "";

            [Column("is_used")]
            public bool IsUsed { get; set; }

            [Column("used_at")]
            public DateTime? UsedAt { get; set; }

            [Column("checked_by")]
            public int? CheckedBy { get; set; }
        }
    }
}
