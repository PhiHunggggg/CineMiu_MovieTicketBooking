using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface ICinemaRepository
    {
        Task<List<CinemaDTO.ChainResponse>> GetChainsAsync();
        Task<List<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive);
        Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId);
        Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest cinemaRequest);
        Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest);
        Task DeleteAsync(int cinemaId);
    }
}
