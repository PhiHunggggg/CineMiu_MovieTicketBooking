using DTO.Administration;
using Services.Administration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

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
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> GetAll([FromQuery] int? movieId, [FromQuery] bool visibleOnly = false)
        {
            return Ok(await _reviewService.GetAllAsync(movieId, visibleOnly));
        }

        [HttpPut("{id:int}/visibility")]
        [Authorize(Roles = "admin")]
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
        [Authorize(Roles = "admin")]
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

        [HttpPut("{id:int}")]
        [Authorize]
        public async Task<IActionResult> UpdateReview(int id, [FromBody] ReviewDTO.UpdateRequest dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var review = await _reviewService.UpdateReviewAsync(id, userId, dto);
                return Ok(review);
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Review not found" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                if (User.IsInRole("admin"))
                {
                    await _reviewService.DeleteAsync(id);
                }
                else
                {
                    var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                    await _reviewService.DeleteByUserAsync(id, userId);
                }
                return NoContent();
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Review not found" });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }
    }
}
