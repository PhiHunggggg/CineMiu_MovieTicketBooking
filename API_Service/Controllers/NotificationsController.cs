using DTO.Administration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Administration;

namespace API_Service.Controllers;

[Route("api/notifications")]
[ApiController]
public class NotificationsController(INotificationService service) : ApiControllerBase
{
    [Authorize(Roles = "admin")]
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] int? userId,
        [FromQuery] string? type,
        [FromQuery] string? sentVia,
        [FromQuery] bool unreadOnly = false) =>
        Ok(await service.GetAllAsync(userId, type, sentVia, unreadOnly));

    [Authorize(Roles = "admin")]
    [HttpPost]
    public Task<IActionResult> Create([FromBody] NotificationDTO.Request request) =>
        ExecuteAsync(async () => Ok(await service.CreateAsync(request)));
    [Authorize(Roles = "admin")]
    [HttpPut("{id:int}/read")]
    public Task<IActionResult> MarkRead(int id, [FromBody] NotificationDTO.ReadRequest request) =>
        ExecuteAsync(async () => Ok(await service.MarkReadAsync(id, request.IsRead)));

    [Authorize(Roles = "admin")]
    [HttpDelete("{id:int}")]
    public Task<IActionResult> Delete(int id) => ExecuteAsync(async () =>
    {
        await service.DeleteAsync(id);
        return NoContent();
    });
}
