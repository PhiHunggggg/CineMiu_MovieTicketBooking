using DTO.Reports;

namespace Services.Reports;

public interface IReportService
{
    Task<object> GetRevenueAsync(ReportDTO.Query query);
    Task<object> GetOccupancyAsync(ReportDTO.Query query);
}
