using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/loyalty")]
    [ApiController]
    public class LoyaltyController(SqlServerDbContext context) : ControllerBase
    {
        [HttpGet("users/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            var membership = await context.UserMemberships
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .Join(context.MemberTiers, m => m.TierId, t => t.TierId, (m, t) => new
                {
                    m.UserId,
                    m.TotalPoints,
                    m.TierId,
                    t.TierName,
                    t.Benefits,
                    t.DiscountPercent,
                    m.UpdatedAt
                })
                .FirstOrDefaultAsync();

            return Ok(membership ?? new { UserId = userId, TotalPoints = 0, TierId = 1, TierName = "Standard", Benefits = (string?)null, DiscountPercent = 0m, UpdatedAt = DateTime.UtcNow });
        }

        [HttpGet("user-by-email")]
        public async Task<IActionResult> GetByEmail([FromQuery] string email)
        {
            var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == email);
            return user == null ? NotFound() : await GetByUser(user.UserId);
        }

        [HttpGet("user/{userId:int}/transactions")]
        public async Task<IActionResult> GetTransactions(int userId)
        {
            var transactions = await context.PointTransactions
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .Select(x => new
                {
                    x.TransactionId,
                    x.UserId,
                    x.BookingId,
                    x.Points,
                    x.TransactionType,
                    x.Description,
                    x.CreatedAt
                })
                .ToListAsync();

            return Ok(transactions);
        }

        [HttpGet("transactions-by-email")]
        public async Task<IActionResult> GetTransactionsByEmail([FromQuery] string email)
        {
            var user = await context.Users.AsNoTracking().FirstOrDefaultAsync(x => x.Email == email);
            return user == null ? NotFound() : await GetTransactions(user.UserId);
        }
    }
}
