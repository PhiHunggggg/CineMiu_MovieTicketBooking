using DTO.Common;
using DTO.Promotion;
using Repository.EFCore.Promotion;

namespace Services.Promotion
{
    public class PromotionService(IPromotionRepository promotionRepository) : IPromotionService
    {
        public async Task<Paging.PaginationResponse<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var promotions = await promotionRepository.GetAllAsync(keyword, discountType, isActive);
            var totalCount = promotions.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = promotions.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new Paging.PaginationResponse<PromotionDto.PromotionResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit = 8)
        {
            return await promotionRepository.GetActiveAsync(limit);
        }

        public async Task<PromotionDto.PromotionResponse> GetByIdAsync(int promoId)
        {
            var promotion = await promotionRepository.GetByIdAsync(promoId);
            if (promotion == null)
            {
                throw new ArgumentException("Voucher not found");
            }

            return promotion;
        }

        public async Task CreateAsync(PromotionDto.PromotionRequest request)
        {
            await promotionRepository.CreateAsync(request);
        }

        public async Task UpdateAsync(int promoId, PromotionDto.PromotionRequest request)
        {
            await promotionRepository.UpdateAsync(promoId, request);
        }

        public async Task DeleteAsync(int promoId)
        {
            await promotionRepository.DeleteAsync(promoId);
        }
    }
}
