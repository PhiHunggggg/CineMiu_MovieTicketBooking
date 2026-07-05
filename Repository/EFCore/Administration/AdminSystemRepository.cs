using DTO.Administration;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Administration;

public class AdminSystemRepository(SqlServerDbContext context) : IAdminSystemRepository
{
    public async Task<AdminSystemDTO.SummaryResponse> GetSummaryAsync()
    {
        var now = DateTime.UtcNow;
        var roles = await context.Roles.AsNoTracking().OrderBy(x => x.RoleId)
            .Select(x => new AdminSystemDTO.RoleResponse
            {
                Id = x.RoleId,
                Name = x.RoleName,
                Description = x.Description,
                UserCount = context.Users.Count(user => user.RoleId == x.RoleId)
            }).ToListAsync();

        return new AdminSystemDTO.SummaryResponse
        {
            UserCount = await context.Users.CountAsync(),
            ActiveUserCount = await context.Users.CountAsync(x => x.IsActive),
            RoleCount = roles.Count,
            ActiveSessionCount = await context.SeatLocks.Where(x => x.ExpiresAt > now)
                .Select(x => x.SessionId).Distinct().CountAsync(),
            ActiveSeatLockCount = await context.SeatLocks.CountAsync(x => x.ExpiresAt > now),
            Roles = roles
        };
    }

    public async Task<List<AdminSystemDTO.SessionResponse>> GetSessionsAsync()
    {
        var now = DateTime.UtcNow;
        return await (
            from seatLock in context.SeatLocks.AsNoTracking()
            join user in context.Users.AsNoTracking() on seatLock.UserId equals user.UserId
            where seatLock.ExpiresAt > now
            group new { seatLock, user } by new
            {
                seatLock.SessionId,
                seatLock.UserId,
                user.FullName,
                user.Email
            } into session
            orderby session.Max(x => x.seatLock.LockedAt) descending
            select new AdminSystemDTO.SessionResponse
            {
                SessionId = session.Key.SessionId,
                UserId = session.Key.UserId,
                FullName = session.Key.FullName,
                Email = session.Key.Email,
                LockedSeatCount = session.Count(),
                LastActivityAt = session.Max(x => x.seatLock.LockedAt),
                ExpiresAt = session.Max(x => x.seatLock.ExpiresAt)
            }).ToListAsync();
    }

    public Task<Role?> GetRoleAsync(byte id) => context.Roles.FirstOrDefaultAsync(x => x.RoleId == id);

    public Task<bool> RoleNameExistsAsync(string name, byte? excludeId = null) =>
        context.Roles.AnyAsync(x => x.RoleName == name && (!excludeId.HasValue || x.RoleId != excludeId.Value));

    public Task<bool> RoleHasUsersAsync(byte id) => context.Users.AnyAsync(x => x.RoleId == id);

    public async Task<Role> CreateRoleAsync(string name, string description)
    {
        var nextId = await context.Roles.AnyAsync()
            ? (byte)(await context.Roles.MaxAsync(x => x.RoleId) + 1)
            : (byte)1;
        var role = new Role
        {
            RoleId = nextId,
            RoleName = name,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };
        context.Roles.Add(role);
        await context.SaveChangesAsync();
        return role;
    }

    public async Task SaveRoleAsync(Role role)
    {
        role.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    public async Task DeleteRoleAsync(Role role)
    {
        context.Roles.Remove(role);
        await context.SaveChangesAsync();
    }

    public async Task DeleteSessionAsync(string sessionId)
    {
        var locks = await context.SeatLocks.Where(x => x.SessionId == sessionId).ToListAsync();
        if (locks.Count == 0) throw new KeyNotFoundException("Session not found");
        context.SeatLocks.RemoveRange(locks);
        await context.SaveChangesAsync();
    }
}
