using DTO.Common;
using DTO.Theater;
using Entities;
using Repository.EFCore.Theater;

namespace Services.Theater;

public class ShowtimeService(IShowtimeRepository repository) : IShowtimeService
{
    public async Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(
        string? keyword,
        int? movieId,
        int? cinemaId,
        int? hallId,
        DateTime? date,
        string? status,
        int page = 1,
        int pageSize = 12,
        bool upcomingOnly = false)
    {
        page = Math.Max(page, 1);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var result = await repository.GetShowtimesPageAsync(
            keyword, movieId, cinemaId, hallId, date, status, page, pageSize, upcomingOnly);
        return new Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>
        {
            Page = page,
            PageSize = pageSize,
            TotalCount = result.TotalCount,
            TotalPages = (int)Math.Ceiling(result.TotalCount / (double)pageSize),
            Items = result.Items
        };
    }

    public Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId) =>
        repository.GetShowtimeByIdAsync(showtimeId);

    public Task CreateAsync(ShowtimeDTO.ShowtimeRequest request) => repository.CreateAsync(request);
    public Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest request) => repository.UpdateAsync(showtimeId, request);
    public Task DeleteAsync(int showtimeId) => repository.DeleteAsync(showtimeId);

    public async Task<object> GetAllAsync(
        int? movieId, int? cinemaId, DateTime? date, int? seatTypeId, int? dayTypeId, int? hallTypeId) =>
        await GetAllShowtimesAsync(null, movieId, cinemaId, null, date, null, 1, 1000);

    public Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days) =>
        repository.GenerateUpcomingAsync(Math.Clamp(days, 1, 30));

    public async Task<ShowtimeDTO.ShowtimeResponse?> GetShowtimeDetailsAsync(int id)
    {
        try { return await repository.GetShowtimeByIdAsync(id); }
        catch (ArgumentException) { return null; }
    }

    public async Task<List<ShowtimeDTO.SeatResponse>> GetSeatsAsync(int id, int? userId, string? sessionId)
    {
        var details = await GetShowtimeDetailsAsync(id)
            ?? throw new KeyNotFoundException("Showtime not found");
        if (!string.Equals(details.Hall.Status, "active", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("This hall is currently unavailable");
        if (details.Status is "cancelled" or "completed" or "ended" || details.EndTime <= DateTime.Now)
            throw new InvalidOperationException("This showtime is no longer available");
        return await repository.GetSeatsAsync(id, details, userId, sessionId);
    }

    public Task<List<Bookings.SeatLock>> LockSeatsAsync(
        int id, int userId, string sessionId, List<int> seatIds, int minutes)
    {
        ValidateSession(userId, sessionId);
        if (seatIds.Count == 0) throw new ArgumentException("At least one seat is required");
        return repository.LockSeatsAsync(id, userId, sessionId.Trim(), seatIds, minutes);
    }

    public Task UnlockSeatsAsync(int id, int userId, string sessionId)
    {
        ValidateSession(userId, sessionId);
        return repository.UnlockSeatsAsync(id, userId, sessionId.Trim());
    }

    private static void ValidateSession(int userId, string? sessionId)
    {
        if (userId <= 0 || string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("UserId and SessionId are required");
    }
}
