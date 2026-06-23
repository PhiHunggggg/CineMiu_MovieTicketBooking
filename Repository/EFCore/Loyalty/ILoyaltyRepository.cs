using DTO.Loyalty;

namespace Repository.EFCore.Loyalty
{
    public interface ILoyaltyRepository
    {
        Task<LoyaltyDTO.MembershipResponse?> GetByUserAsync(int userId);
        Task<int?> GetActiveUserIdByEmailAsync(string email);
        Task<List<LoyaltyDTO.PointTransactionResponse>> GetTransactionsAsync(int userId);
        Task AddPointsAsync(LoyaltyDTO.AddPointsRequest request);
    }
}
