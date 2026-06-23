using DTO.Promotion;

namespace Repository.EFCore.Promotion
{
    public interface IPromotionRepository
    {
        Task<List<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive);
        Task<List<PromotionDto.PromotionResponse>> GetForApiAsync(bool activeOnly);
        Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit);
        Task<PromotionDto.PromotionResponse?> GetByIdAsync(int promoId);
        Task<PromotionDto.PromotionResponse?> GetByCodeAsync(string promoCode);
        Task<int> CountUserUsesAsync(int promoId, int userId);
        Task<PromotionDto.PromotionResponse> CreateAsync(PromotionDto.PromotionRequest request);
        Task<PromotionDto.PromotionResponse> UpdateAsync(int promoId, PromotionDto.PromotionRequest request);
        Task DeleteAsync(int promoId);
    }
}
