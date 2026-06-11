using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace BaseCore.APIService.Controllers
{
    [Route("api/notifications")]
    [ApiController]
    public class NotificationsController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public NotificationsController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? userId,
            [FromQuery] string? type,
            [FromQuery] string? sentVia,
            [FromQuery] bool unreadOnly = false)
        {
            var query =
                from notification in _context.CinemaNotifications.AsNoTracking()
                join user in _context.CinemaUsers.AsNoTracking() on notification.UserId equals user.UserId
                select new { notification, user };

            if (userId.HasValue)
            {
                query = query.Where(x => x.notification.UserId == userId.Value);
            }

            if (!string.IsNullOrWhiteSpace(type))
            {
                query = query.Where(x => x.notification.Type == type);
            }

            if (!string.IsNullOrWhiteSpace(sentVia))
            {
                query = query.Where(x => x.notification.SentVia == sentVia);
            }

            if (unreadOnly)
            {
                query = query.Where(x => !x.notification.IsRead);
            }

            var items = await query
                .OrderByDescending(x => x.notification.CreatedAt)
                .Take(300)
                .Select(x => new
                {
                    x.notification.NotifId,
                    x.notification.UserId,
                    x.user.FullName,
                    x.user.Email,
                    x.notification.Type,
                    x.notification.Title,
                    x.notification.Message,
                    x.notification.IsRead,
                    x.notification.SentVia,
                    x.notification.CreatedAt
                })
                .ToListAsync();

            return Ok(items);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] NotificationDto dto)
        {
            if (!await _context.CinemaUsers.AnyAsync(x => x.UserId == dto.UserId && x.IsActive))
            {
                return BadRequest(new { message = "User not found" });
            }

            if (string.IsNullOrWhiteSpace(dto.Title) || string.IsNullOrWhiteSpace(dto.Message))
            {
                return BadRequest(new { message = "Title and message are required" });
            }

            var notification = new CinemaNotification
            {
                UserId = dto.UserId,
                Type = dto.Type ?? "system",
                Title = dto.Title.Trim(),
                Message = dto.Message.Trim(),
                IsRead = false,
                SentVia = dto.SentVia ?? "email",
                CreatedAt = DateTime.UtcNow
            };

            _context.CinemaNotifications.Add(notification);
            await _context.SaveChangesAsync();
            return Ok(notification);
        }

        [HttpPut("{id:int}/read")]
        public async Task<IActionResult> MarkRead(int id, [FromBody] NotificationReadDto dto)
        {
            var notification = await _context.CinemaNotifications.FindAsync(id);
            if (notification == null)
            {
                return NotFound(new { message = "Notification not found" });
            }

            notification.IsRead = dto.IsRead;
            await _context.SaveChangesAsync();
            return Ok(notification);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var notification = await _context.CinemaNotifications.FindAsync(id);
            if (notification == null)
            {
                return NotFound(new { message = "Notification not found" });
            }

            _context.CinemaNotifications.Remove(notification);
            await _context.SaveChangesAsync();
            return NoContent();
        }
    }

    public class NotificationDto
    {
        public int UserId { get; set; }
        public string? Type { get; set; }
        public string Title { get; set; } = "";
        public string Message { get; set; } = "";
        public string? SentVia { get; set; }
    }

    public class NotificationReadDto
    {
        public bool IsRead { get; set; }
    }
}
