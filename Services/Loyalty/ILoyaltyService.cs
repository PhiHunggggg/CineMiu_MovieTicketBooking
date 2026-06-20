using Entities;

namespace Services.Loyalty
{
    public interface ILoyaltyService
    {
        Task<LoyaltyMembershipResponse?> GetByUserAsync(int userId);
        Task<LoyaltyMembershipResponse?> GetByEmailAsync(string email);
        Task<List<PointTransaction>> GetTransactionsAsync(int userId);
        Task<List<PointTransaction>> GetTransactionsByEmailAsync(string email);
        Task AddPointsAsync(int userId, int points, int? bookingId = null, string? description = null);
    }

    public class LoyaltyMembershipResponse
    {
        public int UserId { get; set; }
        public int TotalPoints { get; set; }
        public int TierId { get; set; }
        public string TierName { get; set; } = "";
        public decimal DiscountPercent { get; set; }
        public string? Benefits { get; set; }
        public DateTime UpdatedAt { get; set; }
    }
}
