using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("reviews")]
    public class Review
    {
        [Key]
        [Column("review_id")]
        public int ReviewId { get; set; }

        [Column("movie_id")]
        public int MovieId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("rating")]
        public byte Rating { get; set; }

        [Column("comment")]
        public string? Comment { get; set; }

        [Column("is_visible")]
        public bool IsVisible { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }

    [Table("notifications")]
    public class Notification
    {
        [Key]
        [Column("notif_id")]
        public int NotifId { get; set; }

        [Column("user_id")]
        public int UserId { get; set; }

        [Column("type")]
        public string Type { get; set; } = "system";

        [Column("title")]
        public string Title { get; set; } = "";

        [Column("message")]
        public string Message { get; set; } = "";

        [Column("is_read")]
        public bool IsRead { get; set; }

        [Column("sent_via")]
        public string SentVia { get; set; } = "email";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
    }
}
