using DTO.Administration;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Administration;

public class NotificationRepository(SqlServerDbContext context) : INotificationRepository
{
    public async Task<List<NotificationDTO.Response>> GetAllAsync(
        int? userId, string? type, string? sentVia, bool unreadOnly)
    {
        var query =
            from notification in context.Notifications.AsNoTracking()
            join user in context.Users.AsNoTracking() on notification.UserId equals user.UserId
            select new { notification, user };

        if (userId.HasValue) query = query.Where(x => x.notification.UserId == userId.Value);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(x => x.notification.Type == type);
        if (!string.IsNullOrWhiteSpace(sentVia)) query = query.Where(x => x.notification.SentVia == sentVia);
        if (unreadOnly) query = query.Where(x => !x.notification.IsRead);

        return await query.OrderByDescending(x => x.notification.CreatedAt).Take(300)
            .Select(x => new NotificationDTO.Response
            {
                NotifId = x.notification.NotifId,
                UserId = x.notification.UserId,
                FullName = x.user.FullName,
                Email = x.user.Email,
                Type = x.notification.Type,
                Title = x.notification.Title,
                Message = x.notification.Message,
                IsRead = x.notification.IsRead,
                SentVia = x.notification.SentVia,
                CreatedAt = x.notification.CreatedAt
            }).ToListAsync();
    }

    public Task<bool> ActiveUserExistsAsync(int userId) =>
        context.Users.AnyAsync(x => x.UserId == userId && x.IsActive);

    public Task<string?> GetActiveUserEmailAsync(int userId) =>
        context.Users.AsNoTracking()
            .Where(x => x.UserId == userId && x.IsActive)
            .Select(x => x.Email)
            .FirstOrDefaultAsync();

    public Task<Notification?> GetByIdAsync(int id) =>
        context.Notifications.FirstOrDefaultAsync(x => x.NotifId == id);

    public async Task<Notification> CreateAsync(Notification notification)
    {
        context.Notifications.Add(notification);
        await context.SaveChangesAsync();
        return notification;
    }

    public Task SaveAsync(Notification notification) => context.SaveChangesAsync();

    public async Task DeleteAsync(Notification notification)
    {
        context.Notifications.Remove(notification);
        await context.SaveChangesAsync();
    }
}
