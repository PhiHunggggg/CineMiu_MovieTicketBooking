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
            public int Id => CinemaId;
            public int ChainId { get; set; }
            public string? ChainName { get; set; }
            public string CinemaName { get; set; } = "";
            public string Name => CinemaName;
            public string Address { get; set; } = "";
            public string City { get; set; } = "";
            public string? Ward { get; set; }
            public string? District { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
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
            public string? District { get; set; }
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
            public string? MapUrl { get; set; }
            public string? ImageUrl { get; set; }
            public bool? IsActive { get; set; }
        }
    }
}
