using DTO.Administration;
using Entities;

namespace Services.Administration;

public interface INotificationService
{
    Task<List<NotificationDTO.Response>> GetAllAsync(int? userId, string? type, string? sentVia, bool unreadOnly);
    Task<Notification> CreateAsync(NotificationDTO.Request request);
    Task<Notification> MarkReadAsync(int id, bool isRead);
    Task DeleteAsync(int id);
}
