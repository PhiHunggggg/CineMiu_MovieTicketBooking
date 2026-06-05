using System;
using System.Collections.Generic;
using System.Text;
using Entities;
using Microsoft.EntityFrameworkCore;
namespace Repository.EFCore.Authen
{
    public class UserRepository(SqlServerDbContext context) : IUserRepository
    {
        public async Task<List<Users>> SearchAsync(string? keyword, byte? roleId, bool? isActive)
{
    var query = context.Users.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(keyword))
    {
        keyword = keyword.Trim();
        query = query.Where(u =>
            u.FullName.Contains(keyword) ||
            u.Email.Contains(keyword) ||
            (u.Phone != null && u.Phone.Contains(keyword)));
    }

    if (roleId.HasValue) query = query.Where(u => u.RoleId == roleId.Value);
    if (isActive.HasValue) query = query.Where(u => u.IsActive == isActive.Value);

    return await query.OrderByDescending(u => u.CreatedAt).ToListAsync();
}

public Task<bool> EmailExistsAsync(string email, int? excludeUserId = null)
{
    return context.Users.AnyAsync(u =>
        u.Email == email && (!excludeUserId.HasValue || u.UserId != excludeUserId.Value));
}

public Task<List<Role>> GetRolesAsync()
{
    return context.Roles.AsNoTracking().OrderBy(r => r.RoleId).ToListAsync();
}
        public async Task<Users?> GetByIndentifierAsync(string identifier)
        {
            identifier = identifier.Trim();
            return await context.Users
                .FirstOrDefaultAsync(u=>
                    u.IsActive &&
                   (u.Email == identifier ||
                   (u.Phone != null && u.Phone == identifier))
                );
        }
        public async Task<Users?> GetByIdAsync(int id)
        {
            return await context.Users
                .FirstOrDefaultAsync(u => u.UserId == id);
        }
        public async Task<List<Users>> GetAllAsync()
        {
            return await context.Users
                .Where(u => u.IsActive)
                .OrderByDescending(u => u.CreatedAt)
                .ToListAsync();
        }
        public async Task CreateAsync(Users user)
        {
            await context.Users.AddAsync(user);
            await context.SaveChangesAsync();
        }
        public async Task UpdateAsync(Users user)
        {
            context.Users.Update(user);
            await context.SaveChangesAsync();
        }
        public async Task DeleteAsync(int id)
        {
            var user = await GetByIdAsync(id);
            if (user == null)
            {
                return;
            }

            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }
        public async Task<string?> ResolveRoleName(byte roleId)
        {
            var role = await context.Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
            return role?.RoleName;
        }
    }

}
