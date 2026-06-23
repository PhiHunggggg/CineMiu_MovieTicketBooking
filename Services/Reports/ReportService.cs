using DTO.Reports;
using Repository.EFCore.Reports;

namespace Services.Reports;

public class ReportService(IReportRepository repository) : IReportService
{
    public Task<object> GetRevenueAsync(ReportDTO.Query query) =>
        repository.GetRevenueAsync(ResolveRange(query));

    public Task<object> GetOccupancyAsync(ReportDTO.Query query) =>
        repository.GetOccupancyAsync(ResolveRange(query));

    private static ReportDTO.Range ResolveRange(ReportDTO.Query query)
    {
        var year = query.Year.GetValueOrDefault(DateTime.Today.Year);
        if (year is < 2000 or > 2100) throw new ArgumentException("Year is invalid");
        if (query.Month.HasValue && query.Month is < 1 or > 12) throw new ArgumentException("Month is invalid");

        DateTime start;
        DateTime end;
        if (query.StartDate.HasValue || query.EndDate.HasValue)
        {
            if (!query.StartDate.HasValue || !query.EndDate.HasValue)
                throw new ArgumentException("Start date and end date are required together");
            start = query.StartDate.Value.Date;
            end = query.EndDate.Value.Date.AddDays(1);
            if (end <= start) throw new ArgumentException("End date must be on or after start date");
        }
        else
        {
            start = query.Month.HasValue ? new DateTime(year, query.Month.Value, 1) : new DateTime(year, 1, 1);
            end = query.Month.HasValue ? start.AddMonths(1) : start.AddYears(1);
        }

        return new ReportDTO.Range
        {
            Year = year,
            Month = query.Month,
            CinemaId = query.CinemaId,
            MovieId = query.MovieId,
            Start = start,
            EndExclusive = end
        };
    }
}
