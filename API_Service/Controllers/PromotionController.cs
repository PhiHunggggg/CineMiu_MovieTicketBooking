using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

  namespace API_Service.Controllers
{
    [Route("api/promotions")]
    [ApiController]
    public class PromotionsController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public PromotionsController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = true)
        {
            var query = _context.CinemaPromotions.AsNoTracking();
            if (activeOnly)
            {
                var now = DateTime.UtcNow;
                query = query.Where(x => x.IsActive && x.ValidFrom <= now && x.ValidTo >= now);
            }

            return Ok(await query.OrderByDescending(x => x.ValidFrom).ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var promotion = await _context.CinemaPromotions.AsNoTracking().FirstOrDefaultAsync(x => x.PromoId == id);
            return promotion == null ? NotFound(new { message = "Promotion not found" }) : Ok(promotion);
        }

        // GET /api/promotions/code/SUMMER2025
        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var promotion = await _context.CinemaPromotions.AsNoTracking().FirstOrDefaultAsync(x => x.PromoCode == code);
            return promotion == null ? NotFound(new { message = "Promotion not found" }) : Ok(promotion);
        }

        // Alias kept for backward compatibility: GET /api/promotions/vouchers/SUMMER2025
        [HttpGet("vouchers/{code}")]
        public Task<IActionResult> GetVoucher(string code)
        {
            return GetByCode(code);
        }

        [HttpPost("validate")]
        public async Task<IActionResult> ValidatePromotion([FromBody] ValidatePromotionDto dto)
        {
            var code = dto.PromoCode?.Trim().ToUpperInvariant();
            var now = DateTime.UtcNow;
            var promotion = await _context.CinemaPromotions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.PromoCode.ToUpper() == code);

            if (promotion == null || !promotion.IsActive || promotion.ValidFrom > now || promotion.ValidTo < now)
            {
                return BadRequest(new { message = "Voucher không tồn tại hoặc đã hết hạn." });
            }

            if (dto.OrderAmount < promotion.MinOrderAmt)
            {
                return BadRequest(new { message = $"Đơn hàng tối thiểu {promotion.MinOrderAmt:n0}đ để dùng voucher này." });
            }

            if (promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value)
            {
                return BadRequest(new { message = "Voucher đã hết lượt sử dụng." });
            }

            if (dto.UserId > 0)
            {
                var userUses = await _context.CinemaPromoUsages.AsNoTracking()
                    .CountAsync(x => x.PromoId == promotion.PromoId && x.UserId == dto.UserId);
                if (userUses >= promotion.PerUserLimit)
                {
                    return BadRequest(new { message = "Bạn đã sử dụng hết số lượt của voucher này." });
                }
            }

            var discount = string.Equals(promotion.DiscountType, "percent", StringComparison.OrdinalIgnoreCase)
                ? dto.OrderAmount * promotion.DiscountValue / 100m
                : promotion.DiscountValue;
            if (promotion.MaxDiscount.HasValue)
            {
                discount = Math.Min(discount, promotion.MaxDiscount.Value);
            }

            return Ok(new
            {
                promotion,
                discountAmount = Math.Clamp(discount, 0, dto.OrderAmount)
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PromotionDto dto)
        {
            var validation = await Validate(dto);
            if (validation != null)
            {
                return validation;
            }

            var promotion = new CinemaPromotion
            {
                PromoCode = dto.PromoCode.Trim().ToUpper(),
                Description = dto.Description,
                DiscountType = dto.DiscountType,
                DiscountValue = dto.DiscountValue,
                MinOrderAmt = dto.MinOrderAmt,
                MaxDiscount = dto.MaxDiscount,
                UsageLimit = dto.UsageLimit,
                PerUserLimit = dto.PerUserLimit,
                ValidFrom = dto.ValidFrom,
                ValidTo = dto.ValidTo,
                IsActive = dto.IsActive ?? true
            };

            _context.CinemaPromotions.Add(promotion);
            await _context.SaveChangesAsync();
            return Ok(promotion);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] PromotionDto dto)
        {
            var promotion = await _context.CinemaPromotions.FindAsync(id);
            if (promotion == null)
            {
                return NotFound(new { message = "Promotion not found" });
            }

            var validation = await Validate(dto, id);
            if (validation != null)
            {
                return validation;
            }

            promotion.PromoCode = dto.PromoCode.Trim().ToUpper();
            promotion.Description = dto.Description;
            promotion.DiscountType = dto.DiscountType;
            promotion.DiscountValue = dto.DiscountValue;
            promotion.MinOrderAmt = dto.MinOrderAmt;
            promotion.MaxDiscount = dto.MaxDiscount;
            promotion.UsageLimit = dto.UsageLimit;
            promotion.PerUserLimit = dto.PerUserLimit;
            promotion.ValidFrom = dto.ValidFrom;
            promotion.ValidTo = dto.ValidTo;
            promotion.IsActive = dto.IsActive ?? promotion.IsActive;

            await _context.SaveChangesAsync();
            return Ok(promotion);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var promotion = await _context.CinemaPromotions.FindAsync(id);
            if (promotion == null)
            {
                return NotFound(new { message = "Promotion not found" });
            }

            promotion.IsActive = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<IActionResult?> Validate(PromotionDto dto, int? currentId = null)
        {
            if (string.IsNullOrWhiteSpace(dto.PromoCode))
            {
                return BadRequest(new { message = "Promotion code is required" });
            }

            var code = dto.PromoCode.Trim().ToUpper();
            if (await _context.CinemaPromotions.AnyAsync(x => x.PromoCode == code && (!currentId.HasValue || x.PromoId != currentId.Value)))
            {
                return BadRequest(new { message = "Promotion code already exists" });
            }

            if (dto.DiscountType != "percent" && dto.DiscountType != "fixed" && dto.DiscountType != "free_combo")
            {
                return BadRequest(new { message = "Discount type is invalid" });
            }

            if (dto.DiscountValue < 0 || dto.MinOrderAmt < 0)
            {
                return BadRequest(new { message = "Discount and minimum order must be greater than or equal to 0" });
            }

            if (dto.ValidTo < dto.ValidFrom)
            {
                return BadRequest(new { message = "Valid to must be after valid from" });
            }

            return null;
        }
    }

    public class PromotionDto
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
        public bool? IsActive { get; set; }
    }

    public class ValidatePromotionDto
    {
        public string PromoCode { get; set; } = "";
        public int UserId { get; set; }
        public decimal OrderAmount { get; set; }
    }
}
