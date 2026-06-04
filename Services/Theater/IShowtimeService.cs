using DTO.Common;
using DTO.Theater;

namespace Services.Theater
{
    public interface IShowtimeService
    {
        Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status, int page = 1, int pageSize = 12);
        Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId);
        Task CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task DeleteAsync(int showtimeId);
    }
}
