using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductController(SqlServerDbContext context) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var products = await context.ConcessionItems
                .AsNoTracking()
                .Where(x => x.IsAvailable)
                .OrderBy(x => x.CatId)
                .ThenBy(x => x.ItemName)
                .Select(x => new
                {
                    x.ItemId,
                    Id = x.ItemId,
                    x.CatId,
                    x.ItemName,
                    Name = x.ItemName,
                    x.Description,
                    x.Price,
                    x.ImageUrl
                })
                .ToListAsync();

            return Ok(products);
        }
    }
}
