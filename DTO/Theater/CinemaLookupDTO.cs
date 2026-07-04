namespace DTO.Theater
{
    public class CinemaLookupDTO
    {
        public class LookupResponse
        {
            public List<RoleResponse> Roles { get; set; } = [];
            public List<ChainResponse> Chains { get; set; } = [];
            public List<HallTypeResponse> HallTypes { get; set; } = [];
            public List<SeatTypeResponse> SeatTypes { get; set; } = [];
            public List<DayTypeResponse> DayTypes { get; set; } = [];
            public List<GenreResponse> Genres { get; set; } = [];
            public List<CountryResponse> Countries { get; set; } = [];
            public List<ConcessionCategoryResponse> ConcessionCategories { get; set; } = [];
            public List<PaymentMethodResponse> PaymentMethods { get; set; } = [];
        }

        public class RoleResponse
        {
            public byte RoleId { get; set; }
            public string RoleName { get; set; } = "";
            public string Description { get; set; } = "";
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class ChainResponse
        {
            public int ChainId { get; set; }
            public string ChainName { get; set; } = "";
            public string? LogoUrl { get; set; }
            public string? Website { get; set; }
        }

        public class HallTypeResponse
        {
            public byte HallTypeId { get; set; }
            public string TypeName { get; set; } = "";
            public string? Description { get; set; }
            public decimal SurchargePct { get; set; }
        }

        public class SeatTypeResponse
        {
            public byte SeatTypeId { get; set; }
            public string TypeName { get; set; } = "";
            public string? Description { get; set; }
            public decimal PriceModifier { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class DayTypeResponse
        {
            public byte DayTypeId { get; set; }
            public string TypeName { get; set; } = "";
            public string? Description { get; set; }
        }

        public class GenreResponse
        {
            public byte GenreId { get; set; }
            public string GenreName { get; set; } = "";
            public string Description { get; set; } = "";
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class GenreRequest
        {
            public string GenreName { get; set; } = "";
        }

        public class CountryResponse
        {
            public int CountryId { get; set; }
            public string CountryName { get; set; } = "";
            public string? CountryCode { get; set; }
        }

        public class ConcessionCategoryResponse
        {
            public byte CatId { get; set; }
            public string CatName { get; set; } = "";
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class PaymentMethodResponse
        {
            public byte MethodId { get; set; }
            public string MethodName { get; set; } = "";
            public string? Provider { get; set; }
            public string? LogoUrl { get; set; }
            public bool IsActive { get; set; }
        }
    }
}
