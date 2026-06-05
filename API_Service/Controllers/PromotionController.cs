using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/promotions")]
    [ApiController]
    public class PromotionController(SqlServerDbContext context) : ControllerBase
    {
        public class ValidatePromotionRequest
        {
            public string PromoCode { get; set; } = "";
            public int UserId { get; set; }
            public decimal OrderAmount { get; set; }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var now = DateTime.UtcNow;
            var promotions = await context.Promotions
                .AsNoTracking()
                .Where(x => x.IsActive && x.ValidFrom <= now && x.ValidTo >= now)
                .OrderByDescending(x => x.ValidTo)
                .Select(x => new
                {
                    x.PromoId,
                    Id = x.PromoId,
                    x.PromoCode,
                    x.Description,
                    x.DiscountType,
                    x.DiscountValue,
                    x.MinOrderAmt,
                    x.MaxDiscount,
                    x.ValidFrom,
                    x.ValidTo
                })
                .ToListAsync();

            return Ok(promotions);
        }

        [HttpPost("validate")]
        public async Task<IActionResult> Validate([FromBody] ValidatePromotionRequest request)
        {
            var now = DateTime.UtcNow;
            var code = request.PromoCode.Trim();
            var promo = await context.Promotions
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.PromoCode == code && x.IsActive && x.ValidFrom <= now && x.ValidTo >= now);

            if (promo == null)
            {
                return BadRequest(new { message = "Voucher không tồn tại hoặc đã hết hạn." });
            }

            if (request.OrderAmount < promo.MinOrderAmt)
            {
                return BadRequest(new { message = $"Đơn hàng tối thiểu {promo.MinOrderAmt:n0}đ để dùng voucher này." });
            }

            var discount = promo.DiscountType == "percent"
                ? request.OrderAmount * promo.DiscountValue / 100m
                : promo.DiscountValue;

            if (promo.MaxDiscount.HasValue)
            {
                discount = Math.Min(discount, promo.MaxDiscount.Value);
            }

            return Ok(new
            {
                promotion = new
                {
                    promo.PromoId,
                    promo.PromoCode,
                    promo.Description,
                    promo.DiscountType,
                    promo.DiscountValue
                },
                discountAmount = Math.Max(0, discount)
            });
        }
    }
}
