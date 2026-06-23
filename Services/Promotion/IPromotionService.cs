using DTO.Common;
using DTO.Promotion;

namespace Services.Promotion
{
    public interface IPromotionService
    {
        Task<Paging.PaginationResponse<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive, int page = 1, int pageSize = 12);
        Task<List<PromotionDto.PromotionResponse>> GetForApiAsync(bool activeOnly);
        Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit = 8);
        Task<PromotionDto.PromotionResponse> GetByIdAsync(int promoId);
        Task<PromotionDto.PromotionResponse> GetByCodeAsync(string promoCode);
        Task<PromotionDto.ValidatePromotionResponse> ValidateAsync(PromotionDto.ValidatePromotionRequest request);
        Task<PromotionDto.PromotionResponse> CreateAsync(PromotionDto.PromotionRequest request);
        Task<PromotionDto.PromotionResponse> UpdateAsync(int promoId, PromotionDto.PromotionRequest request);
        Task DeleteAsync(int promoId);
    }
}
