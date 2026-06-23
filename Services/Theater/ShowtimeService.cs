using DTO.Common;
using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;
using Repository;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class ShowtimeService(
        IShowtimeRepository showtimeRepository,
        SqlServerDbContext context) : IShowtimeService
    {
        public async Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, DateTime? dateFrom, DateTime? dateTo, string? status, int page = 1, int pageSize = 12, bool upcomingOnly = false)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var (items, totalCount) = await showtimeRepository.GetShowtimesAsync(
                keyword, movieId, cinemaId, hallId, date, dateFrom, dateTo, status, page, pageSize, upcomingOnly);
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            return new Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }

        public async Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId)
        {
            return await showtimeRepository.GetShowtimeByIdAsync(showtimeId);
        }

        public async Task CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            await showtimeRepository.CreateAsync(showtimeRequest);
        }

        public async Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            await showtimeRepository.UpdateAsync(showtimeId, showtimeRequest);
        }

        public async Task DeleteAsync(int showtimeId)
        {
            await showtimeRepository.DeleteAsync(showtimeId);
        }

        // Legacy-compatible adapters
        public async Task<object> GetAllAsync(int? movieId, int? cinemaId, DateTime? date, int? seatTypeId, int? dayTypeId, int? hallTypeId)
        {
            var results = await GetAllShowtimesAsync(null, movieId, cinemaId, null, date, null, null, null, 1, 1000);
            var results = await GetAllShowtimesAsync(null, movieId, cinemaId, null, date, null, null, null, 1, 1000);
            return results;
        }

        public async Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days)
        {
            days = Math.Clamp(days, 1, 30);

            var movies = await context.Movies.AsNoTracking()
                .Where(x => x.Status == "NowShowing" ||
                            x.Status == "now_showing" ||
                            x.Status == "nowshowing")
                .OrderBy(x => x.MovieId)
                .ToListAsync();
            var halls = await context.Halls.AsNoTracking()
                .Where(x => x.Status == "active")
                .OrderBy(x => x.HallId)
                .ToListAsync();

            if (movies.Count == 0 || halls.Count == 0)
            {
                return [];
            }

            var today = DateTime.Today;
            var rangeEnd = today.AddDays(days);
            var existing = await context.ShowTimes
                .Where(x => x.StartTime >= today && x.StartTime < rangeEnd)
                .ToListAsync();
            var created = new List<ShowTime>();
            var slots = new[] { 9, 12, 15, 18, 21 };
            var now = DateTime.Now;

            for (var dayIndex = 0; dayIndex < days; dayIndex++)
            {
                var date = today.AddDays(dayIndex);
                for (var hallIndex = 0; hallIndex < halls.Count; hallIndex++)
                {
                    var hall = halls[hallIndex];
                    for (var slotIndex = 0; slotIndex < slots.Length; slotIndex++)
                    {
                        var startTime = date.AddHours(slots[slotIndex]);
                        if (startTime <= now.AddMinutes(30))
                        {
                            continue;
                        }

                        var movie = movies[(dayIndex * halls.Count * slots.Length +
                                            hallIndex * slots.Length +
                                            slotIndex) % movies.Count];
                        var endTime = startTime.AddMinutes(movie.DurationMins);
                        var overlaps = existing.Concat(created).Any(x =>
                            x.HallId == hall.HallId &&
                            x.Status != "cancelled" &&
                            x.StartTime < endTime &&
                            startTime < x.EndTime);
                        if (overlaps)
                        {
                            continue;
                        }

                        created.Add(new ShowTime
                        {
                            MovieId = movie.MovieId,
                            HallId = hall.HallId,
                            StartTime = startTime,
                            EndTime = endTime,
                            LanguageType = "subtitled",
                            IsSpecial = false,
                            Status = "scheduled",
                            CreatedAt = DateTime.UtcNow,
                            UpdatedAt = DateTime.UtcNow
                        });
                    }
                }
            }

            if (created.Count == 0)
            {
                return [];
            }

            context.ShowTimes.AddRange(created);
            await context.SaveChangesAsync();

            var createdIds = created.Select(x => x.ShowtimeId).ToHashSet();
            var responses = await showtimeRepository.GetAllShowtimesAsync(
                null, null, null, null, null, null, null, null);
            return responses.Where(x => createdIds.Contains(x.ShowtimeId)).ToList();
        }

    public async Task<ShowtimeDTO.ShowtimeResponse?> GetShowtimeDetailsAsync(int id)
    {
        try { return await showtimeRepository.GetShowtimeByIdAsync(id); }
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
        return await showtimeRepository.GetSeatsAsync(id, details, userId, sessionId);
    }

    public Task<List<Bookings.SeatLock>> LockSeatsAsync(
        int id, int userId, string sessionId, List<int> seatIds, int minutes)
    {
        ValidateSession(userId, sessionId);
        if (seatIds.Count == 0) throw new ArgumentException("At least one seat is required");
        return showtimeRepository.LockSeatsAsync(id, userId, sessionId.Trim(), seatIds, minutes);
    }

    public Task UnlockSeatsAsync(int id, int userId, string sessionId)
    {
        ValidateSession(userId, sessionId);
        return showtimeRepository.UnlockSeatsAsync(id, userId, sessionId.Trim());
    }

    private static void ValidateSession(int userId, string? sessionId)
    {
        if (userId <= 0 || string.IsNullOrWhiteSpace(sessionId))
            throw new ArgumentException("UserId and SessionId are required");
    }
}
}
