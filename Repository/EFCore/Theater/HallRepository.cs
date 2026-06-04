using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class HallRepository(SqlServerDbContext context) : IHallRepository
    {
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "active",
            "maintenance",
            "inactive"
        };

        public async Task<List<HallDTO.HallTypeResponse>> GetHallTypesAsync()
        {
            return await context.HallTypes
                .AsNoTracking()
                .OrderBy(x => x.HallTypeId)
                .Select(x => new HallDTO.HallTypeResponse
                {
                    HallTypeId = x.HallTypeId,
                    TypeName = x.TypeName,
                    Description = x.Description,
                    SurchargePct = x.SurchargePct
                })
                .ToListAsync();
        }

        public async Task<List<HallDTO.SeatTypeResponse>> GetSeatTypesAsync()
        {
            return await context.SeatTypes
                .AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .Select(x => new HallDTO.SeatTypeResponse
                {
                    SeatTypeId = x.SeatTypeId,
                    TypeName = x.TypeName,
                    Description = x.Description,
                    PriceModifier = x.PriceModifier
                })
                .ToListAsync();
        }

        public async Task<List<HallDTO.HallResponse>> GetAllHallsAsync(string? keyword, int? cinemaId, string? status)
        {
            var query = context.Halls.AsNoTracking();

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.CinemaId == cinemaId.Value);
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var trimmedStatus = status.Trim();
                query = query.Where(x => x.Status == trimmedStatus);
            }

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var trimmedKeyword = keyword.Trim();
                var cinemaIds = context.Cinemas
                    .AsNoTracking()
                    .Where(x =>
                        x.CinemaName.Contains(trimmedKeyword) ||
                        x.Address.Contains(trimmedKeyword) ||
                        x.City.Contains(trimmedKeyword))
                    .Select(x => x.CinemaId);

                query = query.Where(x => x.HallName.Contains(trimmedKeyword) || cinemaIds.Contains(x.CinemaId));
            }

            var halls = await query
                .OrderBy(x => x.CinemaId)
                .ThenBy(x => x.HallName)
                .ToListAsync();

            return await ToResponsesAsync(halls);
        }

        public async Task<HallDTO.HallResponse> GetHallByIdAsync(int hallId)
        {
            var hall = await context.Halls.AsNoTracking().FirstOrDefaultAsync(x => x.HallId == hallId);
            if (hall == null)
            {
                throw new ArgumentException("Hall not found");
            }

            return (await ToResponsesAsync([hall])).First();
        }

        public async Task<List<HallDTO.SeatResponse>> GetSeatsAsync(int hallId)
        {
            if (!await context.Halls.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Hall not found");
            }

            var seatTypes = await context.SeatTypes
                .AsNoTracking()
                .ToDictionaryAsync(x => x.SeatTypeId, x => x.TypeName);

            return await context.Seats
                .AsNoTracking()
                .Where(x => x.HallId == hallId)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .Select(x => new HallDTO.SeatResponse
                {
                    SeatId = x.SeatId,
                    HallId = x.HallId,
                    SeatTypeId = x.SeatTypeId,
                    SeatTypeName = seatTypes.GetValueOrDefault(x.SeatTypeId),
                    RowLabel = x.RowLabel,
                    ColNumber = x.ColNumber,
                    SeatCode = x.SeatCode,
                    IsActive = x.IsActive
                })
                .ToListAsync();
        }

        public async Task<List<HallDTO.SeatMapResponse>> GetSeatMapAsync(int hallId, int? showtimeId)
        {
            if (!await context.Halls.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Hall not found");
            }

            if (showtimeId.HasValue &&
                !await context.ShowTimes.AnyAsync(x => x.ShowtimeId == showtimeId.Value && x.HallId == hallId))
            {
                throw new ArgumentException("Selected showtime does not belong to this hall");
            }

            var seatTypes = await context.SeatTypes
                .AsNoTracking()
                .ToDictionaryAsync(x => x.SeatTypeId, x => x.TypeName);

            var seats = await context.Seats
                .AsNoTracking()
                .Where(x => x.HallId == hallId)
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToListAsync();

            var ticketStates = new Dictionary<int, (string SeatStatus, int BookingId)>();
            var lockedSeatIds = new HashSet<int>();

            if (showtimeId.HasValue)
            {
                var bookingRows = await context.Tickets
                    .AsNoTracking()
                    .Join(
                        context.Bookings.AsNoTracking().Where(x =>
                            x.ShowtimeId == showtimeId.Value &&
                            x.Status != "cancelled"),
                        ticket => ticket.BookingId,
                        booking => booking.BookingId,
                        (ticket, booking) => new
                        {
                            ticket.SeatId,
                            booking.BookingId,
                            booking.Status
                        })
                    .ToListAsync();

                ticketStates = bookingRows
                    .GroupBy(x => x.SeatId)
                    .ToDictionary(
                        x => x.Key,
                        x =>
                        {
                            var booking = x.First();
                            var status = IsSoldBookingStatus(booking.Status) ? "sold" : "held";
                            return (status, booking.BookingId);
                        });

                lockedSeatIds = await context.SeatLocks
                    .AsNoTracking()
                    .Where(x => x.ShowtimeId == showtimeId.Value && x.ExpiresAt > DateTime.UtcNow)
                    .Select(x => x.SeatId)
                    .ToHashSetAsync();
            }

            return seats.Select(seat =>
            {
                var seatStatus = seat.IsActive ? "empty" : "inactive";
                int? bookingId = null;

                if (ticketStates.TryGetValue(seat.SeatId, out var ticketState))
                {
                    seatStatus = ticketState.SeatStatus;
                    bookingId = ticketState.BookingId;
                }
                else if (lockedSeatIds.Contains(seat.SeatId))
                {
                    seatStatus = "held";
                }

                return new HallDTO.SeatMapResponse
                {
                    SeatId = seat.SeatId,
                    HallId = seat.HallId,
                    SeatTypeId = seat.SeatTypeId,
                    SeatTypeName = seatTypes.GetValueOrDefault(seat.SeatTypeId),
                    RowLabel = seat.RowLabel,
                    ColNumber = seat.ColNumber,
                    SeatCode = seat.SeatCode,
                    IsActive = seat.IsActive,
                    SeatStatus = seatStatus,
                    BookingId = bookingId
                };
            }).ToList();
        }

        public async Task<HallDTO.SeatResponse> UpdateSeatAsync(int seatId, HallDTO.SeatUpdateRequest seatRequest)
        {
            var seat = await context.Seats.FirstOrDefaultAsync(x => x.SeatId == seatId);
            if (seat == null)
            {
                throw new ArgumentException("Seat not found");
            }

            if (seatRequest.SeatTypeId == 0 || !await context.SeatTypes.AnyAsync(x => x.SeatTypeId == seatRequest.SeatTypeId))
            {
                throw new ArgumentException("Selected seat type does not exist");
            }

            seat.SeatTypeId = seatRequest.SeatTypeId;
            seat.IsActive = seatRequest.IsActive;
            seat.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();

            var seatTypeName = await context.SeatTypes
                .AsNoTracking()
                .Where(x => x.SeatTypeId == seat.SeatTypeId)
                .Select(x => x.TypeName)
                .FirstOrDefaultAsync();

            return new HallDTO.SeatResponse
            {
                SeatId = seat.SeatId,
                HallId = seat.HallId,
                SeatTypeId = seat.SeatTypeId,
                SeatTypeName = seatTypeName,
                RowLabel = seat.RowLabel,
                ColNumber = seat.ColNumber,
                SeatCode = seat.SeatCode,
                IsActive = seat.IsActive
            };
        }

        public async Task<List<HallDTO.SeatResponse>> UpdateSeatsAsync(int hallId, HallDTO.SeatBulkUpdateRequest seatRequest)
        {
            if (!await context.Halls.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Hall not found");
            }

            var seatIds = seatRequest.SeatIds.Distinct().ToList();
            if (seatIds.Count == 0)
            {
                throw new ArgumentException("Please select at least one seat");
            }

            if (!seatRequest.SeatTypeId.HasValue && !seatRequest.IsActive.HasValue)
            {
                throw new ArgumentException("Please choose a seat type or status to update");
            }

            if (seatRequest.SeatTypeId.HasValue &&
                (seatRequest.SeatTypeId.Value == 0 ||
                 !await context.SeatTypes.AnyAsync(x => x.SeatTypeId == seatRequest.SeatTypeId.Value)))
            {
                throw new ArgumentException("Selected seat type does not exist");
            }

            var seats = await context.Seats
                .Where(x => x.HallId == hallId && seatIds.Contains(x.SeatId))
                .ToListAsync();

            if (seats.Count != seatIds.Count)
            {
                throw new ArgumentException("Some selected seats were not found in this hall");
            }

            var now = DateTime.UtcNow;
            foreach (var seat in seats)
            {
                if (seatRequest.SeatTypeId.HasValue)
                {
                    seat.SeatTypeId = seatRequest.SeatTypeId.Value;
                }

                if (seatRequest.IsActive.HasValue)
                {
                    seat.IsActive = seatRequest.IsActive.Value;
                }

                seat.UpdatedAt = now;
            }

            await context.SaveChangesAsync();

            var seatTypeIds = seats.Select(x => x.SeatTypeId).Distinct().ToList();
            var seatTypes = await context.SeatTypes
                .AsNoTracking()
                .Where(x => seatTypeIds.Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId, x => x.TypeName);

            return seats
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .Select(seat => new HallDTO.SeatResponse
                {
                    SeatId = seat.SeatId,
                    HallId = seat.HallId,
                    SeatTypeId = seat.SeatTypeId,
                    SeatTypeName = seatTypes.GetValueOrDefault(seat.SeatTypeId),
                    RowLabel = seat.RowLabel,
                    ColNumber = seat.ColNumber,
                    SeatCode = seat.SeatCode,
                    IsActive = seat.IsActive
                })
                .ToList();
        }

        public async Task CreateAsync(HallDTO.HallRequest hallRequest)
        {
            var validationError = await ValidateHallDto(hallRequest);
            if (await context.Halls.AnyAsync(x => x.CinemaId == hallRequest.CinemaId && x.HallName == hallRequest.HallName.Trim()))
            {
                throw new ArgumentException("Hall name already exists in the selected cinema");
            }

            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var now = DateTime.UtcNow;
            var hall = new Hall
            {
                CinemaId = hallRequest.CinemaId,
                HallTypeId = hallRequest.HallTypeId,
                HallName = hallRequest.HallName.Trim(),
                TotalRows = hallRequest.TotalRows,
                TotalCols = hallRequest.TotalCols,
                TotalSeats = checked((short)(hallRequest.TotalRows * hallRequest.TotalCols)),
                Status = NormalizeStatus(hallRequest.Status),
                CreatedAt = now,
                UpdatedAt = now
            };

            context.Halls.Add(hall);
            await context.SaveChangesAsync();

            context.Seats.AddRange(BuildSeats(hall, hallRequest.DefaultSeatTypeId, now));
            await context.SaveChangesAsync();
        }

        public async Task UpdateAsync(int hallId, HallDTO.HallRequest hallRequest)
        {
            var validationError = await ValidateHallDto(hallRequest);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var hall = await context.Halls.FirstOrDefaultAsync(x => x.HallId == hallId);
            if (hall == null)
            {
                throw new ArgumentException("Hall not found");
            }

            if (await context.Halls.AnyAsync(x => 
                x.HallId != hallId &&
                x.CinemaId == hallRequest.CinemaId &&
                x.HallName == hallRequest.HallName.Trim()))
            {
                throw new ArgumentException ("Hall name already exists in the selected cinema");
            }

            var layoutChanged = hall.TotalRows != hallRequest.TotalRows || hall.TotalCols != hallRequest.TotalCols;
            if (layoutChanged && await context.ShowTimes.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Cannot change hall layout because it already has showtimes");
            }

            hall.CinemaId = hallRequest.CinemaId;
            hall.HallTypeId = hallRequest.HallTypeId;
            hall.HallName = hallRequest.HallName.Trim();
            hall.TotalRows = hallRequest.TotalRows;
            hall.TotalCols = hallRequest.TotalCols;
            hall.TotalSeats = checked((short)(hallRequest.TotalRows * hallRequest.TotalCols));
            hall.Status = NormalizeStatus(hallRequest.Status);
            hall.UpdatedAt = DateTime.UtcNow;

            if (layoutChanged)
            {
                var oldSeats = await context.Seats.Where(x => x.HallId == hallId).ToListAsync();
                context.Seats.RemoveRange(oldSeats);
                context.Seats.AddRange(BuildSeats(hall, hallRequest.DefaultSeatTypeId, DateTime.UtcNow));
            }

            await context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int hallId)
        {
            var hall = await context.Halls.FirstOrDefaultAsync(x => x.HallId == hallId);
            if (hall == null)
            {
                throw new ArgumentException("Hall not found");
            }

            if (await context.ShowTimes.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Cannot delete hall because it has showtimes");
            }

            var seats = await context.Seats.Where(x => x.HallId == hallId).ToListAsync();
            context.Seats.RemoveRange(seats);
            context.Halls.Remove(hall);
            await context.SaveChangesAsync();
        }

        private async Task<string?> ValidateHallDto(HallDTO.HallRequest dto)
        {
            if (dto.CinemaId <= 0 || !await context.Cinemas.AnyAsync(x => x.CinemaId == dto.CinemaId))
            {
                return "Selected cinema does not exist";
            }

            if (dto.HallTypeId == 0 || !await context.HallTypes.AnyAsync(x => x.HallTypeId == dto.HallTypeId))
            {
                return "Selected hall type does not exist";
            }

            if (dto.DefaultSeatTypeId == 0 || !await context.SeatTypes.AnyAsync(x => x.SeatTypeId == dto.DefaultSeatTypeId))
            {
                return "Selected seat type does not exist";
            }

            if (string.IsNullOrWhiteSpace(dto.HallName))
            {
                return "Hall name is required";
            }

            if (dto.TotalRows == 0 || dto.TotalRows > 26)
            {
                return "Total rows must be between 1 and 26";
            }

            if (dto.TotalCols == 0 || dto.TotalCols > 50)
            {
                return "Total columns must be between 1 and 50";
            }

            if (!AllowedStatuses.Contains(NormalizeStatus(dto.Status)))
            {
                return "Hall status is invalid";
            }

            return null;
        }

        private async Task<List<HallDTO.HallResponse>> ToResponsesAsync(List<Hall> halls)
        {
            if (halls.Count == 0)
            {
                return [];
            }

            var cinemaIds = halls.Select(x => x.CinemaId).Distinct().ToList();
            var hallTypeIds = halls.Select(x => x.HallTypeId).Distinct().ToList();
            var hallIds = halls.Select(x => x.HallId).ToList();

            var cinemas = await context.Cinemas
                .AsNoTracking()
                .Where(x => cinemaIds.Contains(x.CinemaId))
                .ToDictionaryAsync(x => x.CinemaId);

            var hallTypes = await context.HallTypes
                .AsNoTracking()
                .Where(x => hallTypeIds.Contains(x.HallTypeId))
                .ToDictionaryAsync(x => x.HallTypeId);

            var activeSeatCounts = await context.Seats
                .AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
                .GroupBy(x => x.HallId)
                .Select(x => new { HallId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.HallId, x => x.Count);

            return halls.Select(hall =>
            {
                cinemas.TryGetValue(hall.CinemaId, out var cinema);
                hallTypes.TryGetValue(hall.HallTypeId, out var hallType);

                return new HallDTO.HallResponse
                {
                    HallId = hall.HallId,
                    CinemaId = hall.CinemaId,
                    CinemaName = cinema?.CinemaName,
                    CinemaCity = cinema?.City,
                    HallTypeId = hall.HallTypeId,
                    HallTypeName = hallType?.TypeName,
                    HallName = hall.HallName,
                    Name = hall.HallName,
                    TotalRows = hall.TotalRows,
                    TotalCols = hall.TotalCols,
                    TotalSeats = hall.TotalSeats,
                    ActiveSeatCount = activeSeatCounts.GetValueOrDefault(hall.HallId),
                    Status = hall.Status
                };
            }).ToList();
        }

        private static List<Seat> BuildSeats(Hall hall, byte seatTypeId, DateTime now)
        {
            var seats = new List<Seat>();
            for (var row = 1; row <= hall.TotalRows; row++)
            {
                var rowLabel = ((char)('A' + row - 1)).ToString();
                for (var col = 1; col <= hall.TotalCols; col++)
                {
                    seats.Add(new Seat
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

            return seats;
        }

        private static string NormalizeStatus(string? status)
        {
            var trimmed = status?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? "active" : trimmed;
        }

        private static bool IsSoldBookingStatus(string? status)
        {
            return string.Equals(status, "confirmed", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(status, "paid", StringComparison.OrdinalIgnoreCase) ||
                   string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase);
        }
    }
}
