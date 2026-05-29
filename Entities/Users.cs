using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("users")]
    public class Users: IAudittable
    {
        [Key]
        [Column("user_id")]
        public int UserId { get; set; }

        [Column("role_id")]
        public byte RoleId { get; set; } = 1;
        [Column("cinema_id")]
        public int? CinemaId { get; set; }

        [Column("full_name")]
        public string FullName { get; set; } = "";

        [Column("email")]
        public string Email { get; set; } = "";

        [Column("phone")]
        public string? Phone { get; set; }

        [Column("password_hash")]
        public string PasswordHash { get; set; } = "";

        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("date_of_birth")]
        public DateTime? DateOfBirth { get; set; }

        [Column("gender")]
        public string? Gender { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}
