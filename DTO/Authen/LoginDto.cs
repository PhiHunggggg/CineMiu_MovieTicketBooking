using Microsoft.EntityFrameworkCore.Storage.ValueConversion.Internal;
using System;
using System.Collections.Generic;
using System.Text;

namespace DTO.Authen
{
    public class LoginDto
    {
        public class LoginRequest
        {
            public string? Username { get; set; }
            public string? Email { get; set; }
            public string Password { get; set; } = string.Empty;
        }
        public class LoginResponse
        {
            public string Token { get; set; } = string.Empty;
            public string UserId { get; set; } = string.Empty;
            public byte RoleId { get; set; }
            public string FullName { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string? Phone { get; set; }
            public string? AvatarUrl { get; set; }
            public string Role { get; set; } = string.Empty;
            public int ExpiresIn { get; set; }
        }
    }
}
