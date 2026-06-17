using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface IShowtimeRepository
    {
        Task<List<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status, bool upcomingOnly = false);
        Task<(List<ShowtimeDTO.ShowtimeResponse> Items, int TotalCount)> GetShowtimesPageAsync(
            string? keyword,
            int? movieId,
            int? cinemaId,
            int? hallId,
            DateTime? date,
            string? status,
            int page,
            int pageSize,
            bool upcomingOnly = false);
        Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId);
        Task<int> CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task DeleteAsync(int showtimeId);
    }
}
