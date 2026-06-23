using DTO.Loyalty;
using Repository.EFCore.Loyalty;

namespace Services.Loyalty
{
    public class LoyaltyService(ILoyaltyRepository loyaltyRepository) : ILoyaltyService
    {
        public Task<LoyaltyDTO.MembershipResponse?> GetByUserAsync(int userId) =>
            loyaltyRepository.GetByUserAsync(userId);

        public async Task<LoyaltyDTO.MembershipResponse?> GetByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return null;
            var userId = await loyaltyRepository.GetActiveUserIdByEmailAsync(email.Trim());
            return userId.HasValue ? await loyaltyRepository.GetByUserAsync(userId.Value) : null;
        }

        public Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsAsync(int userId) =>
            loyaltyRepository.GetTransactionsAsync(userId);

        public async Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsByEmailAsync(string email)
        {
            if (string.IsNullOrWhiteSpace(email)) return [];
            var userId = await loyaltyRepository.GetActiveUserIdByEmailAsync(email.Trim());
            return userId.HasValue ? await loyaltyRepository.GetTransactionsAsync(userId.Value) : [];
        }

        public Task AddPointsAsync(
            int userId,
            int points,
            int? bookingId = null,
            string? description = null)
        {
            if (points <= 0) return Task.CompletedTask;
            return loyaltyRepository.AddPointsAsync(new LoyaltyDTO.AddPointsRequest
            {
                UserId = userId,
                Points = points,
                BookingId = bookingId,
                Description = description
            });
        }
    }
}
