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
            public int Id => CinemaId;
            public int CinemaId { get; set; }
            public int ChainId { get; set; }
            public string? ChainName { get; set; }
            public string CinemaName { get; set; } = "";
            public string Name => CinemaName;
            public string Address { get; set; } = "";
            public string City { get; set; } = "";
            public string? Ward { get; set; }
            public string? District => Ward;
            public string? Phone { get; set; }
            public string? Email { get; set; }
            public string? MapUrl { get; set; }
            public string? ImageUrl { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
            public bool IsActive { get; set; }
        }

        public class CinemaByMovieResponse : CinemaResponse
        {
            public int ShowtimeCount { get; set; }
        }

        public class CinemaDetailResponse
        {
            public CinemaResponse Cinema { get; set; } = new();
            public List<HallResponse> Halls { get; set; } = new();
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
            public string? MapUrl { get; set; }
            public string? ImageUrl { get; set; }
            public decimal? Latitude { get; set; }
            public decimal? Longitude { get; set; }
            public bool? IsActive { get; set; }
        }

        public class HallResponse
        {
            public int HallId { get; set; }
            public int CinemaId { get; set; }
            public byte HallTypeId { get; set; }
            public string HallName { get; set; } = "";
            public byte TotalRows { get; set; }
            public byte TotalCols { get; set; }
            public short TotalSeats { get; set; }
            public string Status { get; set; } = "active";
        }

        public class HallRequest
        {
            public byte HallTypeId { get; set; }
            public string HallName { get; set; } = "";
            public byte TotalRows { get; set; }
            public byte TotalCols { get; set; }
            public short TotalSeats { get; set; }
            public string? Status { get; set; }
        }

        public class SeatResponse
        {
            public int Id => SeatId;
            public int SeatId { get; set; }
            public int HallId { get; set; }
            public byte SeatTypeId { get; set; }
            public string RowLabel { get; set; } = "";
            public byte ColNumber { get; set; }
            public string SeatCode { get; set; } = "";
            public bool IsActive { get; set; }
        }

        public class SeatRequest
        {
            public byte SeatTypeId { get; set; }
            public string RowLabel { get; set; } = "";
            public byte ColNumber { get; set; }
            public string SeatCode { get; set; } = "";
            public bool? IsActive { get; set; }
        }
    }
}
