using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("showtimes")]
    public class ShowTime:IAudittable
    {
        [Key]
        [Column("showtime_id")]
        public int ShowtimeId { get; set; }

        [Column("movie_id")]
        public int MovieId { get; set; }

        [Column("hall_id")]
        public int HallId { get; set; }

        [Column("start_time")]
        public DateTime StartTime { get; set; }

        [Column("end_time")]
        public DateTime EndTime { get; set; }

        [Column("language_type")]
        public string LanguageType { get; set; } = "subtitled";

        [Column("is_special")]
        public bool IsSpecial { get; set; }

        [Column("status")]
        public string Status { get; set; } = "scheduled";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
}
