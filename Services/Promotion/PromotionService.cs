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

        public Task<List<PromotionDto.PromotionResponse>> GetForApiAsync(bool activeOnly) =>
            promotionRepository.GetForApiAsync(activeOnly);

        public async Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit = 8)
        {
            return await promotionRepository.GetActiveAsync(limit);
        }

        public async Task<PromotionDto.PromotionResponse> GetByIdAsync(int promoId)
        {
            var promotion = await promotionRepository.GetByIdAsync(promoId);
            if (promotion == null)
            {
                throw new KeyNotFoundException("Promotion not found");
            }

            return promotion;
        }

        public async Task<PromotionDto.PromotionResponse> GetByCodeAsync(string promoCode)
        {
            var promotion = await promotionRepository.GetByCodeAsync(promoCode);
            return promotion ?? throw new KeyNotFoundException("Promotion not found");
        }

        public async Task<PromotionDto.ValidatePromotionResponse> ValidateAsync(
            PromotionDto.ValidatePromotionRequest request)
        {
            var promotion = await promotionRepository.GetByCodeAsync(request.PromoCode);
            var now = DateTime.UtcNow;
            if (promotion == null || !promotion.IsActive || promotion.ValidFrom > now || promotion.ValidTo < now)
            {
                throw new ArgumentException("Voucher không tồn tại hoặc đã hết hạn.");
            }

            if (request.OrderAmount < promotion.MinOrderAmt)
            {
                throw new ArgumentException($"Đơn hàng tối thiểu {promotion.MinOrderAmt:n0}đ để dùng voucher này.");
            }

            if (promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value)
            {
                throw new ArgumentException("Voucher đã hết lượt sử dụng.");
            }

            if (request.UserId > 0 &&
                await promotionRepository.CountUserUsesAsync(promotion.PromoId, request.UserId) >= promotion.PerUserLimit)
            {
                throw new ArgumentException("Bạn đã sử dụng hết số lượt của voucher này.");
            }

            var discount = string.Equals(promotion.DiscountType, "percent", StringComparison.OrdinalIgnoreCase)
                ? request.OrderAmount * promotion.DiscountValue / 100m
                : promotion.DiscountValue;
            if (promotion.MaxDiscount.HasValue)
            {
                discount = Math.Min(discount, promotion.MaxDiscount.Value);
            }

            return new PromotionDto.ValidatePromotionResponse
            {
                Promotion = promotion,
                DiscountAmount = Math.Clamp(discount, 0, request.OrderAmount)
            };
        }

        public Task<PromotionDto.PromotionResponse> CreateAsync(PromotionDto.PromotionRequest request) =>
            promotionRepository.CreateAsync(request);

        public Task<PromotionDto.PromotionResponse> UpdateAsync(int promoId, PromotionDto.PromotionRequest request) =>
            promotionRepository.UpdateAsync(promoId, request);

        public async Task DeleteAsync(int 
        promoId)
        {
            await promotionRepository.DeleteAsync(promoId);
        }
    }
}
