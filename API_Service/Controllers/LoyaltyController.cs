using Microsoft.AspNetCore.Mvc;
using Services.Loyalty;

namespace API_Service.Controllers
{
    [Route("api/loyalty")]
    [ApiController]
    public class LoyaltyController(ILoyaltyService loyaltyService) : ControllerBase
    {
        [HttpGet("users/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var membership = await loyaltyService.GetByUserAsync(userId);
            return membership == null
                ? NotFound(new { message = "User not found" })
                : Ok(membership);
        }

        [HttpGet("by-email")]
        public async Task<IActionResult> GetByEmail([FromQuery] string email)
        {
            var membership = await loyaltyService.GetByEmailAsync(email);
            return membership == null
                ? NotFound(new { message = "User not found" })
                : Ok(membership);
        }

        [HttpGet("users/{userId:int}/transactions")]
        public async Task<IActionResult> GetTransactions(int userId)
        {
            return Ok(await loyaltyService.GetTransactionsAsync(userId));
        }

        [HttpGet("transactions-by-email")]
        public async Task<IActionResult> GetTransactionsByEmail([FromQuery] string email)
        {
            return Ok(await loyaltyService.GetTransactionsByEmailAsync(email));
        }
    }
}
