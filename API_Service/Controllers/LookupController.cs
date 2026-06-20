using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Controllers
{
    [Route("api/lookups")]
    [ApiController]
    public class LookupController(SqlServerDbContext context) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var genres = await context.Genres
                .AsNoTracking()
                .OrderBy(x => x.GenreName)
                .Select(x => new { x.GenreId, Id = x.GenreId, Name = x.GenreName, x.GenreName })
                .ToListAsync();

            var seatTypes = await context.SeatTypes
                .AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .Select(x => new { x.SeatTypeId, Id = x.SeatTypeId, Name = x.TypeName, x.TypeName, x.PriceModifier })
                .ToListAsync();

            var hallTypes = await context.HallTypes
                .AsNoTracking()
                .OrderBy(x => x.HallTypeId)
                .Select(x => new { x.HallTypeId, Id = x.HallTypeId, Name = x.TypeName, x.TypeName, x.SurchargePct })
                .ToListAsync();

            return Ok(new { genres, seatTypes, hallTypes });
        }
    }
}
