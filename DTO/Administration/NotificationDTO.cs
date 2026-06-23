namespace DTO.Administration;

public static class NotificationDTO
{
    public class Request
    {
        public int UserId { get; set; }
        public string? Type { get; set; }
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public string? SentVia { get; set; }
    }

    public class ReadRequest
    {
        public bool IsRead { get; set; }
    }

    public class Response
    {
        public int NotifId { get; set; }
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string Type { get; set; } = "system";
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public bool IsRead { get; set; }
        public string SentVia { get; set; } = "email";
        public DateTime CreatedAt { get; set; }
    }
}
