using Entities;
using Repository;
using Repository.Pricing;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Globalization;

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
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword = null,
            [FromQuery] int? cinemaId = null,
            [FromQuery] byte? hallTypeId = null,
            [FromQuery] byte? seatTypeId = null,
            [FromQuery] byte? dayTypeId = null,
            [FromQuery] string? timeSlot = null,
            [FromQuery] string? status = null,
            [FromQuery] decimal? minPrice = null,
            [FromQuery] decimal? maxPrice = null,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10)
        {
            page = Math.Max(page, 1);
            pageSize = pageSize is 10 or 20 or 50 ? pageSize : 10;

            if (minPrice < 0 || maxPrice < 0)
            {
                return BadRequest(new { message = "Price range must be greater than or equal to 0" });
            }

            if (minPrice.HasValue && maxPrice.HasValue && minPrice.Value > maxPrice.Value)
            {
                return BadRequest(new { message = "Minimum price must be less than or equal to maximum price" });
            }

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

            if (hallTypeId.HasValue)
            {
                query = query.Where(x => x.price.HallTypeId == hallTypeId.Value);
            }

            if (seatTypeId.HasValue)
            {
                query = query.Where(x => x.price.SeatTypeId == seatTypeId.Value);
            }

            if (dayTypeId.HasValue)
            {
                query = query.Where(x => x.price.DayTypeId == dayTypeId.Value);
            }

            if (!string.IsNullOrWhiteSpace(timeSlot))
            {
                var normalizedTimeSlot = TicketPriceCalculator.NormalizeTimeSlot(timeSlot);
                if (!TicketPriceCalculator.AllowedTimeSlots.Contains(normalizedTimeSlot))
                {
                    return BadRequest(new { message = "Time slot is invalid" });
                }

                query = query.Where(x => x.price.TimeSlot == normalizedTimeSlot);
            }

            if (minPrice.HasValue)
            {
                query = query.Where(x => x.price.BasePrice >= minPrice.Value);
            }

            if (maxPrice.HasValue)
            {
                query = query.Where(x => x.price.BasePrice <= maxPrice.Value);
            }

            var today = DateTime.Today;
            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLowerInvariant();
                query = normalizedStatus switch
                {
                    "active" => query.Where(x =>
                        x.price.EffectiveFrom.Date <= today &&
                        (!x.price.EffectiveTo.HasValue || x.price.EffectiveTo.Value.Date >= today)),
                    "upcoming" => query.Where(x => x.price.EffectiveFrom.Date > today),
                    "expired" => query.Where(x =>
                        x.price.EffectiveTo.HasValue &&
                        x.price.EffectiveTo.Value.Date < today),
                    _ => query
                };

                if (normalizedStatus is not ("active" or "upcoming" or "expired"))
                {
                    return BadRequest(new { message = "Price status is invalid" });
                }
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var searchTerm = keyword.Trim();
                var priceKeyword = ParsePriceKeyword(searchTerm);
                var matchingDayTypeIds = (await _context.CinemaDayTypes
                        .AsNoTracking()
                        .ToListAsync())
                    .Where(x => DayTypeLocalizer
                        .ToVietnamese(x.TypeName, x.Description)
                        .Contains(searchTerm, StringComparison.OrdinalIgnoreCase))
                    .Select(x => x.DayTypeId)
                    .ToList();

                query = query.Where(x =>
                    x.cinema.CinemaName.Contains(searchTerm) ||
                    x.cinema.City.Contains(searchTerm) ||
                    (x.cinema.District != null && x.cinema.District.Contains(searchTerm)) ||
                    x.hallType.TypeName.Contains(searchTerm) ||
                    x.seatType.TypeName.Contains(searchTerm) ||
                    x.dayType.TypeName.Contains(searchTerm) ||
                    matchingDayTypeIds.Contains(x.price.DayTypeId) ||
                    x.price.TimeSlot.Contains(searchTerm) ||
                    (priceKeyword.HasValue && x.price.BasePrice == priceKeyword.Value));
            }

            var totalCount = await query.CountAsync();
            var totalPages = Math.Max((int)Math.Ceiling(totalCount / (double)pageSize), 1);
            page = Math.Min(page, totalPages);

            var summary = await query
                .GroupBy(_ => 1)
                .Select(group => new
                {
                    minPrice = group.Min(x => x.price.BasePrice),
                    maxPrice = group.Max(x => x.price.BasePrice),
                    cinemaCount = group.Select(x => x.price.CinemaId).Distinct().Count()
                })
                .FirstOrDefaultAsync();

            var itemRows = await query
                .OrderBy(x => x.cinema.CinemaName)
                .ThenBy(x => x.hallType.HallTypeId)
                .ThenBy(x => x.seatType.SeatTypeId)
                .ThenBy(x => x.dayType.DayTypeId)
                .ThenBy(x => x.price.TimeSlot)
                .ThenBy(x => x.price.PriceId)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.price,
                    x.cinema,
                    x.hallType,
                    x.seatType,
                    x.dayType,
                    status = x.price.EffectiveFrom.Date > today
                        ? "upcoming"
                        : x.price.EffectiveTo.HasValue && x.price.EffectiveTo.Value.Date < today
                            ? "expired"
                            : "active"
                })
                .ToListAsync();

            var items = itemRows.Select(x => new
            {
                x.price,
                x.cinema,
                x.hallType,
                x.seatType,
                dayType = new
                {
                    x.dayType.DayTypeId,
                    TypeName = DayTypeLocalizer.ToVietnamese(x.dayType.TypeName, x.dayType.Description),
                    x.dayType.Description
                },
                x.status
            });

            return Ok(new
            {
                items,
                totalCount,
                page,
                pageSize,
                totalPages,
                summary = new
                {
                    total = totalCount,
                    minPrice = summary?.minPrice ?? 0,
                    maxPrice = summary?.maxPrice ?? 0,
                    cinemaCount = summary?.cinemaCount ?? 0
                }
            });
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
            var effectiveFrom = (dto.EffectiveFrom ?? DateTime.UtcNow).Date;
            var effectiveTo = dto.EffectiveTo?.Date;
            var timeSlot = TicketPriceCalculator.NormalizeTimeSlot(dto.TimeSlot);
            var validation = await Validate(dto, timeSlot, effectiveFrom, effectiveTo, validateOverlap: false);
            if (validation != null)
            {
                return validation;
            }

            var existingExactPrice = (await _context.CinemaTicketPrices
                    .Where(x =>
                        x.CinemaId == dto.CinemaId &&
                        x.HallTypeId == dto.HallTypeId &&
                        x.SeatTypeId == dto.SeatTypeId &&
                        x.DayTypeId == dto.DayTypeId)
                    .ToListAsync())
                .FirstOrDefault(x =>
                    string.Equals(
                        TicketPriceCalculator.NormalizeTimeSlot(x.TimeSlot),
                        timeSlot,
                        StringComparison.OrdinalIgnoreCase) &&
                    x.EffectiveFrom.Date == effectiveFrom &&
                    NullableDateEquals(x.EffectiveTo, effectiveTo));

            if (existingExactPrice != null)
            {
                existingExactPrice.TimeSlot = timeSlot;
                existingExactPrice.BasePrice = dto.BasePrice;
                await _context.SaveChangesAsync();
                return Ok(existingExactPrice);
            }

            var price = new CinemaTicketPrice
            {
                CinemaId = dto.CinemaId,
                HallTypeId = dto.HallTypeId,
                SeatTypeId = dto.SeatTypeId,
                DayTypeId = dto.DayTypeId,
                TimeSlot = timeSlot,
                BasePrice = dto.BasePrice,
                EffectiveFrom = effectiveFrom,
                EffectiveTo = effectiveTo
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

            var effectiveFrom = (dto.EffectiveFrom ?? price.EffectiveFrom).Date;
            var effectiveTo = dto.EffectiveTo?.Date;
            var timeSlot = TicketPriceCalculator.NormalizeTimeSlot(dto.TimeSlot ?? price.TimeSlot);
            var validation = await Validate(dto, timeSlot, effectiveFrom, effectiveTo, id, validateOverlap: false);
            if (validation != null)
            {
                return validation;
            }

            price.CinemaId = dto.CinemaId;
            price.HallTypeId = dto.HallTypeId;
            price.SeatTypeId = dto.SeatTypeId;
            price.DayTypeId = dto.DayTypeId;
            price.TimeSlot = timeSlot;
            price.BasePrice = dto.BasePrice;
            price.EffectiveFrom = effectiveFrom;
            price.EffectiveTo = effectiveTo;

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

        private async Task<IActionResult?> Validate(
            TicketPriceDto dto,
            string timeSlot,
            DateTime effectiveFrom,
            DateTime? effectiveTo,
            int? currentPriceId = null,
            bool validateOverlap = true)
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

            if (!await _context.CinemaHalls.AnyAsync(x =>
                    x.CinemaId == dto.CinemaId &&
                    x.HallTypeId == dto.HallTypeId))
            {
                return BadRequest(new { message = "The selected cinema does not have this hall type" });
            }

            if (!TicketPriceCalculator.AllowedTimeSlots.Contains(timeSlot))
            {
                return BadRequest(new { message = "Time slot is invalid" });
            }

            if (dto.BasePrice < 0)
            {
                return BadRequest(new { message = "Base price must be greater than or equal to 0" });
            }

            if (effectiveTo.HasValue && effectiveTo.Value < effectiveFrom)
            {
                return BadRequest(new { message = "Effective end date must be on or after the start date" });
            }

            if (!validateOverlap)
            {
                return null;
            }

            var candidates = await _context.CinemaTicketPrices
                .AsNoTracking()
                .Where(x =>
                    (!currentPriceId.HasValue || x.PriceId != currentPriceId.Value) &&
                    x.CinemaId == dto.CinemaId &&
                    x.HallTypeId == dto.HallTypeId &&
                    x.SeatTypeId == dto.SeatTypeId &&
                    x.DayTypeId == dto.DayTypeId)
                .ToListAsync();

            var hasOverlappingRule = candidates.Any(x =>
                string.Equals(
                    TicketPriceCalculator.NormalizeTimeSlot(x.TimeSlot),
                    timeSlot,
                    StringComparison.OrdinalIgnoreCase) &&
                x.EffectiveFrom.Date <= (effectiveTo ?? DateTime.MaxValue).Date &&
                effectiveFrom <= (x.EffectiveTo?.Date ?? DateTime.MaxValue.Date));
            if (hasOverlappingRule)
            {
                return Conflict(new
                {
                    message = "A ticket price with the same cinema, hall type, seat type, day type and time slot already exists in this effective period"
                });
            }

            return null;
        }

        private static bool NullableDateEquals(DateTime? left, DateTime? right)
        {
            if (!left.HasValue || !right.HasValue)
            {
                return left.HasValue == right.HasValue;
            }

            return left.Value.Date == right.Value.Date;
        }

        private static decimal? ParsePriceKeyword(string keyword)
        {
            var digits = new string(keyword.Where(char.IsDigit).ToArray());
            return decimal.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var digitValue)
                ? digitValue
                : null;
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
