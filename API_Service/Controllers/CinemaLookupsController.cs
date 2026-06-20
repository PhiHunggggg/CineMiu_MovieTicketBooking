using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_Service.Controllers
{
    [Route("api/cinema-lookups")]
    [ApiController]
    public class CinemaLookupsController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public CinemaLookupsController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(new
            {
                roles = await _context.Roles.AsNoTracking().OrderBy(x => x.RoleId).ToListAsync(),
                chains = await _context.Chains.AsNoTracking().OrderBy(x => x.ChainName).ToListAsync(),
                hallTypes = await _context.HallTypes.AsNoTracking().OrderBy(x => x.HallTypeId).ToListAsync(),
                seatTypes = await _context.SeatTypes.AsNoTracking().OrderBy(x => x.SeatTypeId).ToListAsync(),
                dayTypes = await _context.DayTypes.AsNoTracking().OrderBy(x => x.DayTypeId).ToListAsync(),
                genres = await _context.Genres.AsNoTracking().OrderBy(x => x.GenreName).ToListAsync(),
                countries = await _context.Countries.AsNoTracking().OrderBy(x => x.CountryName).ToListAsync(),
                concessionCategories = await _context.ConcessionCategories.AsNoTracking().OrderBy(x => x.CatId).ToListAsync(),
                paymentMethods = await _context.PaymentMethods.AsNoTracking().Where(x => x.IsActive).OrderBy(x => x.MethodId).ToListAsync()
            });
        }

        [HttpPost("genres")]
        public async Task<IActionResult> CreateGenre([FromBody] GenreDto dto)
        {
            if (await _context.Genres.AnyAsync(x => x.GenreName == dto.GenreName))
            {
                return BadRequest(new { message = "Genre already exists" });
            }

            var genre = new Genre { GenreName = dto.GenreName.Trim() };
            _context.Genres.Add(genre);
            await _context.SaveChangesAsync();
            return Ok(genre);
        }
    }

    public class GenreDto
    {
        public string GenreName { get; set; } = "";
        public string GenNameOrDefault => GenreName.Trim();
    }
}
