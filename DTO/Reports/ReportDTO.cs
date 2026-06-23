namespace DTO.Reports;

public static class ReportDTO
{
    public class Query
    {
        public int? Year { get; set; }
        public int? Month { get; set; }
        public int? CinemaId { get; set; }
        public int? MovieId { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
    }

    public class Range
    {
        public int Year { get; set; }
        public int? Month { get; set; }
        public int? CinemaId { get; set; }
        public int? MovieId { get; set; }
        public DateTime Start { get; set; }
        public DateTime EndExclusive { get; set; }
    }
}
