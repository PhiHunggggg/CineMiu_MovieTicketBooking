using DTO.Administration;
using Entities;
using Repository.EFCore.Administration;

namespace Services.Administration;

public class NotificationService(INotificationRepository repository) : INotificationService
{
    public Task<List<NotificationDTO.Response>> GetAllAsync(
        int? userId, string? type, string? sentVia, bool unreadOnly) =>
        repository.GetAllAsync(userId, type, sentVia, unreadOnly);

    public async Task<Notification> CreateAsync(NotificationDTO.Request request)
    {
        if (!await repository.ActiveUserExistsAsync(request.UserId))
            throw new ArgumentException("User not found");
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            throw new ArgumentException("Title and message are required");

        return await repository.CreateAsync(new Notification
        {
            UserId = request.UserId,
            Type = Normalize(request.Type, "system"),
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            IsRead = false,
            SentVia = Normalize(request.SentVia, "email"),
            CreatedAt = DateTime.UtcNow
        });
    }

    public async Task<Notification> MarkReadAsync(int id, bool isRead)
    {
        var notification = await repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Notification not found");
        notification.IsRead = isRead;
        await repository.SaveAsync(notification);
        return notification;
    }

    public async Task DeleteAsync(int id)
    {
        var notification = await repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Notification not found");
        await repository.DeleteAsync(notification);
    }

    private static string Normalize(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToLowerInvariant();
}
