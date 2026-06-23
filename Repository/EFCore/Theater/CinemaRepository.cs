using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class CinemaRepository(SqlServerDbContext context) : ICinemaRepository
    {
        public Task<List<CinemaDTO.ChainResponse>> GetChainsAsync() => context.Chains
            .AsNoTracking()
            .OrderBy(x => x.ChainName)
            .Select(x => new CinemaDTO.ChainResponse { ChainId = x.ChainId, ChainName = x.ChainName })
            .ToListAsync();

        public async Task<List<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive)
        {
            var query = context.Cinemas.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var value = keyword.Trim();
                query = query.Where(x => x.CinemaName.Contains(value) || x.Address.Contains(value) ||
                    x.City.Contains(value) || (x.District != null && x.District.Contains(value)));
            }

            if (!string.IsNullOrWhiteSpace(city))
            {
                var value = city.Trim();
                query = query.Where(x => x.City.Contains(value));
            }

            if (isActive.HasValue)
            {
                query = query.Where(x => x.IsActive == isActive.Value);
            }

            return await MapCinemasAsync(await query.OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.City).ThenBy(x => x.CinemaName).ToListAsync());
        }

        public async Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly)
        {
            var query = context.Cinemas.AsNoTracking();
            if (activeOnly)
            {
                query = query.Where(x => x.IsActive);
            }

            if (!string.IsNullOrWhiteSpace(city))
            {
                var value = city.Trim();
                query = query.Where(x => x.City == value);
            }

            return await MapCinemasAsync(await query.OrderBy(x => x.City).ThenBy(x => x.CinemaName).ToListAsync());
        }

        public Task<List<CinemaDTO.CinemaByMovieResponse>> GetByMovieAsync(
            int movieId, DateTime rangeStart, DateTime rangeEndExclusive) =>
            (from showtime in context.ShowTimes.AsNoTracking()
             join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
             join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
             where showtime.MovieId == movieId && showtime.StartTime >= rangeStart &&
                   showtime.StartTime < rangeEndExclusive && showtime.Status != "cancelled" && cinema.IsActive
             group showtime by new
             {
                 cinema.CinemaId, cinema.ChainId, cinema.CinemaName, cinema.Address, cinema.City,
                 cinema.District, cinema.Phone, cinema.Email, cinema.Latitude, cinema.Longitude,
                 cinema.MapUrl, cinema.ImageUrl, cinema.IsActive
             }
             into cinemaGroup
             orderby cinemaGroup.Key.City, cinemaGroup.Key.CinemaName
             select new CinemaDTO.CinemaByMovieResponse
             {
                 CinemaId = cinemaGroup.Key.CinemaId,
                 ChainId = cinemaGroup.Key.ChainId,
                 CinemaName = cinemaGroup.Key.CinemaName,
                 Address = cinemaGroup.Key.Address,
                 City = cinemaGroup.Key.City,
                 Ward = cinemaGroup.Key.District,
                 Phone = cinemaGroup.Key.Phone,
                 Email = cinemaGroup.Key.Email,
                 Latitude = cinemaGroup.Key.Latitude,
                 Longitude = cinemaGroup.Key.Longitude,
                 MapUrl = cinemaGroup.Key.MapUrl,
                 ImageUrl = cinemaGroup.Key.ImageUrl,
                 IsActive = cinemaGroup.Key.IsActive,
                 ShowtimeCount = cinemaGroup.Count()
             }).ToListAsync();

        public async Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId)
        {
            var cinema = await context.Cinemas.AsNoTracking().FirstOrDefaultAsync(x => x.CinemaId == cinemaId)
                ?? throw new KeyNotFoundException("Cinema not found");
            return (await MapCinemasAsync([cinema])).Single();
        }

        public async Task<CinemaDTO.CinemaDetailResponse> GetDetailAsync(int cinemaId) => new()
        {
            Cinema = await GetCinemaByIdAsync(cinemaId),
            Halls = await GetHallsInternalAsync(cinemaId)
        };

        public async Task<List<CinemaDTO.HallResponse>> GetHallsAsync(int cinemaId)
        {
            if (!await context.Cinemas.AsNoTracking().AnyAsync(x => x.CinemaId == cinemaId))
            {
                throw new KeyNotFoundException("Cinema not found");
            }

            return await GetHallsInternalAsync(cinemaId);
        }

        public async Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest request)
        {
            await ValidateCinemaAsync(request);
            var now = DateTime.UtcNow;
            var cinema = new Cinema
            {
                ChainId = request.ChainId,
                CinemaName = request.CinemaName.Trim(),
                Address = request.Address.Trim(),
                City = request.City.Trim(),
                District = Normalize(request.Ward),
                Phone = Normalize(request.Phone),
                Email = Normalize(request.Email),
                Latitude = request.Latitude,
                Longitude = request.Longitude,
                MapUrl = Normalize(request.MapUrl),
                ImageUrl = Normalize(request.ImageUrl),
                IsActive = request.IsActive ?? true,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Cinemas.Add(cinema);
            await context.SaveChangesAsync();
            return await GetCinemaByIdAsync(cinema.CinemaId);
        }

        public async Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest request)
        {
            await ValidateCinemaAsync(request);
            var cinema = await context.Cinemas.FirstOrDefaultAsync(x => x.CinemaId == cinemaId)
                ?? throw new KeyNotFoundException("Cinema not found");
            cinema.ChainId = request.ChainId;
            cinema.CinemaName = request.CinemaName.Trim();
            cinema.Address = request.Address.Trim();
            cinema.City = request.City.Trim();
            cinema.District = Normalize(request.Ward);
            cinema.Phone = Normalize(request.Phone);
            cinema.Email = Normalize(request.Email);
            cinema.Latitude = request.Latitude;
            cinema.Longitude = request.Longitude;
            cinema.MapUrl = Normalize(request.MapUrl);
            cinema.ImageUrl = Normalize(request.ImageUrl);
            cinema.IsActive = request.IsActive ?? cinema.IsActive;
            cinema.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
            return await GetCinemaByIdAsync(cinemaId);
        }

        public async Task DeleteAsync(int cinemaId)
        {
            var cinema = await context.Cinemas.FirstOrDefaultAsync(x => x.CinemaId == cinemaId)
                ?? throw new KeyNotFoundException("Cinema not found");
            cinema.IsActive = false;
            cinema.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
        }

        public async Task<CinemaDTO.HallResponse> CreateHallAsync(int cinemaId, CinemaDTO.HallRequest request)
        {
            if (!await context.Cinemas.AnyAsync(x => x.CinemaId == cinemaId))
            {
                throw new KeyNotFoundException("Cinema not found");
            }

            await ValidateHallAsync(request);
            var now = DateTime.UtcNow;
            var hall = new Hall
            {
                CinemaId = cinemaId,
                HallTypeId = request.HallTypeId,
                HallName = request.HallName.Trim(),
                TotalRows = request.TotalRows,
                TotalCols = request.TotalCols,
                TotalSeats = request.TotalSeats,
                Status = Normalize(request.Status) ?? "active",
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Halls.Add(hall);
            await context.SaveChangesAsync();
            await CreateSeatsForHallAsync(hall);
            return ToHallResponse(hall);
        }

        public async Task<CinemaDTO.HallResponse> UpdateHallAsync(int hallId, CinemaDTO.HallRequest request)
        {
            var hall = await context.Halls.FirstOrDefaultAsync(x => x.HallId == hallId)
                ?? throw new KeyNotFoundException("Hall not found");
            if (!await context.Cinemas.AnyAsync(x => x.CinemaId == hall.CinemaId))
            {
                throw new KeyNotFoundException("Cinema not found");
            }

            await ValidateHallAsync(request);
            hall.HallTypeId = request.HallTypeId;
            hall.HallName = request.HallName.Trim();
            hall.TotalRows = request.TotalRows;
            hall.TotalCols = request.TotalCols;
            hall.TotalSeats = request.TotalSeats;
            hall.Status = Normalize(request.Status) ?? hall.Status;
            hall.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
            return ToHallResponse(hall);
        }

        public async Task DeleteHallAsync(int hallId)
        {
            var hall = await context.Halls.FirstOrDefaultAsync(x => x.HallId == hallId)
                ?? throw new KeyNotFoundException("Hall not found");
            if (await context.ShowTimes.AnyAsync(x => x.HallId == hallId))
            {
                throw new ArgumentException("Cannot delete hall because it has showtimes");
            }

            context.Seats.RemoveRange(context.Seats.Where(x => x.HallId == hallId));
            context.Halls.Remove(hall);
            await context.SaveChangesAsync();
        }

        public Task<List<CinemaDTO.SeatResponse>> GetSeatsAsync(int hallId) => context.Seats.AsNoTracking()
            .Where(x => x.HallId == hallId).OrderBy(x => x.RowLabel).ThenBy(x => x.ColNumber)
            .Select(x => new CinemaDTO.SeatResponse
            {
                SeatId = x.SeatId, HallId = x.HallId, SeatTypeId = x.SeatTypeId,
                RowLabel = x.RowLabel, ColNumber = x.ColNumber, SeatCode = x.SeatCode, IsActive = x.IsActive
            }).ToListAsync();

        public async Task<CinemaDTO.SeatResponse> CreateSeatAsync(int hallId, CinemaDTO.SeatRequest request)
        {
            if (!await context.Halls.AnyAsync(x => x.HallId == hallId))
            {
                throw new KeyNotFoundException("Hall not found");
            }

            await ValidateSeatTypesAsync([request.SeatTypeId]);
            var now = DateTime.UtcNow;
            var seat = new Seat
            {
                HallId = hallId,
                SeatTypeId = request.SeatTypeId,
                RowLabel = request.RowLabel,
                ColNumber = request.ColNumber,
                SeatCode = request.SeatCode,
                IsActive = request.IsActive ?? true,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Seats.Add(seat);
            await context.SaveChangesAsync();
            return ToSeatResponse(seat);
        }

        public async Task<List<CinemaDTO.SeatResponse>> ReplaceSeatsAsync(
            int hallId, IReadOnlyCollection<CinemaDTO.SeatRequest> requests)
        {
            var hall = await context.Halls.FirstOrDefaultAsync(x => x.HallId == hallId)
                ?? throw new KeyNotFoundException("Hall not found");
            await ValidateSeatTypesAsync(requests.Select(x => x.SeatTypeId).Distinct().ToList());

            var existingSeats = await context.Seats.Where(x => x.HallId == hallId).ToListAsync();
            var existingByCode = existingSeats.ToDictionary(x => x.SeatCode, StringComparer.OrdinalIgnoreCase);
            var requestedCodes = requests.Select(x => x.SeatCode).ToHashSet(StringComparer.OrdinalIgnoreCase);
            var existingSeatIds = existingSeats.Select(x => x.SeatId).ToList();
            var usedSeatIds = await context.Tickets.Where(x => existingSeatIds.Contains(x.SeatId))
                .Select(x => x.SeatId).ToListAsync();
            var seatsToRemove = existingSeats.Where(x => !requestedCodes.Contains(x.SeatCode)).ToList();
            if (seatsToRemove.Any(x => usedSeatIds.Contains(x.SeatId)))
            {
                throw new ArgumentException("Cannot remove seats that already have tickets");
            }

            context.Seats.RemoveRange(seatsToRemove);
            var now = DateTime.UtcNow;
            foreach (var request in requests)
            {
                if (existingByCode.TryGetValue(request.SeatCode, out var seat))
                {
                    seat.SeatTypeId = request.SeatTypeId;
                    seat.RowLabel = request.RowLabel;
                    seat.ColNumber = request.ColNumber;
                    seat.IsActive = request.IsActive ?? true;
                    seat.UpdatedAt = now;
                }
                else
                {
                    context.Seats.Add(new Seat
                    {
                        HallId = hallId, SeatTypeId = request.SeatTypeId, RowLabel = request.RowLabel,
                        ColNumber = request.ColNumber, SeatCode = request.SeatCode,
                        IsActive = request.IsActive ?? true, CreatedAt = now, UpdatedAt = now
                    });
                }
            }

            hall.TotalSeats = checked((short)requests.Count);
            hall.UpdatedAt = now;
            await context.SaveChangesAsync();
            return await GetSeatsAsync(hallId);
        }

        private async Task ValidateCinemaAsync(CinemaDTO.CinemaRequest request)
        {
            if (request.ChainId <= 0) throw new ArgumentException("ChainId is required");
            if (!await context.Chains.AnyAsync(x => x.ChainId == request.ChainId))
                throw new ArgumentException("Selected chain does not exist");
            if (string.IsNullOrWhiteSpace(request.CinemaName)) throw new ArgumentException("Cinema name is required");
            if (string.IsNullOrWhiteSpace(request.Address)) throw new ArgumentException("Cinema address is required");
            if (string.IsNullOrWhiteSpace(request.City)) throw new ArgumentException("Cinema city is required");
        }

        private async Task ValidateHallAsync(CinemaDTO.HallRequest request)
        {
            if (request.HallTypeId == 0 || !await context.HallTypes.AnyAsync(x => x.HallTypeId == request.HallTypeId))
                throw new ArgumentException("Invalid hall type");
            if (string.IsNullOrWhiteSpace(request.HallName)) throw new ArgumentException("Hall name is required");
            if (request.TotalRows == 0 || request.TotalCols == 0) throw new ArgumentException("Hall rows and columns are required");
        }

        private async Task ValidateSeatTypesAsync(IReadOnlyCollection<byte> ids)
        {
            var validCount = await context.SeatTypes.CountAsync(x => ids.Contains(x.SeatTypeId));
            if (validCount != ids.Count) throw new ArgumentException("Invalid seat type");
        }

        private async Task CreateSeatsForHallAsync(Hall hall)
        {
            var seatTypes = await context.SeatTypes.AsNoTracking().OrderBy(x => x.SeatTypeId).ToListAsync();
            if (seatTypes.Count == 0 || await context.Seats.AnyAsync(x => x.HallId == hall.HallId)) return;

            byte FindType(string name, byte fallback) => seatTypes
                .FirstOrDefault(x => x.TypeName.Contains(name, StringComparison.OrdinalIgnoreCase))?.SeatTypeId ?? fallback;
            var standard = FindType("standard", seatTypes[0].SeatTypeId);
            var vip = FindType("vip", standard);
            var couple = seatTypes.FirstOrDefault(x => x.TypeName.Contains("sweetbox", StringComparison.OrdinalIgnoreCase) ||
                x.TypeName.Contains("couple", StringComparison.OrdinalIgnoreCase))?.SeatTypeId ?? vip;
            var now = DateTime.UtcNow;
            var seats = new List<Seat>();
            for (var row = 1; row <= hall.TotalRows; row++)
            {
                var rowLabel = ToRowLabel(row);
                var seatTypeId = row == hall.TotalRows ? couple : row >= hall.TotalRows - 1 ? vip : standard;
                for (var col = 1; col <= hall.TotalCols; col++)
                {
                    seats.Add(new Seat
                    {
                        HallId = hall.HallId, SeatTypeId = seatTypeId, RowLabel = rowLabel,
                        ColNumber = checked((byte)col), SeatCode = $"{rowLabel}{col}", IsActive = true,
                        CreatedAt = now, UpdatedAt = now
                    });
                }
            }
            context.Seats.AddRange(seats);
            await context.SaveChangesAsync();
        }

        private Task<List<CinemaDTO.HallResponse>> GetHallsInternalAsync(int cinemaId) => context.Halls.AsNoTracking()
            .Where(x => x.CinemaId == cinemaId).OrderBy(x => x.HallName)
            .Select(x => new CinemaDTO.HallResponse
            {
                HallId = x.HallId, CinemaId = x.CinemaId, HallTypeId = x.HallTypeId, HallName = x.HallName,
                TotalRows = x.TotalRows, TotalCols = x.TotalCols, TotalSeats = x.TotalSeats, Status = x.Status
            }).ToListAsync();

        private async Task<List<CinemaDTO.CinemaResponse>> MapCinemasAsync(List<Cinema> cinemas)
        {
            var chainIds = cinemas.Select(x => x.ChainId).Distinct().ToList();
            var chains = await context.Chains.AsNoTracking().Where(x => chainIds.Contains(x.ChainId))
                .ToDictionaryAsync(x => x.ChainId, x => x.ChainName);
            return cinemas.Select(x => new CinemaDTO.CinemaResponse
            {
                CinemaId = x.CinemaId, ChainId = x.ChainId, ChainName = chains.GetValueOrDefault(x.ChainId),
                CinemaName = x.CinemaName, Address = x.Address, City = x.City, Ward = x.District,
                Phone = x.Phone, Email = x.Email, Latitude = x.Latitude, Longitude = x.Longitude,
                MapUrl = x.MapUrl, ImageUrl = x.ImageUrl, IsActive = x.IsActive
            }).ToList();
        }

        private static CinemaDTO.HallResponse ToHallResponse(Hall x) => new()
        {
            HallId = x.HallId, CinemaId = x.CinemaId, HallTypeId = x.HallTypeId, HallName = x.HallName,
            TotalRows = x.TotalRows, TotalCols = x.TotalCols, TotalSeats = x.TotalSeats, Status = x.Status
        };

        private static CinemaDTO.SeatResponse ToSeatResponse(Seat x) => new()
        {
            SeatId = x.SeatId, HallId = x.HallId, SeatTypeId = x.SeatTypeId, RowLabel = x.RowLabel,
            ColNumber = x.ColNumber, SeatCode = x.SeatCode, IsActive = x.IsActive
        };

        private static string? Normalize(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

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
}
