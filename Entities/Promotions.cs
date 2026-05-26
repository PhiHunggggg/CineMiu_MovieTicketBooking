using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("promotions")]
    public class CinemaPromotion:IAudittable
    {
        [Key]
        [Column("promo_id")]
        public int PromoId { get; set; }

        [Column("promo_code")]
        public string PromoCode { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("discount_type")]
        public string DiscountType { get; set; } = "percent";

        [Column("discount_value")]
        public decimal DiscountValue { get; set; }

        [Column("min_order_amt")]
        public decimal MinOrderAmt { get; set; }

        [Column("max_discount")]
        public decimal? MaxDiscount { get; set; }

        [Column("total_uses")]
        public int TotalUses { get; set; }

        [Column("usage_limit")]
        public int? UsageLimit { get; set; }

        [Column("per_user_limit")]
        public byte PerUserLimit { get; set; } = 1;

        [Column("valid_from")]
        public DateTime ValidFrom { get; set; }

        [Column("valid_to")]
        public DateTime ValidTo { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    [Table("promo_usages")]
    public class CinemaPromoUsage
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("promo_id")]
        public int PromoId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("booking_id")]
        public int BookingId { get; set; }

        [Column("used_at")]
        public DateTime UsedAt { get; set; }
    }
}

