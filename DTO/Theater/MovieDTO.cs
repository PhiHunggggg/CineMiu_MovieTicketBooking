using System;
using System.Collections.Generic;
using System.Text;

namespace DTO.Theater
{
    public class MovieDTO
    {
        public class GenreResponse
        {
            public byte GenreId { get; set; }
            public string GenreName { get; set; } = "";
        }

        public class MovieResponse
        {
            public int Id => MovieId;
            public int MovieId { get; set; }
            public List<string>? Genres { get; set; }
            public string Title { get; set; } = "";
            public string? TitleEn { get; set; }
            public int? CountryId { get; set; }
            public short DurationMins { get; set; }
            public DateTime? ReleaseDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string? AgeRating { get; set; }
            public string? Status { get; set; }
            public string? Synopsis { get; set; }
            public string? Director { get; set; }
            public string? CastMembers { get; set; }
            public string? Language { get; set; }
            public string? Subtitle { get; set; }
            public string? PosterUrl { get; set; }
            public string? BannerUrl { get; set; }
            public string? TrailerUrl { get; set; }
            public decimal? ImdbRating { get; set; }
            public List<byte>? GenreIds { get; set; }
        }

        public class MovieDetailResponse
        {
            public MovieResponse Movie { get; set; } = new();
            public List<byte> GenreIds { get; set; } = new();
            public List<string> Genres { get; set; } = new();
        }

        public class MovieRequest
        {
            public string Title { get; set; } = "";
            public string? TitleEn { get; set; }
            public int? CountryId { get; set; }
            public short DurationMins { get; set; }
            public DateTime? ReleaseDate { get; set; }
            public DateTime? EndDate { get; set; }
            public string? AgeRating { get; set; }
            public string? Status { get; set; }
            public string? Synopsis { get; set; }
            public string? Director { get; set; }
            public string? CastMembers { get; set; }
            public string? Language { get; set; }
            public string? Subtitle { get; set; }
            public string? PosterUrl { get; set; }
            public string? BannerUrl { get; set; }
            public string? TrailerUrl { get; set; }
            public decimal? ImdbRating { get; set; }
            public List<byte>? GenreIds { get; set; }
        }

    }
}
