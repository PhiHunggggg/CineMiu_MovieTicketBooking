using DTO.Promotion;

namespace Repository.EFCore.Promotion
{
    public interface IPromotionRepository
    {
        Task<List<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive);
        Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit);
        Task<PromotionDto.PromotionResponse?> GetByIdAsync(int promoId);
        Task CreateAsync(PromotionDto.PromotionRequest request);
        Task UpdateAsync(int promoId, PromotionDto.PromotionRequest request);
        Task DeleteAsync(int promoId);
    }
}
