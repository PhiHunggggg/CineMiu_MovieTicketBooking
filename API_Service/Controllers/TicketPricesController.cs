using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

  namespace API_Service.Controllers
{
    [Route("api/ticket-prices")]
    [ApiController]
    public class TicketPricesController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public TicketPricesController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] int? cinemaId)
        {
            var query =
                from price in _context.CinemaTicketPrices.AsNoTracking()
                join cinema in _context.Cinemas.AsNoTracking() on price.CinemaId equals cinema.CinemaId
                join hallType in _context.CinemaHallTypes.AsNoTracking() on price.HallTypeId equals hallType.HallTypeId
                join seatType in _context.CinemaSeatTypes.AsNoTracking() on price.SeatTypeId equals seatType.SeatTypeId
                join dayType in _context.CinemaDayTypes.AsNoTracking() on price.DayTypeId equals dayType.DayTypeId
                select new { price, cinema, hallType, seatType, dayType };

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.price.CinemaId == cinemaId.Value);
            }

            return Ok(await query
                .OrderBy(x => x.cinema.CinemaName)
                .ThenBy(x => x.hallType.HallTypeId)
                .ThenBy(x => x.seatType.SeatTypeId)
                .ThenBy(x => x.dayType.DayTypeId)
                .ThenBy(x => x.price.TimeSlot)
                .ToListAsync());
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var price = await _context.CinemaTicketPrices.AsNoTracking().FirstOrDefaultAsync(x => x.PriceId == id);
            if (price == null)
            {
                return NotFound(new { message = "Ticket price not found" });
            }

            return Ok(price);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TicketPriceDto dto)
        {
            var validation = await Validate(dto);
            if (validation != null)
            {
                return validation;
            }

            var price = new CinemaTicketPrice
            {
                CinemaId = dto.CinemaId,
                HallTypeId = dto.HallTypeId,
                SeatTypeId = dto.SeatTypeId,
                DayTypeId = dto.DayTypeId,
                TimeSlot = dto.TimeSlot ?? "all_day",
                BasePrice = dto.BasePrice,
                EffectiveFrom = dto.EffectiveFrom ?? DateTime.UtcNow,
                EffectiveTo = dto.EffectiveTo
            };

            _context.CinemaTicketPrices.Add(price);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = price.PriceId }, price);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] TicketPriceDto dto)
        {
            var price = await _context.CinemaTicketPrices.FindAsync(id);
            if (price == null)
            {
                return NotFound(new { message = "Ticket price not found" });
            }

            var validation = await Validate(dto);
            if (validation != null)
            {
                return validation;
            }

            price.CinemaId = dto.CinemaId;
            price.HallTypeId = dto.HallTypeId;
            price.SeatTypeId = dto.SeatTypeId;
            price.DayTypeId = dto.DayTypeId;
            price.TimeSlot = dto.TimeSlot ?? price.TimeSlot;
            price.BasePrice = dto.BasePrice;
            price.EffectiveFrom = dto.EffectiveFrom ?? price.EffectiveFrom;
            price.EffectiveTo = dto.EffectiveTo;

            await _context.SaveChangesAsync();
            return Ok(price);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var price = await _context.CinemaTicketPrices.FindAsync(id);
            if (price == null)
            {
                return NotFound(new { message = "Ticket price not found" });
            }

            _context.CinemaTicketPrices.Remove(price);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<IActionResult?> Validate(TicketPriceDto dto)
        {
            if (!await _context.Cinemas.AnyAsync(x => x.CinemaId == dto.CinemaId))
            {
                return BadRequest(new { message = "Cinema not found" });
            }

            if (!await _context.CinemaHallTypes.AnyAsync(x => x.HallTypeId == dto.HallTypeId))
            {
                return BadRequest(new { message = "Hall type not found" });
            }

            if (!await _context.CinemaSeatTypes.AnyAsync(x => x.SeatTypeId == dto.SeatTypeId))
            {
                return BadRequest(new { message = "Seat type not found" });
            }

            if (!await _context.CinemaDayTypes.AnyAsync(x => x.DayTypeId == dto.DayTypeId))
            {
                return BadRequest(new { message = "Day type not found" });
            }

            if (dto.BasePrice < 0)
            {
                return BadRequest(new { message = "Base price must be greater than or equal to 0" });
            }

            return null;
        }
    }

    public class TicketPriceDto
    {
        public int CinemaId { get; set; }
        public byte HallTypeId { get; set; }
        public byte SeatTypeId { get; set; }
        public byte DayTypeId { get; set; }
        public string? TimeSlot { get; set; }
        public decimal BasePrice { get; set; }
        public DateTime? EffectiveFrom { get; set; }
        public DateTime? EffectiveTo { get; set; }
    }
}
