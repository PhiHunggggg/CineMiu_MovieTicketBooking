using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class CinemaRepository(SqlServerDbContext context) : ICinemaRepository
    {
        public async Task<List<CinemaDTO.ChainResponse>> GetChainsAsync()
        {
            return await context.Chains
                .AsNoTracking()
                .OrderBy(x => x.ChainName)
                .Select(x => new CinemaDTO.ChainResponse
                {
                    ChainId = x.ChainId,
                    ChainName = x.ChainName
                })
                .ToListAsync();
        }

        public async Task<List<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive)
        {
            var query = context.Cinemas.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var trimmedKeyword = keyword.Trim();
                query = query.Where(x =>
                    x.CinemaName.Contains(trimmedKeyword) ||
                    x.Address.Contains(trimmedKeyword) ||
                    x.City.Contains(trimmedKeyword) ||
                    (x.District != null && x.District.Contains(trimmedKeyword)));
            }

            if (!string.IsNullOrWhiteSpace(city))
            {
                var trimmedCity = city.Trim();
                query = query.Where(x => x.City.Contains(trimmedCity));
            }

            if (isActive.HasValue)
            {
                query = query.Where(x => x.IsActive == isActive.Value);
            }

            var cinemas = await query
                .OrderByDescending(x => x.IsActive)
                .ThenBy(x => x.City)
                .ThenBy(x => x.CinemaName)
                .ToListAsync();

            var chainIds = cinemas.Select(x => x.ChainId).Distinct().ToList();
            var chainLookup = await context.Chains
                .AsNoTracking()
                .Where(x => chainIds.Contains(x.ChainId))
                .ToDictionaryAsync(x => x.ChainId, x => x.ChainName);

            return cinemas.Select(x => ToResponse(x, chainLookup)).ToList();
        }

        public async Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId)
        {
            var cinema = await context.Cinemas.AsNoTracking().FirstOrDefaultAsync(x => x.CinemaId == cinemaId);
            if (cinema == null)
            {
                throw new ArgumentException("Cinema not found");
            }

            var chainName = await context.Chains
                .AsNoTracking()
                .Where(x => x.ChainId == cinema.ChainId)
                .Select(x => x.ChainName)
                .FirstOrDefaultAsync();

            return ToResponse(cinema, new Dictionary<int, string> { [cinema.ChainId] = chainName ?? "" });
        }

        public async Task CreateAsync(CinemaDTO.CinemaRequest cinemaRequest)
        {
            var validationError = await ValidateCinemaDto(cinemaRequest);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var now = DateTime.UtcNow;
            var cinema = new Cinema
            {
                ChainId = cinemaRequest.ChainId,
                CinemaName = cinemaRequest.CinemaName.Trim(),
                Address = cinemaRequest.Address.Trim(),
                City = cinemaRequest.City.Trim(),
                District = NormalizeOptionalText(cinemaRequest.Ward),
                Phone = NormalizeOptionalText(cinemaRequest.Phone),
                Email = NormalizeOptionalText(cinemaRequest.Email),
                MapUrl = NormalizeOptionalText(cinemaRequest.MapUrl),
                ImageUrl = NormalizeOptionalText(cinemaRequest.ImageUrl),
                IsActive = cinemaRequest.IsActive,
                CreatedAt = now,
                UpdatedAt = now
            };

            context.Cinemas.Add(cinema);
            await context.SaveChangesAsync();
        }

        public async Task UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest)
        {
            var validationError = await ValidateCinemaDto(cinemaRequest);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var cinema = await context.Cinemas.FirstOrDefaultAsync(x => x.CinemaId == cinemaId);
            if (cinema == null)
            {
                throw new ArgumentException("Cinema not found");
            }

            cinema.ChainId = cinemaRequest.ChainId;
            cinema.CinemaName = cinemaRequest.CinemaName.Trim();
            cinema.Address = cinemaRequest.Address.Trim();
            cinema.City = cinemaRequest.City.Trim();
            cinema.District = NormalizeOptionalText(cinemaRequest.Ward);
            cinema.Phone = NormalizeOptionalText(cinemaRequest.Phone);
            cinema.Email = NormalizeOptionalText(cinemaRequest.Email);
            cinema.MapUrl = NormalizeOptionalText(cinemaRequest.MapUrl);
            cinema.ImageUrl = NormalizeOptionalText(cinemaRequest.ImageUrl);
            cinema.IsActive = cinemaRequest.IsActive;
            cinema.UpdatedAt = DateTime.UtcNow;

            await context.SaveChangesAsync();
        }

        public async Task DeleteAsync(int cinemaId)
        {
            var cinema = await context.Cinemas.FirstOrDefaultAsync(x => x.CinemaId == cinemaId);
            if (cinema == null)
            {
                throw new ArgumentException("Cinema not found");
            }

            var hasHalls = await context.Halls.AnyAsync(x => x.CinemaId == cinemaId);
            if (hasHalls)
            {
                throw new ArgumentException("Cannot delete cinema because it has halls");
            }

            context.Cinemas.Remove(cinema);
            await context.SaveChangesAsync();
        }

        private async Task<string?> ValidateCinemaDto(CinemaDTO.CinemaRequest dto)
        {
            if (dto.ChainId <= 0)
            {
                return "Chain ID is required";
            }

            if (!await context.Chains.AnyAsync(x => x.ChainId == dto.ChainId))
            {
                return "Selected chain does not exist";
            }

            if (string.IsNullOrWhiteSpace(dto.CinemaName))
            {
                return "Cinema name is required";
            }

            if (string.IsNullOrWhiteSpace(dto.Address))
            {
                return "Cinema address is required";
            }

            if (string.IsNullOrWhiteSpace(dto.City))
            {
                return "Cinema city is required";
            }

            return null;
        }

        private static CinemaDTO.CinemaResponse ToResponse(Cinema cinema, Dictionary<int, string> chainLookup)
        {
            return new CinemaDTO.CinemaResponse
            {
                CinemaId = cinema.CinemaId,
                ChainId = cinema.ChainId,
                ChainName = chainLookup.GetValueOrDefault(cinema.ChainId),
                CinemaName = cinema.CinemaName,
                Address = cinema.Address,
                City = cinema.City,
                Ward = cinema.District,
                Phone = cinema.Phone,
                Email = cinema.Email,
                MapUrl = cinema.MapUrl,
                ImageUrl = cinema.ImageUrl,
                IsActive = cinema.IsActive
            };
        }

        private static string? NormalizeOptionalText(string? value)
        {
            var trimmed = value?.Trim();
            return string.IsNullOrEmpty(trimmed) ? null : trimmed;
        }
    }
}
