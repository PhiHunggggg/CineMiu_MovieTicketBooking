using DTO.Administration;
using Services.Administration;
using Microsoft.AspNetCore.Mvc;

namespace BaseCore.APIService.Controllers
{
    [Route("api/reviews")]
    [ApiController]
    public class ReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public ReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? movieId, [FromQuery] bool visibleOnly = false)
        {
            return Ok(await _reviewService.GetAllAsync(movieId, visibleOnly));
        }

        [HttpPut("{id:int}/visibility")]
        public async Task<IActionResult> UpdateVisibility(int id, [FromBody] ReviewDTO.VisibilityRequest dto)
        {
            try
            {
                var review = await _reviewService.UpdateVisibilityAsync(id, dto.IsVisible);
                return Ok(review);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Review not found" });
            }
        }

        [HttpPost("{id:int}/reply")]
        public async Task<IActionResult> Reply(int id, [FromBody] ReviewDTO.ReplyRequest dto)
        {
            try
            {
                var notification = await _reviewService.ReplyAsync(id, dto);
                return Ok(notification);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Review not found" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _reviewService.DeleteAsync(id);
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Review not found" });
            }
        }
    }
}
