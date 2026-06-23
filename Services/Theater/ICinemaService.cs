using DTO.Common;
using DTO.Theater;

namespace Services.Theater
{
    public interface ICinemaService
    {
        Task<List<CinemaDTO.ChainResponse>> GetChainsAsync();
        Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly = true);
        Task<Paging.PaginationResponse<CinemaDTO.CinemaResponse>> GetAllCinemasAsync(string? keyword, string? city, bool? isActive, int page = 1, int pageSize = 12);
        Task<List<CinemaDTO.CinemaResponse>> GetAllAsync(string? city, bool activeOnly);
        Task<List<CinemaDTO.CinemaByMovieResponse>> GetByMovieAsync(int movieId, DateTime? dateFrom, DateTime? dateTo);
        Task<CinemaDTO.CinemaResponse> GetCinemaByIdAsync(int cinemaId);
        Task<CinemaDTO.CinemaDetailResponse> GetDetailAsync(int cinemaId);
        Task<List<CinemaDTO.HallResponse>> GetHallsAsync(int cinemaId);
        Task<CinemaDTO.CinemaResponse> CreateAsync(CinemaDTO.CinemaRequest cinemaRequest);
        Task<CinemaDTO.CinemaResponse> UpdateAsync(int cinemaId, CinemaDTO.CinemaRequest cinemaRequest);
        Task DeleteAsync(int cinemaId);
        Task<CinemaDTO.HallResponse> CreateHallAsync(int cinemaId, CinemaDTO.HallRequest request);
        Task<CinemaDTO.HallResponse> UpdateHallAsync(int hallId, CinemaDTO.HallRequest request);
        Task DeleteHallAsync(int hallId);
        Task<List<CinemaDTO.SeatResponse>> GetSeatsAsync(int hallId);
        Task<CinemaDTO.SeatResponse> CreateSeatAsync(int hallId, CinemaDTO.SeatRequest request);
        Task<List<CinemaDTO.SeatResponse>> ReplaceSeatsAsync(int hallId, IReadOnlyCollection<CinemaDTO.SeatRequest> requests);
    }
}
