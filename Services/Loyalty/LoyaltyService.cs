using Entities;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace Services.Loyalty
{
    public class LoyaltyService(SqlServerDbContext context) : ILoyaltyService
    {
        public async Task<LoyaltyMembershipResponse?> GetByUserAsync(int userId)
        {
            if (!await context.Users.AsNoTracking().AnyAsync(x => x.UserId == userId && x.IsActive))
            {
                return null;
            }

            var membership = await context.UserMemberships.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);
            var points = membership?.TotalPoints ?? 0;
            var tier = await ResolveTierAsync(points);

            return new LoyaltyMembershipResponse
            {
                UserId = userId,
                TotalPoints = points,
                TierId = tier?.TierId ?? membership?.TierId ?? 0,
                TierName = tier?.TierName ?? "Thành viên",
                DiscountPercent = tier?.DiscountPercent ?? 0,
                Benefits = tier?.Benefits,
                UpdatedAt = membership?.UpdatedAt ?? DateTime.UtcNow
            };
        }

        public async Task<LoyaltyMembershipResponse?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return null;
            }

            var userId = await context.Users.AsNoTracking()
                .Where(x => x.Email == email.Trim() && x.IsActive)
                .Select(x => (int?)x.UserId)
                .FirstOrDefaultAsync();

            return userId.HasValue ? await GetByUserAsync(userId.Value) : null;
        }

        public async Task<List<PointTransaction>> GetTransactionsAsync(int userId)
        {
            return await context.PointTransactions.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.TransactionId)
                .ToListAsync();
        }

        public async Task<List<PointTransaction>> GetTransactionsByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return [];
            }

            var userId = await context.Users.AsNoTracking()
                .Where(x => x.Email == email.Trim() && x.IsActive)
                .Select(x => (int?)x.UserId)
                .FirstOrDefaultAsync();

            return userId.HasValue ? await GetTransactionsAsync(userId.Value) : [];
        }

        public async Task AddPointsAsync(int userId, int points, int? bookingId = null, string? description = null)
        {
            if (points <= 0)
            {
                return;
            }

            if (!await context.Users.AnyAsync(x => x.UserId == userId && x.IsActive))
            {
                throw new InvalidOperationException("User not found");
            }

            if (bookingId.HasValue && await context.PointTransactions.AnyAsync(x =>
                    x.UserId == userId &&
                    x.BookingId == bookingId &&
                    x.TransactionType == "earn"))
            {
                return;
            }

            var membership = await context.UserMemberships.FirstOrDefaultAsync(x => x.UserId == userId);
            if (membership == null)
            {
                membership = new UserMembership
                {
                    UserId = userId,
                    TotalPoints = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                context.UserMemberships.Add(membership);
            }

            membership.TotalPoints += points;
            membership.UpdatedAt = DateTime.UtcNow;

            var tier = await ResolveTierAsync(membership.TotalPoints);
            if (tier != null)
            {
                membership.TierId = tier.TierId;
            }

            context.PointTransactions.Add(new PointTransaction
            {
                UserId = userId,
                BookingId = bookingId,
                Points = points,
                TransactionType = "earn",
                Description = description ?? "Điểm thưởng từ đặt vé",
                CreatedAt = DateTime.UtcNow
            });

            await context.SaveChangesAsync();
        }

        private async Task<MemberTier?> ResolveTierAsync(int points)
        {
            return await context.MemberTiers.AsNoTracking()
                .Where(x => x.MinPoints <= points)
                .OrderByDescending(x => x.MinPoints)
                .ThenByDescending(x => x.TierId)
                .FirstOrDefaultAsync();
        }
    }
}
