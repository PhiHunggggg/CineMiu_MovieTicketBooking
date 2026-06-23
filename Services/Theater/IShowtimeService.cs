using DTO.Common;
using DTO.Theater;
using Entities;

namespace Services.Theater
{
    public interface IShowtimeService
    {
        Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, DateTime? dateFrom, DateTime? dateTo, string? status, int page = 1, int pageSize = 12);
        Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId);
        Task CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest);
        Task DeleteAsync(int showtimeId);

        // Legacy-compatible methods used by controllers
        Task<object> GetAllAsync(int? movieId, int? cinemaId, DateTime? date, int? seatTypeId, int? dayTypeId, int? hallTypeId);
        Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days);
        Task<ShowtimeDTO.ShowtimeResponse?> GetShowtimeDetailsAsync(int id);
        Task<List<ShowtimeDTO.SeatResponse>> GetSeatsAsync(int id, int? userId, string? sessionId);
        Task<List<Bookings.SeatLock>> LockSeatsAsync(int id, int userId, string sessionId, List<int> seatIds, int minutes);
        Task UnlockSeatsAsync(int id, int userId, string sessionId);
    }
}
