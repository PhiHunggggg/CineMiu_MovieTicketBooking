using DTO.Promotion;
using Microsoft.AspNetCore.Mvc;
using Services.Promotion;

namespace API_Service.Controllers
{
    [Route("api/promotions")]
    [ApiController]
    public class PromotionsController(IPromotionService promotionService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] bool activeOnly = true) =>
            Ok(await promotionService.GetForApiAsync(activeOnly));

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) =>
            ExecuteAsync(() => promotionService.GetByIdAsync(id), Ok);

        [HttpGet("code/{code}")]
        public Task<IActionResult> GetByCode(string code) =>
            ExecuteAsync(() => promotionService.GetByCodeAsync(code), Ok);

        [HttpGet("vouchers/{code}")]
        public Task<IActionResult> GetVoucher(string code) =>
            ExecuteAsync(() => promotionService.GetByCodeAsync(code), Ok);

        [HttpPost("validate")]
        public Task<IActionResult> ValidatePromotion([FromBody] PromotionDto.ValidatePromotionRequest request) =>
            ExecuteAsync(() => promotionService.ValidateAsync(request), Ok);

        [HttpPost]
        public Task<IActionResult> Create([FromBody] PromotionDto.PromotionRequest request) =>
            ExecuteAsync(() => promotionService.CreateAsync(request), Ok);

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] PromotionDto.PromotionRequest request) =>
            ExecuteAsync(() => promotionService.UpdateAsync(id, request), Ok);

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) =>
            ExecuteAsync(() => promotionService.DeleteAsync(id), NoContent);

        private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, Func<T, IActionResult> onSuccess)
        {
            try
            {
                return onSuccess(await action());
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        private async Task<IActionResult> ExecuteAsync(Func<Task> action, Func<IActionResult> onSuccess)
        {
            try
            {
                await action();
                return onSuccess();
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }
    }
}
