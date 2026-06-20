namespace DTO.Theater
{
    public class HallDTO
    {
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
        }

        public class SeatResponse
        {
            public int SeatId { get; set; }
            public int HallId { get; set; }
            public byte SeatTypeId { get; set; }
            public string? SeatTypeName { get; set; }
            public string RowLabel { get; set; } = "";
            public byte ColNumber { get; set; }
            public string SeatCode { get; set; } = "";
            public bool IsActive { get; set; }
        }

        public class SeatMapResponse : SeatResponse
        {
            public string SeatStatus { get; set; } = "empty";
            public int? BookingId { get; set; }
        }

        public class SeatUpdateRequest
        {
            public byte SeatTypeId { get; set; }
            public bool IsActive { get; set; } = true;
        }

        public class SeatBulkUpdateRequest
        {
            public List<int> SeatIds { get; set; } = new();
            public byte? SeatTypeId { get; set; }
            public bool? IsActive { get; set; }
        }

        public class HallResponse
        {
            public int HallId { get; set; }
            public int CinemaId { get; set; }
            public string? CinemaName { get; set; }
            public string? CinemaCity { get; set; }
            public byte HallTypeId { get; set; }
            public string? HallTypeName { get; set; }
            public string HallName { get; set; } = "";
            public string Name { get; set; } = "";
            public byte TotalRows { get; set; }
            public byte TotalCols { get; set; }
            public short TotalSeats { get; set; }
            public int ActiveSeatCount { get; set; }
            public string Status { get; set; } = "active";
        }

        public class HallRequest
        {
            public int CinemaId { get; set; }
            public byte HallTypeId { get; set; }
            public string HallName { get; set; } = "";
            public byte TotalRows { get; set; }
            public byte TotalCols { get; set; }
            public string? Status { get; set; }
            public byte DefaultSeatTypeId { get; set; } = 1;
        }
    }
}
