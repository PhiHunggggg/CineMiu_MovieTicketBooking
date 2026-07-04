using DTO.Theater;
using Entities;

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
        Task<(List<ShowtimeDTO.ShowtimeResponse> Items, int TotalCount)> GetShowtimesAsync(
            string? keyword,
            int? movieId,
            int? cinemaId,
            int? hallId,
            DateTime? date,
            DateTime? dateFrom,
            DateTime? dateTo,
            string? status,
            int? page,
            int? pageSize,
            bool upcomingOnly = false);
        Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId);
        Task<int> CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task DeleteAsync(int showtimeId);
        Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days);
        Task<int?> GetDefaultGenerateMovieIdAsync();
        Task<(List<ShowtimeDTO.ShowtimeSuggestion> Suggestions, List<string> Warnings)> BuildGenerateSuggestionsAsync(ShowtimeDTO.GenerateShowtimesRequest request);
        Task<List<ShowtimeDTO.SeatResponse>> GetSeatsAsync(
            int showtimeId,
            ShowtimeDTO.ShowtimeResponse details,
            int? userId,
            string? sessionId);
        Task<List<Entities.Bookings.SeatLock>> LockSeatsAsync(
            int showtimeId,
            int userId,
            string sessionId,
            List<int> seatIds,
            int minutes);
        Task UnlockSeatsAsync(int showtimeId, int userId, string sessionId);
    }
}
