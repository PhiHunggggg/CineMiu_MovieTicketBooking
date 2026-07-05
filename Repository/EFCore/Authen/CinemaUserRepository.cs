using DTO.Authen;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Authen
{
    public class CinemaUserRepository(SqlServerDbContext context) : ICinemaUserRepository
    {
        public Task<List<CinemaUserDTO.UserResponse>> GetAllAsync(string? keyword)
        {
            var query = context.Users.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var value = keyword.Trim();
                query = query.Where(x =>
                    x.FullName.Contains(value) ||
                    x.Email.Contains(value) ||
                    (x.Phone != null && x.Phone.Contains(value)));
            }

            return query.OrderByDescending(x => x.CreatedAt)
                .Select(x => ToResponseExpression(x))
                .ToListAsync();
        }

        public async Task<CinemaUserDTO.UserResponse> GetByIdAsync(int userId)
        {
            var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == userId)
                ?? throw new KeyNotFoundException("User not found");
            return ToResponse(user);
        }

        public Task<bool> EmailExistsAsync(string email, int? excludedUserId = null) =>
            context.Users.AnyAsync(x =>
                x.Email == email && (!excludedUserId.HasValue || x.UserId != excludedUserId.Value));

        public async Task<CinemaUserDTO.UserResponse> CreateAsync(
            CinemaUserDTO.UserRequest request,
            string passwordHash)
        {
            var now = DateTime.UtcNow;
            var user = new Users
            {
                RoleId = request.RoleId!.Value,
                CinemaId = request.CinemaId,
                FullName = request.FullName,
                Email = request.Email,
                Phone = request.Phone,
                PasswordHash = passwordHash,
                AvatarUrl = request.AvatarUrl,
                DateOfBirth = request.DateOfBirth,
                Gender = request.Gender,
                IsActive = request.IsActive ?? true,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Users.Add(user);
            await context.SaveChangesAsync();
            return ToResponse(user);
        }

        public async Task<CinemaUserDTO.UserResponse> UpdateAsync(
            int userId,
            CinemaUserDTO.UserRequest request,
            string? passwordHash)
        {
            var user = await context.Users.FirstOrDefaultAsync(x => x.UserId == userId)
                ?? throw new KeyNotFoundException("User not found");

            user.RoleId = request.RoleId ?? user.RoleId;
            user.CinemaId = request.CinemaId;
            user.FullName = request.FullName;
            user.Email = request.Email;
            user.Phone = request.Phone;
            user.AvatarUrl = request.AvatarUrl;
            user.DateOfBirth = request.DateOfBirth;
            user.Gender = request.Gender;
            user.IsActive = request.IsActive ?? user.IsActive;
            user.UpdatedAt = DateTime.UtcNow;
            if (!string.IsNullOrWhiteSpace(passwordHash))
            {
                user.PasswordHash = passwordHash;
            }

            await context.SaveChangesAsync();
            return ToResponse(user);
        }

        public async Task DeactivateAsync(int userId)
        {
            var user = await context.Users.FirstOrDefaultAsync(x => x.UserId == userId)
                ?? throw new KeyNotFoundException("User not found");
            user.IsActive = false;
            user.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        private static CinemaUserDTO.UserResponse ToResponseExpression(Users x) => new()
        {
            UserId = x.UserId,
            RoleId = x.RoleId,
            CinemaId = x.CinemaId,
            FullName = x.FullName,
            Email = x.Email,
            Phone = x.Phone,
            AvatarUrl = x.AvatarUrl,
            DateOfBirth = x.DateOfBirth,
            Gender = x.Gender,
            IsActive = x.IsActive,
            CreatedAt = x.CreatedAt,
            UpdatedAt = x.UpdatedAt
        };

        private static CinemaUserDTO.UserResponse ToResponse(Users x) => ToResponseExpression(x);
    }
}
