using DTO.Administration;
using Entities;

namespace Repository.EFCore.Administration;

public interface INotificationRepository
{
    Task<List<NotificationDTO.Response>> GetAllAsync(int? userId, string? type, string? sentVia, bool unreadOnly);
    Task<bool> ActiveUserExistsAsync(int userId);
    Task<string?> GetActiveUserEmailAsync(int userId);
    Task<Notification?> GetByIdAsync(int id);
    Task<Notification> CreateAsync(Notification notification);
    Task SaveAsync(Notification notification);
    Task DeleteAsync(Notification notification);
}
