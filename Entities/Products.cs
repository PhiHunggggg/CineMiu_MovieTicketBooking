using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("concession_categories")]
    public class CinemaConcessionCategory:IAudittable
    {
        [Key]
        [Column("cat_id")]
        public byte CatId { get; set; }

        [Column("cat_name")]
        public string CatName { get; set; } = "";
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }

    [Table("concession_items")]
    public class CinemaConcessionItem:IAudittable
    {
        [Key]
        [Column("item_id")]
        public int ItemId { get; set; }

        [Column("cat_id")]
        public byte CatId { get; set; }

        [Column("item_name")]
        public string ItemName { get; set; } = "";

        [Column("description")]
        public string? Description { get; set; }

        [Column("price")]
        public decimal Price { get; set; }

        [Column("image_url")]
        public string? ImageUrl { get; set; }

        [Column("is_available")]
        public bool IsAvailable { get; set; } = true;
        [Column("created_at")]
        public DateTime CreatedAt { get; set; }
        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
}
