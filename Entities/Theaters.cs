using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    public class CinemaChain
    {
        [Key]
        [Column("chain_id")]
        public int ChainId { get; set; }

        [Column("chain_name")]
        public string ChainName { get; set; } = "";

        [Column("logo_url")]
        public string? LogoUrl { get; set; }

        [Column("website")]
        public string? Website { get; set; }
    }
    [Table("cinemas")]
    public class Cinema:IAudittable
    {
        [Key]
        [Column("cinema_id")]
        public int CinemaId { get; set; }

        [Column("chain_id")]
        public int ChainId { get; set; }

        [Column("cinema_name")]
        public string CinemaName { get; set; } = "";

        [Column("address")]
        public string Address { get; set; } = "";

        [Column("city")]
        public string City { get; set; } = "";

        [Column("district")]
        public string? District { get; set; }

        [Column("phone")]
        public string? Phone { get; set; }

        [Column("email")]
        public string? Email { get; set; }

        [Column("latitude")]
        public decimal? Latitude { get; set; }

        [Column("longitude")]
        public decimal? Longitude { get; set; }

        [Column("map_url")]
        public string? MapUrl { get; set; }

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
    [Table("halls")]
    public class CinemaHall:IAudittable
    {
        [Key]
        [Column("hall_id")]
        public int HallId { get; set; }

        [Column("cinema_id")]
        public int CinemaId { get; set; }

        [Column("hall_type_id")]
        public byte HallTypeId { get; set; }

        [Column("hall_name")]
        public string HallName { get; set; } = "";

        [Column("total_rows")]
        public byte TotalRows { get; set; }

        [Column("total_cols")]
        public byte TotalCols { get; set; }

        [Column("total_seats")]
        public short TotalSeats { get; set; }

        [Column("status")]
        public string Status { get; set; } = "active";
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
    [Table("seats")]
    public class CinemaSeat : IAudittable
    {
        [Key]
        [Column("seat_id")]
        public int SeatId { get; set; }

        [Column("hall_id")]
        public int HallId { get; set; }

        [Column("seat_type_id")]
        public byte SeatTypeId { get; set; }

        [Column("row_label")]
        public string RowLabel { get; set; } = "";

        [Column("col_number")]
        public byte ColNumber { get; set; }

        [Column("seat_code")]
        public string SeatCode { get; set; } = "";

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}
