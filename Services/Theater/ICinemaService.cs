using DTO.Common;
using DTO.Theater;

namespace Services.Theater
{
    public interface ICinemaService
    {
        Task<List<CinemaDTO.ChainResponse>> GetChainsAsync();
        Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly = true);
        Task<Paging.PaginationResponse<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive, int page = 1, int pageSize = 12);
        Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId);
        Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest cinemaRequest);
        Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest);
        Task DeleteAsync(int cinemaId);
    }
}
