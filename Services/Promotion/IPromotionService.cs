using DTO.Common;
using DTO.Promotion;

namespace Services.Promotion
{
    public interface IPromotionService
    {
        Task<Paging.PaginationResponse<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive, int page = 1, int pageSize = 12);
        Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit = 8);
        Task<PromotionDto.PromotionResponse> GetByIdAsync(int promoId);
        Task CreateAsync(PromotionDto.PromotionRequest request);
        Task UpdateAsync(int promoId, PromotionDto.PromotionRequest request);
        Task DeleteAsync(int promoId);
    }
}
