namespace DTO.Pricing;

public static class TicketPriceDTO
{
    public class Request
    {
        public int CinemaId { get; set; }
        public byte HallTypeId { get; set; }
        public byte SeatTypeId { get; set; }
        public byte DayTypeId { get; set; }
        public string? TimeSlot { get; set; }
        public decimal BasePrice { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }

    public class Query
    {
        public string? Keyword { get; set; }
        public int? CinemaId { get; set; }
        public byte? HallTypeId { get; set; }
        public byte? SeatTypeId { get; set; }
        public byte? DayTypeId { get; set; }
        public string? TimeSlot { get; set; }
        public string? Status { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 10;
    }
}
