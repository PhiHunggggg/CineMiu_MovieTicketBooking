using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class CinemaLookupRepository(SqlServerDbContext context) : ICinemaLookupRepository
    {
        public async Task<CinemaLookupDTO.LookupResponse> GetAllAsync()
        {
            // DbContext does not support concurrent queries, so these are intentionally awaited in sequence.
            var response = new CinemaLookupDTO.LookupResponse
            {
                Roles = await context.Roles.AsNoTracking().OrderBy(x => x.RoleId)
                    .Select(x => new CinemaLookupDTO.RoleResponse
                    {
                        RoleId = x.RoleId,
                        RoleName = x.RoleName,
                        Description = x.Description,
                        CreatedAt = x.CreatedAt,
                        UpdatedAt = x.UpdatedAt
                    }).ToListAsync(),
                Chains = await context.Chains.AsNoTracking().OrderBy(x => x.ChainName)
                    .Select(x => new CinemaLookupDTO.ChainResponse
                    {
                        ChainId = x.ChainId,
                        ChainName = x.ChainName,
                        LogoUrl = x.LogoUrl,
                        Website = x.Website
                    }).ToListAsync(),
                HallTypes = await context.HallTypes.AsNoTracking().OrderBy(x => x.HallTypeId)
                    .Select(x => new CinemaLookupDTO.HallTypeResponse
                    {
                        HallTypeId = x.HallTypeId,
                        TypeName = x.TypeName,
                        Description = x.Description,
                        SurchargePct = x.SurchargePct
                    }).ToListAsync(),
                SeatTypes = await context.SeatTypes.AsNoTracking().OrderBy(x => x.SeatTypeId)
                    .Select(x => new CinemaLookupDTO.SeatTypeResponse
                    {
                        SeatTypeId = x.SeatTypeId,
                        TypeName = x.TypeName,
                        Description = x.Description,
                        PriceModifier = x.PriceModifier,
                        CreatedAt = x.CreatedAt,
                        UpdatedAt = x.UpdatedAt
                    }).ToListAsync(),
                DayTypes = await context.DayTypes.AsNoTracking().OrderBy(x => x.DayTypeId)
                    .Select(x => new CinemaLookupDTO.DayTypeResponse
                    {
                        DayTypeId = x.DayTypeId,
                        TypeName = x.TypeName,
                        Description = x.Description
                    }).ToListAsync(),
                Genres = await context.Genres.AsNoTracking().OrderBy(x => x.GenreName)
                    .Select(x => new CinemaLookupDTO.GenreResponse
                    {
                        GenreId = x.GenreId,
                        GenreName = x.GenreName,
                        Description = x.Description,
                        CreatedAt = x.CreatedAt,
                        UpdatedAt = x.UpdatedAt
                    }).ToListAsync(),
                Countries = await context.Countries.AsNoTracking().OrderBy(x => x.CountryName)
                    .Select(x => new CinemaLookupDTO.CountryResponse
                    {
                        CountryId = x.CountryId,
                        CountryName = x.CountryName,
                        CountryCode = x.CountryCode
                    }).ToListAsync(),
                ConcessionCategories = await context.ConcessionCategories.AsNoTracking().OrderBy(x => x.CatId)
                    .Select(x => new CinemaLookupDTO.ConcessionCategoryResponse
                    {
                        CatId = x.CatId,
                        CatName = x.CatName,
                        CreatedAt = x.CreatedAt,
                        UpdatedAt = x.UpdatedAt
                    }).ToListAsync(),
                PaymentMethods = await context.PaymentMethods.AsNoTracking().Where(x => x.IsActive)
                    .OrderBy(x => x.MethodId)
                    .Select(x => new CinemaLookupDTO.PaymentMethodResponse
                    {
                        MethodId = x.MethodId,
                        MethodName = x.MethodName,
                        Provider = x.Provider,
                        LogoUrl = x.LogoUrl,
                        IsActive = x.IsActive
                    }).ToListAsync()
            };

            return response;
        }

        public async Task<CinemaLookupDTO.GenreResponse> CreateGenreAsync(string genreName)
        {
            if (await context.Genres.AnyAsync(x => x.GenreName == genreName))
            {
                throw new ArgumentException("Genre already exists");
            }

            var now = DateTime.UtcNow;
            var genre = new Genre
            {
                GenreName = genreName,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Genres.Add(genre);
            await context.SaveChangesAsync();

            return new CinemaLookupDTO.GenreResponse
            {
                GenreId = genre.GenreId,
                GenreName = genre.GenreName,
                Description = genre.Description,
                CreatedAt = genre.CreatedAt,
                UpdatedAt = genre.UpdatedAt
            };
        }
    }
}
