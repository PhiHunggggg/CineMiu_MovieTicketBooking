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
        private static readonly HashSet<string> AllowedHallStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active",
            "maintenance",
            "inactive"
        };

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

            var hallIds = halls.Select(x => x.HallId).ToList();
            var hallTypeIds = halls.Select(x => x.HallTypeId).Distinct().ToList();
            var hallTypes = await _context.CinemaHallTypes.AsNoTracking()
                .Where(x => hallTypeIds.Contains(x.HallTypeId))
                .ToDictionaryAsync(x => x.HallTypeId, x => x.TypeName);
            var activeSeatCounts = await _context.CinemaSeats.AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
                .GroupBy(x => x.HallId)
                .Select(group => new { HallId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.HallId, x => x.Count);
            var now = DateTime.Now;
            var upcomingShowtimeCounts = await _context.CinemaShowtimes.AsNoTracking()
                .Where(x =>
                    hallIds.Contains(x.HallId) &&
                    x.EndTime > now &&
                    x.Status != "cancelled" &&
                    x.Status != "completed")
                .GroupBy(x => x.HallId)
                .Select(group => new { HallId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(x => x.HallId, x => x.Count);

            return Ok(halls.Select(hall => new
            {
                hall.HallId,
                hall.CinemaId,
                hall.HallTypeId,
                hallTypeName = hallTypes.GetValueOrDefault(hall.HallTypeId),
                hall.HallName,
                name = hall.HallName,
                hall.TotalRows,
                hall.TotalCols,
                hall.TotalSeats,
                activeSeatCount = activeSeatCounts.GetValueOrDefault(hall.HallId),
                upcomingShowtimeCount = upcomingShowtimeCounts.GetValueOrDefault(hall.HallId),
                hall.Status,
                hall.CreatedAt,
                hall.UpdatedAt
            }));
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

            var hallName = dto.HallName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(hallName))
            {
                return BadRequest(new { message = "Hall name is required" });
            }

            if (dto.TotalRows is < 1 or > 26 || dto.TotalCols is < 1 or > 50)
            {
                return BadRequest(new { message = "Hall layout must be between 1-26 rows and 1-50 seats per row" });
            }

            if (!await _context.CinemaHallTypes.AnyAsync(x => x.HallTypeId == dto.HallTypeId))
            {
                return BadRequest(new { message = "Hall type not found" });
            }

            var status = NormalizeHallStatus(dto.Status);
            if (!AllowedHallStatuses.Contains(status))
            {
                return BadRequest(new { message = "Hall status is invalid" });
            }

            if (await _context.CinemaHalls.AnyAsync(x => x.CinemaId == cinemaId && x.HallName == hallName))
            {
                return Conflict(new { message = "Hall name already exists in the selected cinema" });
            }

            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .Select(x => x.SeatTypeId)
                .ToListAsync();
            if (seatTypes.Count == 0)
            {
                return BadRequest(new { message = "At least one seat type is required before creating a hall" });
            }

            var now = DateTime.UtcNow;
            var hall = new CinemaHall
            {
                CinemaId = cinemaId,
                HallTypeId = dto.HallTypeId,
                HallName = hallName,
                TotalRows = dto.TotalRows,
                TotalCols = dto.TotalCols,
                TotalSeats = checked((short)(dto.TotalRows * dto.TotalCols)),
                Status = status,
                CreatedAt = now,
                UpdatedAt = now
            };

            var strategy = _context.Database.CreateExecutionStrategy();
            try
            {
                await strategy.ExecuteAsync(async () =>
                {
                    await using var transaction = await _context.Database.BeginTransactionAsync();
                    _context.CinemaHalls.Add(hall);
                    await _context.SaveChangesAsync();
                    await CreateSeatsForHall(hall, seatTypes, now);
                    await transaction.CommitAsync();
                });
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Could not create hall because its data conflicts with existing records" });
            }

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

            var hallName = dto.HallName?.Trim() ?? "";
            if (string.IsNullOrWhiteSpace(hallName))
            {
                return BadRequest(new { message = "Hall name is required" });
            }

            if (!await _context.CinemaHallTypes.AnyAsync(x => x.HallTypeId == dto.HallTypeId))
            {
                return BadRequest(new { message = "Hall type not found" });
            }

            if (dto.TotalRows is < 1 or > 26 || dto.TotalCols is < 1 or > 50)
            {
                return BadRequest(new { message = "Hall layout must be between 1-26 rows and 1-50 seats per row" });
            }

            if (hall.TotalRows != dto.TotalRows || hall.TotalCols != dto.TotalCols)
            {
                return Conflict(new { message = "Use the seat layout editor to change an existing hall layout" });
            }

            if (await _context.CinemaHalls.AnyAsync(x =>
                    x.HallId != hallId &&
                    x.CinemaId == hall.CinemaId &&
                    x.HallName == hallName))
            {
                return Conflict(new { message = "Hall name already exists in the selected cinema" });
            }

            var status = NormalizeHallStatus(dto.Status ?? hall.Status);
            if (!AllowedHallStatuses.Contains(status))
            {
                return BadRequest(new { message = "Hall status is invalid" });
            }

            if (!string.Equals(hall.Status, status, StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(status, "active", StringComparison.OrdinalIgnoreCase))
            {
                var upcomingShowtimeCount = await GetUpcomingShowtimeCount(hallId);
                if (upcomingShowtimeCount > 0)
                {
                    return Conflict(new
                    {
                        message = "Cancel or move upcoming showtimes before taking this hall out of service",
                        upcomingShowtimeCount
                    });
                }
            }

            hall.HallTypeId = dto.HallTypeId;
            hall.HallName = hallName;
            hall.Status = status;
            hall.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(hall);
        }

        [HttpPatch("halls/{hallId:int}/status")]
        public async Task<IActionResult> UpdateHallStatus(int hallId, [FromBody] HallStatusDto dto)
        {
            var hall = await _context.CinemaHalls.FindAsync(hallId);
            if (hall == null)
            {
                return NotFound(new { message = "Hall not found" });
            }

            var status = NormalizeHallStatus(dto.Status);
            if (!AllowedHallStatuses.Contains(status))
            {
                return BadRequest(new { message = "Hall status is invalid" });
            }

            if (string.Equals(hall.Status, status, StringComparison.OrdinalIgnoreCase))
            {
                return Ok(new { hall.HallId, hall.Status, upcomingShowtimeCount = await GetUpcomingShowtimeCount(hallId) });
            }

            var upcomingShowtimeCount = await GetUpcomingShowtimeCount(hallId);
            if (!string.Equals(status, "active", StringComparison.OrdinalIgnoreCase) &&
                upcomingShowtimeCount > 0)
            {
                return Conflict(new
                {
                    message = "Cancel or move upcoming showtimes before taking this hall out of service",
                    upcomingShowtimeCount
                });
            }

            hall.Status = status;
            hall.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(new { hall.HallId, hall.Status, upcomingShowtimeCount });
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

        private async Task CreateSeatsForHall(Hall hall, IReadOnlyList<byte> seatTypes, DateTime now)
        {
            if (await _context.CinemaSeats.AnyAsync(x => x.HallId == hall.HallId))
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
                        IsActive = true,
                        CreatedAt = now,
                        UpdatedAt = now
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

        private async Task<int> GetUpcomingShowtimeCount(int hallId)
        {
            var now = DateTime.Now;
            return await _context.CinemaShowtimes.CountAsync(x =>
                x.HallId == hallId &&
                x.EndTime > now &&
                x.Status != "cancelled" &&
                x.Status != "completed");
        }

        private static string NormalizeHallStatus(string? status)
        {
            var normalized = status?.Trim().ToLowerInvariant();
            return string.IsNullOrWhiteSpace(normalized) ? "active" : normalized;
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

    public class HallStatusDto
    {
        public string Status { get; set; } = "";
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
