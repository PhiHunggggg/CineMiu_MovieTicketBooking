using DTO.Common;
using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class CinemaService(ICinemaRepository cinemaRepository) : ICinemaService
    {
        public async Task<List<CinemaDTO.ChainResponse>> GetChainsAsync()
        {
            return await cinemaRepository.GetChainsAsync();
        }

        public async Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly = true)
        {
            return await cinemaRepository.GetAllCinemasAsync(null, city, activeOnly ? true : null);
        }

        public async Task<Paging.PaginationResponse<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var cinemas = await cinemaRepository.GetAllCinemasAsync(keyword, city, isActive);
            var totalCount = cinemas.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = cinemas.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new Paging.PaginationResponse<CinemaDTO.CinemaResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId)
        {
            return await cinemaRepository.GetCinemaByIdAsync(cinemaId);
        }

        public async Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest cinemaRequest)
        {
            return await cinemaRepository.CreateAsync(cinemaRequest);
        }

        public async Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest)
        {
            return await cinemaRepository.UpdateAsync(cinemaId, cinemaRequest);
        }

        public async Task DeleteAsync(int cinemaId)
        {
            await cinemaRepository.DeleteAsync(cinemaId);
        }
    }
}
