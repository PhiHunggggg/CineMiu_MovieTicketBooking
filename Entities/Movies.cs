using Entities.Audit;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text;

namespace Entities
{
    [Table("movies")]
    public class Movie : IAudittable
    {
        [Key]
        [Column("movie_id")]
        public int MovieId { get; set; }

        [Column("title")]
        public string Title { get; set; } = "";

        [Column("title_en")]
        public string? TitleEn { get; set; }

        [Column("country_id")]
        public int? CountryId { get; set; }

        [Column("duration_mins")]
        public short DurationMins { get; set; }

        [Column("release_date")]
        public DateTime? ReleaseDate { get; set; }

        [Column("end_date")]
        public DateTime? EndDate { get; set; }

        [Column("age_rating")]
        public string AgeRating { get; set; } = "P";

        [Column("status")]
        public string Status { get; set; } = "coming_soon";

        [Column("synopsis")]
        public string? Synopsis { get; set; }

        [Column("director")]
        public string? Director { get; set; }

        [Column("cast_members")]
        public string? CastMembers { get; set; }

        [Column("language")]
        public string? Language { get; set; }

        [Column("subtitle")]
        public string? Subtitle { get; set; }

        [Column("poster_url")]
        public string? PosterUrl { get; set; }

        [Column("banner_url")]
        public string? BannerUrl { get; set; }

        [Column("trailer_url")]
        public string? TrailerUrl { get; set; }

        [Column("imdb_rating")]
        public decimal? ImdbRating { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; }

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; }
    }
    [Table("movie_genres")]
    public class MovieGenre
    {
        [Column("movie_id")]
        public int MovieId { get; set; }
        [Column("genre_id")]
        public int GenreId { get; set; }
    }
}
