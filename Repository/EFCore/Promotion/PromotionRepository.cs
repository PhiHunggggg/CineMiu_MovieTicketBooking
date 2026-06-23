using DTO.Promotion;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Promotion
{
    public class PromotionRepository(SqlServerDbContext context) : IPromotionRepository
    {
        public async Task<List<PromotionDto.PromotionResponse>> GetAllAsync(string? keyword, string? discountType, bool? isActive)
        {
            var query = context.Promotions.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var search = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.PromoCode.ToLower().Contains(search) ||
                    (x.Description != null && x.Description.ToLower().Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(discountType))
            {
                var normalizedDiscountType = NormalizeDiscountType(discountType);
                query = query.Where(x => x.DiscountType == normalizedDiscountType);
            }

            if (isActive.HasValue)
            {
                query = query.Where(x => x.IsActive == isActive.Value);
            }

            var now = DateTime.UtcNow;
            var promotions = await query
                .OrderByDescending(x => x.IsActive)
                .ThenByDescending(x => x.CreatedAt)
                .ToListAsync();

            return promotions.Select(x => ToResponse(x, now)).ToList();
        }

        public async Task<List<PromotionDto.PromotionResponse>> GetForApiAsync(bool activeOnly)
        {
            var query = context.Promotions.AsNoTracking();
            var now = DateTime.UtcNow;
            if (activeOnly)
            {
                query = query.Where(x => x.IsActive && x.ValidFrom <= now && x.ValidTo >= now);
            }

            var promotions = await query.OrderByDescending(x => x.ValidFrom).ToListAsync();
            return promotions.Select(x => ToResponse(x, now)).ToList();
        }

        public async Task<List<PromotionDto.PromotionResponse>> GetActiveAsync(int limit)
        {
            limit = Math.Clamp(limit, 1, 100);
            var now = DateTime.UtcNow;

            var promotions = await context.Promotions
                .AsNoTracking()
                .Where(x =>
                    x.IsActive &&
                    x.ValidFrom <= now &&
                    x.ValidTo >= now &&
                    (!x.UsageLimit.HasValue || x.TotalUses < x.UsageLimit.Value))
                .OrderBy(x => x.ValidTo)
                .Take(limit)
                .ToListAsync();

            return promotions.Select(x => ToResponse(x, now)).ToList();
        }

        public async Task<PromotionDto.PromotionResponse?> GetByIdAsync(int promoId)
        {
            var promotion = await context.Promotions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PromoId == promoId);

            return promotion == null ? null : ToResponse(promotion, DateTime.UtcNow);
        }

        public async Task<PromotionDto.PromotionResponse?> GetByCodeAsync(string promoCode)
        {
            var code = NormalizePromoCode(promoCode);
            var promotion = await context.Promotions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.PromoCode.ToUpper() == code);
            return promotion == null ? null : ToResponse(promotion, DateTime.UtcNow);
        }

        public Task<int> CountUserUsesAsync(int promoId, int userId) => context.PromoUsages.AsNoTracking()
            .CountAsync(x => x.PromoId == promoId && x.UserId == userId);

        public async Task<PromotionDto.PromotionResponse> CreateAsync(PromotionDto.PromotionRequest request)
        {
            var validationError = await ValidatePromotionDto(request);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var now = DateTime.UtcNow;
            var promotion = new Entities.Promotion
            {
                PromoCode = NormalizePromoCode(request.PromoCode),
                Description = OptionalText(request.Description),
                DiscountType = NormalizeDiscountType(request.DiscountType),
                DiscountValue = request.DiscountValue,
                MinOrderAmt = request.MinOrderAmt,
                MaxDiscount = NormalizeMaxDiscount(request),
                TotalUses = 0,
                UsageLimit = request.UsageLimit,
                PerUserLimit = request.PerUserLimit,
                ValidFrom = request.ValidFrom,
                ValidTo = request.ValidTo,
                IsActive = request.IsActive ?? true,
                CreatedAt = now,
                UpdatedAt = now
            };

            context.Promotions.Add(promotion);
            await context.SaveChangesAsync();
            return ToResponse(promotion, DateTime.UtcNow);
        }

        public async Task<PromotionDto.PromotionResponse> UpdateAsync(int promoId, PromotionDto.PromotionRequest request)
        {
            var promotion = await context.Promotions.FirstOrDefaultAsync(x => x.PromoId == promoId);
            if (promotion == null)
            {
                throw new KeyNotFoundException("Promotion not found");
            }

            var validationError = await ValidatePromotionDto(request, promoId, promotion.TotalUses);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            promotion.PromoCode = NormalizePromoCode(request.PromoCode);
            promotion.Description = OptionalText(request.Description);
            promotion.DiscountType = NormalizeDiscountType(request.DiscountType);
            promotion.DiscountValue = request.DiscountValue;
            promotion.MinOrderAmt = request.MinOrderAmt;
            promotion.MaxDiscount = NormalizeMaxDiscount(request);
            promotion.UsageLimit = request.UsageLimit;
            promotion.PerUserLimit = request.PerUserLimit;
            promotion.ValidFrom = request.ValidFrom;
            promotion.ValidTo = request.ValidTo;
            promotion.IsActive = request.IsActive ?? promotion.IsActive;
            promotion.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
            return ToResponse(promotion, DateTime.UtcNow);
        }

        public async Task DeleteAsync(int promoId)
        {
            var promotion = await context.Promotions.FirstOrDefaultAsync(x => x.PromoId == promoId);
            if (promotion == null)
            {
                throw new KeyNotFoundException("Promotion not found");
            }

            promotion.IsActive = false;
            promotion.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
        }

        private async Task<string?> ValidatePromotionDto(PromotionDto.PromotionRequest dto, int? currentPromoId = null, int currentTotalUses = 0)
        {
            var promoCode = NormalizePromoCode(dto.PromoCode);
            if (string.IsNullOrWhiteSpace(promoCode))
            {
                return "Voucher code is required";
            }

            var codeExists = await context.Promotions.AnyAsync(x =>
                x.PromoCode == promoCode &&
                (!currentPromoId.HasValue || x.PromoId != currentPromoId.Value));
            if (codeExists)
            {
                return "Voucher code already exists";
            }

            var discountType = NormalizeDiscountType(dto.DiscountType);
            if (discountType != "percent" && discountType != "fixed" && discountType != "free_combo")
            {
                return "Discount type is invalid";
            }

            if (dto.DiscountValue < 0)
            {
                return "Discount and minimum order must be greater than or equal to 0";
            }

            if (dto.MinOrderAmt < 0)
            {
                return "Discount and minimum order must be greater than or equal to 0";
            }

            if (dto.ValidTo < dto.ValidFrom)
            {
                return "Valid to must be after valid from";
            }

            return null;
        }

        private static PromotionDto.PromotionResponse ToResponse(Entities.Promotion promotion, DateTime now)
        {
            var remainingUses = promotion.UsageLimit.HasValue
                ? Math.Max(promotion.UsageLimit.Value - promotion.TotalUses, 0)
                : (int?)null;

            return new PromotionDto.PromotionResponse
            {
                PromoId = promotion.PromoId,
                PromoCode = promotion.PromoCode,
                Description = promotion.Description,
                DiscountType = promotion.DiscountType,
                DiscountValue = promotion.DiscountValue,
                MinOrderAmt = promotion.MinOrderAmt,
                MaxDiscount = promotion.MaxDiscount,
                TotalUses = promotion.TotalUses,
                UsageLimit = promotion.UsageLimit,
                RemainingUses = remainingUses,
                PerUserLimit = promotion.PerUserLimit,
                ValidFrom = promotion.ValidFrom,
                ValidTo = promotion.ValidTo,
                IsActive = promotion.IsActive,
                IsExpired = promotion.ValidTo < now,
                IsExhausted = promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value,
                CreatedAt = promotion.CreatedAt,
                UpdatedAt = promotion.UpdatedAt
            };
        }

        private static string NormalizePromoCode(string? promoCode)
        {
            return (promoCode ?? "").Trim().ToUpperInvariant();
        }

        private static string NormalizeDiscountType(string? discountType)
        {
            return (discountType ?? "percent").Trim().ToLowerInvariant();
        }

        private static decimal? NormalizeMaxDiscount(PromotionDto.PromotionRequest request)
        {
            return request.MaxDiscount;
        }

        private static string? OptionalText(string? value)
        {
            var trimmed = (value ?? "").Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? null : trimmed;
        }

    }
}
