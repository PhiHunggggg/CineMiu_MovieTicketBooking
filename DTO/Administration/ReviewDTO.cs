namespace DTO.Administration;

public static class ReviewDTO
{
    public class VisibilityRequest
    {
        public bool IsVisible { get; set; }
    }

    public class ReplyRequest
    {
        public string? Title { get; set; }
        public string Message { get; set; } = "";
        public string? SentVia { get; set; }
    }

    public class Response
    {
        public int ReviewId { get; set; }
        public int MovieId { get; set; }
        public string MovieTitle { get; set; } = "";
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public byte Rating { get; set; }
        public string? Comment { get; set; }
        public bool IsVisible { get; set; }
        public DateTime CreatedAt { get; set; }
    }

    public class Stats
    {
        public int Count { get; set; }
        public int VisibleCount { get; set; }
        public decimal AverageRating { get; set; }
    }

    public class ListResponse
    {
        public List<Response> Items { get; set; } = [];
        public Stats Stats { get; set; } = new();
    }
}
