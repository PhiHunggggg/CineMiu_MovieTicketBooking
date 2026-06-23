using DTO.Loyalty;

namespace Services.Loyalty
{
    public interface ILoyaltyService
    {
        Task<LoyaltyDTO.MembershipResponse?> GetByUserAsync(int userId);
        Task<LoyaltyDTO.MembershipResponse?> GetByEmailAsync(string email);
        Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsAsync(int userId);
        Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsByEmailAsync(string email);
        Task AddPointsAsync(int userId, int points, int? bookingId = null, string? description = null);
    }
}
