using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_Service.Controllers
{
    [Route("api/cinemas")]
    [ApiController]
    public class CinemasController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public CinemasController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? city, [FromQuery] bool activeOnly = true)
        {
            var query = _context.Cinemas.AsNoTracking();
            if (activeOnly)
            {
                query = query.Where(x => x.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(city))
            {
                query = query.Where(x => x.City == city);
            }

            var results = await query.OrderBy(x => x.City).ThenBy(x => x.CinemaName).ToListAsync();
            var response = results.Select(x => new
            {
                id = x.CinemaId,
                cinemaId = x.CinemaId,
                chainId = x.ChainId,
                name = x.CinemaName,
                cinemaName = x.CinemaName,
                address = x.Address,
                city = x.City,
                district = x.District,
                phone = x.Phone,
                email = x.Email,
                latitude = x.Latitude,
                longitude = x.Longitude,
                mapUrl = x.MapUrl,
                imageUrl = x.ImageUrl,
                isActive = x.IsActive
            });

            return Ok(response);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var cinema = await _context.Cinemas.AsNoTracking().FirstOrDefaultAsync(x => x.CinemaId == id);
            if (cinema == null)
            {
                return NotFound(new { message = "Cinema not found" });
            }

            var halls = await _context.CinemaHalls.AsNoTracking().Where(x => x.CinemaId == id).ToListAsync();
            return Ok(new { cinema, halls });
        }

        [HttpGet("{cinemaId:int}/halls")]
        public async Task<IActionResult> GetHalls(int cinemaId)
        {
            if (!await _context.Cinemas.AsNoTracking().AnyAsync(x => x.CinemaId == cinemaId))
            {
                return NotFound(new { message = "Cinema not found" });
            }

            var halls = await _context.CinemaHalls.AsNoTracking()
                .Where(x => x.CinemaId == cinemaId)
                .OrderBy(x => x.HallName)
                .ToListAsync();

            return Ok(halls);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CinemaDto dto)
        {
            if (dto.ChainId <= 0)
            {
                return BadRequest(new { message = "ChainId is required" });
            }

            var cinema = new Cinema
            {
                ChainId = dto.ChainId,
                CinemaName = dto.CinemaName,
                Address = dto.Address,
                City = dto.City,
                District = dto.District,
                Phone = dto.Phone,
                Email = dto.Email,
                Latitude = dto.Latitude,
                Longitude = dto.Longitude,
                MapUrl = dto.MapUrl,
                ImageUrl = dto.ImageUrl,
                IsActive = dto.IsActive ?? true
            };

            _context.Cinemas.Add(cinema);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetById), new { id = cinema.CinemaId }, cinema);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CinemaDto dto)
        {
            var cinema = await _context.Cinemas.FindAsync(id);
            if (cinema == null)
            {
                return NotFound(new { message = "Cinema not found" });
            }

            if (dto.ChainId <= 0)
            {
                return BadRequest(new { message = "ChainId is required" });
            }

            cinema.ChainId = dto.ChainId;
            cinema.CinemaName = dto.CinemaName;
            cinema.Address = dto.Address;
            cinema.City = dto.City;
            cinema.District = dto.District;
            cinema.Phone = dto.Phone;
            cinema.Email = dto.Email;
            cinema.Latitude = dto.Latitude;
            cinema.Longitude = dto.Longitude;
            cinema.MapUrl = dto.MapUrl;
            cinema.ImageUrl = dto.ImageUrl;
            cinema.IsActive = dto.IsActive ?? cinema.IsActive;

            await _context.SaveChangesAsync();
            return Ok(cinema);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var cinema = await _context.Cinemas.FindAsync(id);
            if (cinema == null)
            {
                return NotFound(new { message = "Cinema not found" });
            }

            cinema.IsActive = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost("{cinemaId:int}/halls")]
        public async Task<IActionResult> CreateHall(int cinemaId, [FromBody] HallDto dto)
        {
            if (!await _context.Cinemas.AnyAsync(x => x.CinemaId == cinemaId))
            {
                return NotFound(new { message = "Cinema not found" });
            }

            var hall = new CinemaHall
            {
                CinemaId = cinemaId,
                HallTypeId = dto.HallTypeId,
                HallName = dto.HallName,
                TotalRows = dto.TotalRows,
                TotalCols = dto.TotalCols,
                TotalSeats = dto.TotalSeats,
                Status = dto.Status ?? "active"
            };

            _context.CinemaHalls.Add(hall);
            await _context.SaveChangesAsync();
            await CreateSeatsForHall(hall);
            return Ok(hall);
        }

        [HttpPut("halls/{hallId:int}")]
        public async Task<IActionResult> UpdateHall(int hallId, [FromBody] HallDto dto)
        {
            var hall = await _context.CinemaHalls.FindAsync(hallId);
            if (hall == null)
            {
                return NotFound(new { message = "Hall not found" });
            }

            if (!await _context.Cinemas.AnyAsync(x => x.CinemaId == hall.CinemaId))
            {
                return NotFound(new { message = "Cinema not found" });
            }

            hall.HallTypeId = dto.HallTypeId;
            hall.HallName = dto.HallName;
            hall.TotalRows = dto.TotalRows;
            hall.TotalCols = dto.TotalCols;
            hall.TotalSeats = dto.TotalSeats;
            hall.Status = dto.Status ?? hall.Status;

            await _context.SaveChangesAsync();
            return Ok(hall);
        }

        [HttpDelete("halls/{hallId:int}")]
        public async Task<IActionResult> DeleteHall(int hallId)
        {
            var hall = await _context.CinemaHalls.FindAsync(hallId);
            if (hall == null)
            {
                return NotFound(new { message = "Hall not found" });
            }

            if (await _context.CinemaShowtimes.AnyAsync(x => x.HallId == hallId))
            {
                return BadRequest(new { message = "Cannot delete hall because it has showtimes" });
            }

            _context.CinemaSeats.RemoveRange(_context.CinemaSeats.Where(x => x.HallId == hallId));
            _context.CinemaHalls.Remove(hall);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpGet("halls/{hallId:int}/seats")]
        public async Task<IActionResult> GetSeats(int hallId)
        {
            var seats = await _context.CinemaSeats.AsNoTracking()
                .Where(x => x.HallId == hallId)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToListAsync();

            var response = seats.Select(x => new
            {
                id = x.SeatId,
                seatId = x.SeatId,
                hallId = x.HallId,
                seatTypeId = x.SeatTypeId,
                rowLabel = x.RowLabel,
                colNumber = x.ColNumber,
                seatCode = x.SeatCode,
                isActive = x.IsActive
            });

            return Ok(response);
        }

        [HttpPost("halls/{hallId:int}/seats")]
        public async Task<IActionResult> CreateSeat(int hallId, [FromBody] SeatDto dto)
        {
            if (!await _context.CinemaHalls.AnyAsync(x => x.HallId == hallId))
            {
                return NotFound(new { message = "Hall not found" });
            }

            var seat = new CinemaSeat
            {
                HallId = hallId,
                SeatTypeId = dto.SeatTypeId,
                RowLabel = dto.RowLabel,
                ColNumber = dto.ColNumber,
                SeatCode = dto.SeatCode,
                IsActive = dto.IsActive ?? true
            };

            _context.CinemaSeats.Add(seat);
            await _context.SaveChangesAsync();
            return Ok(seat);
        }

        [HttpPut("halls/{hallId:int}/seats")]
        public async Task<IActionResult> UpdateSeats(int hallId, [FromBody] List<SeatDto> dtos)
        {
            var hall = await _context.CinemaHalls.FindAsync(hallId);
            if (hall == null)
            {
                return NotFound(new { message = "Hall not found" });
            }

            if (dtos == null || dtos.Count == 0)
            {
                return BadRequest(new { message = "Seats are required" });
            }

            var normalizedSeats = dtos.Select(dto => new
            {
                SeatTypeId = dto.SeatTypeId,
                RowLabel = dto.RowLabel.Trim().ToUpperInvariant(),
                ColNumber = dto.ColNumber,
                SeatCode = string.IsNullOrWhiteSpace(dto.SeatCode)
                    ? $"{dto.RowLabel.Trim().ToUpperInvariant()}{dto.ColNumber}"
                    : dto.SeatCode.Trim().ToUpperInvariant(),
                IsActive = dto.IsActive ?? true
            }).ToList();

            if (normalizedSeats.Any(x => string.IsNullOrWhiteSpace(x.RowLabel) || x.ColNumber <= 0))
            {
                return BadRequest(new { message = "Seat row and column are required" });
            }

            var duplicateCode = normalizedSeats
                .GroupBy(x => x.SeatCode, StringComparer.OrdinalIgnoreCase)
                .FirstOrDefault(group => group.Count() > 1)?.Key;
            if (!string.IsNullOrWhiteSpace(duplicateCode))
            {
                return BadRequest(new { message = $"Duplicate seat code: {duplicateCode}" });
            }

            var requestedSeatTypeIds = normalizedSeats.Select(x => x.SeatTypeId).Distinct().ToList();
            var validSeatTypeCount = await _context.CinemaSeatTypes.CountAsync(x => requestedSeatTypeIds.Contains(x.SeatTypeId));
            if (validSeatTypeCount != requestedSeatTypeIds.Count)
            {
                return BadRequest(new { message = "Invalid seat type" });
            }

            var existingSeats = await _context.CinemaSeats.Where(x => x.HallId == hallId).ToListAsync();
            var existingByCode = existingSeats.ToDictionary(x => x.SeatCode, StringComparer.OrdinalIgnoreCase);
            var requestedCodes = normalizedSeats.Select(x => x.SeatCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var existingSeatIds = existingSeats.Select(x => x.SeatId).ToList();
            var usedSeatIds = await _context.CinemaTickets
                .Where(x => existingSeatIds.Contains(x.SeatId))
                .Select(x => x.SeatId)
                .ToListAsync();

            var seatsToRemove = existingSeats.Where(x => !requestedCodes.Contains(x.SeatCode)).ToList();
            if (seatsToRemove.Any(x => usedSeatIds.Contains(x.SeatId)))
            {
                return BadRequest(new { message = "Cannot remove seats that already have tickets" });
            }

            _context.CinemaSeats.RemoveRange(seatsToRemove);

            foreach (var dto in normalizedSeats)
            {
                if (existingByCode.TryGetValue(dto.SeatCode, out var seat))
                {
                    seat.SeatTypeId = dto.SeatTypeId;
                    seat.RowLabel = dto.RowLabel;
                    seat.ColNumber = dto.ColNumber;
                    seat.IsActive = dto.IsActive;
                }
                else
                {
                    _context.CinemaSeats.Add(new CinemaSeat
                    {
                        HallId = hallId,
                        SeatTypeId = dto.SeatTypeId,
                        RowLabel = dto.RowLabel,
                        ColNumber = dto.ColNumber,
                        SeatCode = dto.SeatCode,
                        IsActive = dto.IsActive
                    });
                }
            }

            hall.TotalSeats = (short)normalizedSeats.Count;
            await _context.SaveChangesAsync();

            return Ok(await _context.CinemaSeats.AsNoTracking()
                .Where(x => x.HallId == hallId)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToListAsync());
        }

        private async Task CreateSeatsForHall(Hall hall)
        {
            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .Select(x => x.SeatTypeId)
                .ToListAsync();

            if (seatTypes.Count == 0 || await _context.CinemaSeats.AnyAsync(x => x.HallId == hall.HallId))
            {
                return;
            }

            var standardSeatTypeId = seatTypes[0];
            var vipSeatTypeId = seatTypes.Count > 1 ? seatTypes[1] : standardSeatTypeId;
            var coupleSeatTypeId = seatTypes.Count > 2 ? seatTypes[2] : vipSeatTypeId;
            var seats = new List<CinemaSeat>();

            for (var row = 1; row <= hall.TotalRows; row++)
            {
                var rowLabel = ToRowLabel(row);
                var seatTypeId = row == hall.TotalRows
                    ? coupleSeatTypeId
                    : row >= hall.TotalRows - 1
                        ? vipSeatTypeId
                        : standardSeatTypeId;

                for (var col = 1; col <= hall.TotalCols; col++)
                {
                    seats.Add(new CinemaSeat
                    {
                        HallId = hall.HallId,
                        SeatTypeId = seatTypeId,
                        RowLabel = rowLabel,
                        ColNumber = (byte)col,
                        SeatCode = $"{rowLabel}{col}",
                        IsActive = true
                    });
                }
            }

            _context.CinemaSeats.AddRange(seats);
            await _context.SaveChangesAsync();
        }

        private static string ToRowLabel(int rowNumber)
        {
            var label = "";
            while (rowNumber > 0)
            {
                rowNumber--;
                label = (char)('A' + rowNumber % 26) + label;
                rowNumber /= 26;
            }

            return label;
        }
    }

    public class CinemaDto
    {
        public int ChainId { get; set; }
        public string CinemaName { get; set; } = "";
        public string Address { get; set; } = "";
        public string City { get; set; } = "";
        public string? District { get; set; }
        public string? Phone { get; set; }
        public string? Email { get; set; }
        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }
        public string? MapUrl { get; set; }
        public string? ImageUrl { get; set; }
        public bool? IsActive { get; set; }
    }

    public class HallDto
    {
        public byte HallTypeId { get; set; }
        public string HallName { get; set; } = "";
        public byte TotalRows { get; set; }
        public byte TotalCols { get; set; }
        public short TotalSeats { get; set; }
        public string? Status { get; set; }
    }

    public class SeatDto
    {
        public byte SeatTypeId { get; set; }
        public string RowLabel { get; set; } = "";
        public byte ColNumber { get; set; }
        public string SeatCode { get; set; } = "";
        public bool? IsActive { get; set; }
    }
}
