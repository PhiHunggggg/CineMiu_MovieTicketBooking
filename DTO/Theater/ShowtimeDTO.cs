namespace DTO.Theater
{
    public class ShowtimeDTO
    {
        public class ShowtimeSummary
        {
            public int ShowtimeId { get; set; }
            public int MovieId { get; set; }
            public int HallId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public string LanguageType { get; set; } = "subtitled";
            public bool IsSpecial { get; set; }
            public string Status { get; set; } = "scheduled";
            public decimal BasePrice { get; set; } = 75000;
            public int TotalSeats { get; set; }
            public int AvailableSeats { get; set; }
        }

        public class ShowtimeResponse
        {
            public int ShowtimeId { get; set; }
            public int MovieId { get; set; }
            public int HallId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public string LanguageType { get; set; } = "subtitled";
            public bool IsSpecial { get; set; }
            public string Status { get; set; } = "scheduled";
            public decimal BasePrice { get; set; } = 75000;
            public int TotalSeats { get; set; }
            public int AvailableSeats { get; set; }
            public ShowtimeSummary Showtime { get; set; } = new();
            public MovieDTO.MovieResponse Movie { get; set; } = new();
            public HallDTO.HallResponse Hall { get; set; } = new();
            public CinemaDTO.CinemaResponse Cinema { get; set; } = new();
        }

        public class ShowtimeRequest
        {
            public int MovieId { get; set; }
            public int HallId { get; set; }
            public DateTime StartTime { get; set; }
            public DateTime? EndTime { get; set; }
            public string? LanguageType { get; set; }
            public bool IsSpecial { get; set; }
            public string? Status { get; set; }
        }
    }
}
