using DTO.Loyalty;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Loyalty
{
    public class LoyaltyRepository(SqlServerDbContext context) : ILoyaltyRepository
    {
        public async Task<LoyaltyDTO.MembershipResponse?> GetByUserAsync(int userId)
        {
            if (!await context.Users.AsNoTracking().AnyAsync(x => x.UserId == userId && x.IsActive))
            {
                return null;
            }

            var membership = await context.UserMemberships.AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);
            var points = membership?.TotalPoints ?? 0;
            var tier = await ResolveTierAsync(points);

            return new LoyaltyDTO.MembershipResponse
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

        public Task<int?> GetActiveUserIdByEmailAsync(string email) => context.Users.AsNoTracking()
            .Where(x => x.Email == email && x.IsActive)
            .Select(x => (int?)x.UserId)
            .FirstOrDefaultAsync();

        public Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsAsync(int userId) =>
            context.PointTransactions.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ThenByDescending(x => x.TransactionId)
                .Select(x => new LoyaltyDTO.PointTransactionResponse
                {
                    TransactionId = x.TransactionId,
                    UserId = x.UserId,
                    BookingId = x.BookingId,
                    Points = x.Points,
                    TransactionType = x.TransactionType,
                    Description = x.Description,
                    CreatedAt = x.CreatedAt
                })
                .ToListAsync();

        public async Task AddPointsAsync(LoyaltyDTO.AddPointsRequest request)
        {
            if (!await context.Users.AnyAsync(x => x.UserId == request.UserId && x.IsActive))
            {
                throw new InvalidOperationException("User not found");
            }

            if (request.BookingId.HasValue && await context.PointTransactions.AnyAsync(x =>
                    x.UserId == request.UserId &&
                    x.BookingId == request.BookingId &&
                    x.TransactionType == "earn"))
            {
                return;
            }

            var membership = await context.UserMemberships.FirstOrDefaultAsync(x => x.UserId == request.UserId);
            if (membership == null)
            {
                membership = new UserMembership
                {
                    UserId = request.UserId,
                    TotalPoints = 0,
                    UpdatedAt = DateTime.UtcNow
                };
                context.UserMemberships.Add(membership);
            }

            membership.TotalPoints += request.Points;
            membership.UpdatedAt = DateTime.UtcNow;
            var tier = await ResolveTierAsync(membership.TotalPoints);
            if (tier != null)
            {
                membership.TierId = tier.TierId;
            }

            context.PointTransactions.Add(new PointTransaction
            {
                UserId = request.UserId,
                BookingId = request.BookingId,
                Points = request.Points,
                TransactionType = "earn",
                Description = request.Description ?? "Điểm thưởng từ đặt vé",
                CreatedAt = DateTime.UtcNow
            });
            await context.SaveChangesAsync();
        }

        private Task<MemberTier?> ResolveTierAsync(int points) => context.MemberTiers.AsNoTracking()
            .Where(x => x.MinPoints <= points)
            .OrderByDescending(x => x.MinPoints)
            .ThenByDescending(x => x.TierId)
            .FirstOrDefaultAsync();
    }
}
