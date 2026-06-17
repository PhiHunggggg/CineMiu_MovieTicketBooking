using Common;
using Entities.Audit;
using System.Collections;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Reflection.Metadata;
namespace Entities
{
    [Table("roles")]
    public class Role : IAudittable
    {

        [Key]
        [Column("role_id")]
        public byte RoleId { get; set; }
        [Column("role_name")]
        public string RoleName { get; set; } = string.Empty;
        [Column("description")]
        public string Description { get; set; } = string.Empty;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
    [Table("genres")]
    public class Genre : IAudittable
    {
        [Key]
        [Column("genre_id")]
        public int GenreId { get; set; }
        [Column("genre_name")]
        public string GenreName { get; set; } = string.Empty;
        [Column("description")]
        public string Description { get; set; } = string.Empty;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
    [Table("hall_types")]
    public class HallType
    {
        [Key]
        [Column("hall_type_id")]
        public byte HallTypeId { get; set; }

        [Column("type_name")]
        public string TypeName { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("surcharge_pct")]
        public decimal SurchargePct { get; set; }
    }
    [Table("seat_types")]
    public class SeatType: IAudittable
    {
        [Key]
        [Column("seat_type_id")]
        public byte SeatTypeId { get; set; }

        [Column("type_name")]
        public string TypeName { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("price_modifier")]
        public decimal PriceModifier { get; set; }
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime? UpdatedAt { get; set; }
    }
    [Table("day_types")]
    public class DayType
    {
        [Key]
        [Column("day_type_id")]
        public byte DayTypeId { get; set; }

        [Column("type_name")]
        public string TypeName { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }
    }
    [Table("countries")]
    public class Country
    {
        [Key]
        [Column("country_id")]
        public int CountryId { get; set; }

        [Column("country_name")]
        public string CountryName { get; set; } = "";

        [Column("country_code")]
        public string? CountryCode { get; set; }
    }
    [Table("payment_methods")]
    public class PaymentMethod
    {
        [Key]
        [Column("method_id")]
        public byte MethodId { get; set; }

        [Column("method_name")]
        public string MethodName { get; set; } = "";

        [Column("provider")]
        public string? Provider { get; set; }

        [Column("logo_url")]
        public string? LogoUrl { get; set; }

        [Column("is_active")]
        public bool IsActive { get; set; } = true;
    }
}
