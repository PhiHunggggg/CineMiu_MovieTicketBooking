using System;
using System.Collections.Generic;
using System.Text;

namespace DTO.Theater
{
    public class CinemaDTO
    {
        public class ChainResponse
        {
            public int ChainId { get; set; }
            public string ChainName { get; set; } = "";
        }

        public class CinemaResponse
        {
            public int CinemaId { get; set; }
            public int ChainId { get; set; }
            public string? ChainName { get; set; }
            public string CinemaName { get; set; } = "";
            public string Address { get; set; } = "";
            public string City { get; set; } = "";
            public string? Ward { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public string? MapUrl { get; set; }
            public string? ImageUrl { get; set; }
            public bool IsActive { get; set; }
        }

        public class CinemaRequest
        {
            public int ChainId { get; set; }
            public string CinemaName { get; set; } = "";
            public string Address { get; set; } = "";
            public string City { get; set; } = "";
            public string? Ward { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public string? MapUrl { get; set; }
            public string? ImageUrl { get; set; }
            public bool IsActive { get; set; } = true;
        }
    }
}
