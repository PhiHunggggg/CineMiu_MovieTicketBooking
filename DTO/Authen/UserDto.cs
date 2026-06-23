namespace DTO.Authen;

public class UserDto
{
    public class UserResponse
    {
        public int UserId { get; set; }
        public byte RoleId { get; set; }
        public string RoleName { get; set; } = "";
        public int? CinemaId { get; set; }
        public string FullName { get; set;} = "";
        public string Email {get; set;} = "";
        public string? Phone { get; set;} 
        public string? AvatarUrl {get; set;}
        public DateTime? DateOfBirth { get; set;}
        public string? Gender { get; set;}
        public bool IsActive { get; set;}
    }

    public class UserRequest
    {
        public byte RoleId { get; set; } = 1;
        public int? CinemaId { get; set; }
        public string FullName { get; set; } = "";
        public string Email { get; set; } = "";
        public string? Password { get; set; }
        public string? Phone { get; set; }
        public string? AvatarUrl { get; set; }
        public DateTime? DateOfBirth { get; set; }
        public string? Gender { get; set; }
        public bool IsActive { get; set; } = true;
    }
    public class UpdateProfileRequest
    {
            public byte? RoleId {get; set;}
            public int? CinemaId {get; set;}
            public string? FullName { get; set; }
            public string? Email {get; set;}
            public string? Phone { get; set; }
            public string? AvatarUrl { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Gender { get; set; }
            public bool IsActive {get; set;}
            public DateTime UpdateAt {get; set;}
    }
}