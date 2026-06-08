using System;

namespace DTO.Promotion
{
    public class PromotionDto
    {
        public class PromotionResponse
        {
            public int PromoId { get; set; }
            public string PromoCode { get; set; } = "";
            public string? Description { get; set; }
            public string DiscountType { get; set; } = "percent";
            public decimal DiscountValue { get; set; }
            public decimal MinOrderAmt { get; set; }
            public decimal? MaxDiscount { get; set; }
            public int TotalUses { get; set; }
            public int? UsageLimit { get; set; }
            public int? RemainingUses { get; set; }
            public byte PerUserLimit { get; set; }
            public DateTime ValidFrom { get; set; }
            public DateTime ValidTo { get; set; }
            public bool IsActive { get; set; }
            public bool IsExpired { get; set; }
            public bool IsExhausted { get; set; }
            public DateTime CreatedAt { get; set; }
            public DateTime? UpdatedAt { get; set; }
        }

        public class PromotionRequest
        {
            public string PromoCode { get; set; } = "";
            public string? Description { get; set; }
            public string DiscountType { get; set; } = "percent";
            public decimal DiscountValue { get; set; }
            public decimal MinOrderAmt { get; set; }
            public decimal? MaxDiscount { get; set; }
            public int? UsageLimit { get; set; }
            public byte PerUserLimit { get; set; } = 1;
            public DateTime ValidFrom { get; set; }
            public DateTime ValidTo { get; set; }
            public bool IsActive { get; set; } = true;
        }
    }
}
