using DTO.Reports;
using Microsoft.AspNetCore.Mvc;
using Services.Reports;

namespace API_Service.Controllers;

[Route("api/reports")]
[ApiController]
public class ReportsController(IReportService service) : ApiControllerBase
{
    [HttpGet("revenue")]
    public Task<IActionResult> GetRevenue([FromQuery] ReportDTO.Query query) =>
        ExecuteAsync(async () => Ok(await service.GetRevenueAsync(query)));

    [HttpGet("occupancy")]
    public Task<IActionResult> GetOccupancy([FromQuery] ReportDTO.Query query) =>
        ExecuteAsync(async () => Ok(await service.GetOccupancyAsync(query)));
}
