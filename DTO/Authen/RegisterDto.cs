using System;
using System.Collections.Generic;
using System.Text;

namespace DTO.Authen
{
    public class RegisterDto
    {
        public class RegisterRequest
        {
            public byte RoleId { get; set; }
            public int? CinemaId { get; set; }
            public string FullName { get; set; } = "";
            public string Email { get; set; } = "";
            public string Password { get; set; } = "";
            public string? Phone { get; set; }
            public DateTime? DateOfBirth { get; set; }
            public string? Gender { get; set; }
            public string? AvatarUrl { get; set; }
        }
    }
}
