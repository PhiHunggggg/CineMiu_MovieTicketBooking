using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("member_tiers")]
    public class MemberTier
    {
        [Key]
        [Column("tier_id")]
        public int TierId { get; set; }

        [Column("tier_name")]
        public string TierName { get; set; } = "";

        [Column("min_points")]
        public int MinPoints { get; set; }

        [Column("discount_percent")]
        public decimal DiscountPercent { get; set; }

        [Column("benefits")]
        public string? Benefits { get; set; }
    }

    [Table("user_memberships")]
    public class UserMembership
    {
        [Key]
        [Column("user_id")]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        public int UserId { get; set; }

        [Column("total_points")]
        public int TotalPoints { get; set; }

        [Column("tier_id")]
        public int TierId { get; set; } = 1;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    [Table("point_transactions")]
    public class PointTransaction
    {
        [Key]
        [Column("transaction_id")]
        public int TransactionId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("booking_id")]
        public int? BookingId { get; set; }

        [Column("points")]
        public int Points { get; set; }

        [Column("transaction_type")]
        public string TransactionType { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
