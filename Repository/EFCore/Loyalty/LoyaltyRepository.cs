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
                TierName = tier?.TierName ?? "Thanh vien",
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

            var createdMembership = false;
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
                createdMembership = true;
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
                Description = request.Description ?? "Diem thuong tu dat ve",
                CreatedAt = DateTime.UtcNow
            });
            await SaveChangesAsync(createdMembership);
        }

        private async Task SaveChangesAsync(bool createdMembership)
        {
            if (!createdMembership || !context.Database.IsSqlServer() || !await UserMembershipUserIdIsIdentityAsync())
            {
                await context.SaveChangesAsync();
                return;
            }

            var strategy = context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                await using var transaction = await context.Database.BeginTransactionAsync();
                await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT [user_memberships] ON");
                try
                {
                    await context.SaveChangesAsync();
                    await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT [user_memberships] OFF");
                    await transaction.CommitAsync();
                }
                catch
                {
                    await context.Database.ExecuteSqlRawAsync("SET IDENTITY_INSERT [user_memberships] OFF");
                    throw;
                }
            });
        }

        private async Task<bool> UserMembershipUserIdIsIdentityAsync()
        {
            await using var command = context.Database.GetDbConnection().CreateCommand();
            command.CommandText = "SELECT CONVERT(int, COLUMNPROPERTY(OBJECT_ID('user_memberships'), 'user_id', 'IsIdentity'))";

            if (command.Connection?.State != System.Data.ConnectionState.Open)
            {
                await context.Database.OpenConnectionAsync();
            }

            var result = await command.ExecuteScalarAsync();
            return result is int value && value == 1;
        }

        private Task<MemberTier?> ResolveTierAsync(int points) => context.MemberTiers.AsNoTracking()
            .Where(x => x.MinPoints <= points)
            .OrderByDescending(x => x.MinPoints)
            .ThenByDescending(x => x.TierId)
            .FirstOrDefaultAsync();
    }
}
