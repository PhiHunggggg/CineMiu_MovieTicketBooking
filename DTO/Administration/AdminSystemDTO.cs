namespace DTO.Administration;

public static class AdminSystemDTO
{
    public class RoleRequest
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    public class RoleResponse
    {
        public byte Id { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }

    public class SessionResponse
    {
        public string SessionId { get; set; } = "";
        public int UserId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public int LockedSeatCount { get; set; }
        public DateTime LastActivityAt { get; set; }
        public DateTime ExpiresAt { get; set; }
    }

    public class SummaryResponse
    {
        public int UserCount { get; set; }
        public int ActiveUserCount { get; set; }
        public int RoleCount { get; set; }
        public int ActiveSessionCount { get; set; }
        public List<RoleResponse> Roles { get; set; } = [];
    }
}
