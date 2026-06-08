using DTO.Promotion;
using Microsoft.AspNetCore.Mvc;
using Services.Promotion;

namespace API_Service.Controllers
{
    [Route("api/promotions")]
    [ApiController]
    public class PromotionController(IPromotionService promotionService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? keyword, [FromQuery] string? discountType, [FromQuery] bool? isActive, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            var result = await promotionService.GetAllAsync(keyword, discountType, isActive, page, pageSize);
            return Ok(result);
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActive([FromQuery] int limit = 8)
        {
            var result = await promotionService.GetActiveAsync(limit);
            return Ok(result);
        }

        [HttpGet("{promoId:int}")]
        public async Task<IActionResult> GetById(int promoId)
        {
            try
            {
                var result = await promotionService.GetByIdAsync(promoId);
                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] PromotionDto.PromotionRequest request)
        {
            try
            {
                await promotionService.CreateAsync(request);
                return Ok(new { message = "Voucher created successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("{promoId:int}")]
        public async Task<IActionResult> Update(int promoId, [FromBody] PromotionDto.PromotionRequest request)
        {
            try
            {
                await promotionService.UpdateAsync(promoId, request);
                return Ok(new { message = "Voucher updated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{promoId:int}")]
        public async Task<IActionResult> Delete(int promoId)
        {
            try
            {
                await promotionService.DeleteAsync(promoId);
                return Ok(new { message = "Voucher deleted or deactivated successfully" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}
