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

        public class GenerateShowtimesRequest
        {
            public int MovieId { get; set; }
            public DateTime DateFrom { get; set; }
            public DateTime DateTo { get; set; }
            public int? CinemaId { get; set; }
            public List<ShowtimeSuggestion> Suggestions { get; set; } = [];
        }

        public class ShowtimeSuggestion
        {
            public int MovieId { get; set; }
            public string MovieTitle { get; set; } = "";
            public int HallId { get; set; }
            public string HallName { get; set; } = "";
            public int CinemaId { get; set; }
            public string CinemaName { get; set; } = "";
            public DateTime StartTime { get; set; }
            public DateTime EndTime { get; set; }
            public string LanguageType { get; set; } = "subtitled";
            public bool IsSpecial { get; set; }
            public string Status { get; set; } = "scheduled";
        }

        public class GenerateShowtimesPreviewResponse
        {
            public int SuggestedCount { get; set; }
            public List<ShowtimeSuggestion> Suggestions { get; set; } = [];
            public List<string> Warnings { get; set; } = [];
        }

        public class SeatLockRequest
        {
            public int UserId { get; set; }
            public string? SessionId { get; set; }
            public int Minutes { get; set; } = 10;
            public List<int> SeatIds { get; set; } = [];
        }

        public class SeatUnlockRequest
        {
            public int UserId { get; set; }
            public string? SessionId { get; set; }
        }

        public class SeatResponse
        {
            public int SeatId { get; set; }
            public int HallId { get; set; }
            public byte SeatTypeId { get; set; }
            public string? SeatTypeName { get; set; }
            public string RowLabel { get; set; } = "";
            public int ColNumber { get; set; }
            public string SeatCode { get; set; } = "";
            public decimal Price { get; set; }
            public decimal FinalPrice { get; set; }
            public string Status { get; set; } = "available";
            public bool IsActive { get; set; } = true;
            public bool IsBooked { get; set; }
            public bool IsLocked { get; set; }
            public bool IsLockedByCurrentSession { get; set; }
            public DateTime? LockExpiresAt { get; set; }
        }
    }
}
