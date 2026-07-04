using DTO.Administration;
using Services.Administration;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace BaseCore.APIService.Controllers
{
    [Route("api/movies/{movieId}/reviews")]
    [ApiController]
    public class MovieReviewsController : ControllerBase
    {
        private readonly IReviewService _reviewService;

        public MovieReviewsController(IReviewService reviewService)
        {
            _reviewService = reviewService;
        }

        [HttpGet]
        public async Task<IActionResult> GetPublicReviews(int movieId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            if (page < 1) page = 1;
            if (pageSize < 1) pageSize = 10;
            return Ok(await _reviewService.GetPublicReviewsAsync(movieId, page, pageSize));
        }

        [HttpGet("eligibility")]
        [Authorize]
        public async Task<IActionResult> GetEligibility(int movieId)
        {
            var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
            return Ok(await _reviewService.GetEligibilityAsync(movieId, userId));
        }

        [HttpPost]
        [Authorize]
        public async Task<IActionResult> CreateReview(int movieId, [FromBody] ReviewDTO.CreateRequest dto)
        {
            try
            {
                var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
                var review = await _reviewService.CreateReviewAsync(movieId, userId, dto);
                return StatusCode(201, review);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(409, new { message = ex.Message.Replace("409:", "") });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message.Replace("403:", "") });
            }
        }
    }
}
