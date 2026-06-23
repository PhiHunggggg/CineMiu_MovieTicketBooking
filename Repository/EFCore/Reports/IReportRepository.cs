using DTO.Reports;

namespace Repository.EFCore.Reports;

public interface IReportRepository
{
    Task<object> GetRevenueAsync(ReportDTO.Range range);
    Task<object> GetOccupancyAsync(ReportDTO.Range range);
}
