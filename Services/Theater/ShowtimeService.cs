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
            return results;
        }

        public async Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days)
        {
            days = Math.Clamp(days, 1, 30);

            var movie = await context.Movies.AsNoTracking()
                .Where(x => x.Status != null &&
                            (x.Status.ToLower() == "nowshowing" ||
                             x.Status.ToLower() == "now_showing"))
                .OrderBy(x => x.MovieId)
                .FirstOrDefaultAsync();

            if (movie == null)
            {
                return [];
            }

            return await GenerateAsync(new ShowtimeDTO.GenerateShowtimesRequest
            {
                MovieId = movie.MovieId,
                DateFrom = DateTime.Today,
                DateTo = DateTime.Today.AddDays(days - 1)
            });
        }

        public async Task<ShowtimeDTO.GenerateShowtimesPreviewResponse> PreviewGenerateAsync(ShowtimeDTO.GenerateShowtimesRequest request)
        {
            var (suggestions, warnings) = await BuildGenerateSuggestionsAsync(request);
            return new ShowtimeDTO.GenerateShowtimesPreviewResponse
            {
                SuggestedCount = suggestions.Count,
                Suggestions = suggestions,
                Warnings = warnings
            };
        }

        public async Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateAsync(ShowtimeDTO.GenerateShowtimesRequest request)
        {
            var suggestions = request.Suggestions.Count > 0
                ? request.Suggestions
                : (await BuildGenerateSuggestionsAsync(request)).Suggestions;

            foreach (var suggestion in suggestions)
            {
                try
                {
                    await showtimeRepository.CreateAsync(new ShowtimeDTO.ShowtimeRequest
                    {
                        MovieId = suggestion.MovieId,
                        HallId = suggestion.HallId,
                        StartTime = suggestion.StartTime,
                        EndTime = suggestion.EndTime,
                        LanguageType = suggestion.LanguageType,
                        IsSpecial = suggestion.IsSpecial,
                        Status = suggestion.Status
                    });
                }
                catch (ArgumentException)
                {
                    continue;
                }
            }

            if (suggestions.Count == 0)
            {
                return [];
            }

            var dateFrom = request.DateFrom.Date;
            var dateTo = request.DateTo.Date;
            var responses = await showtimeRepository.GetAllShowtimesAsync(
                null, request.MovieId, request.CinemaId, null, null, "scheduled");

            return responses.Where(x =>
                x.StartTime.Date >= dateFrom &&
                x.StartTime.Date <= dateTo &&
                suggestions.Any(s => s.HallId == x.HallId && s.StartTime == x.StartTime))
                .ToList();
        }

        private async Task<(List<ShowtimeDTO.ShowtimeSuggestion> Suggestions, List<string> Warnings)> BuildGenerateSuggestionsAsync(ShowtimeDTO.GenerateShowtimesRequest request)
        {
            var warnings = new List<string>();
            var dateFrom = request.DateFrom.Date;
            var dateTo = request.DateTo.Date;

            if (request.MovieId <= 0)
            {
                throw new ArgumentException("Vui lòng chọn phim.");
            }

            if (dateFrom == default || dateTo == default || dateTo < dateFrom)
            {
                throw new ArgumentException("Khoảng ngày tạo lịch không hợp lệ.");
            }

            if ((dateTo - dateFrom).TotalDays > 30)
            {
                throw new ArgumentException("Chỉ có thể tạo lịch tối đa 31 ngày mỗi lần.");
            }

            var movie = await context.Movies.AsNoTracking()
                .FirstOrDefaultAsync(x => x.MovieId == request.MovieId);
            if (movie == null)
            {
                throw new ArgumentException("Phim đã chọn không tồn tại.");
            }

            if (movie.ReleaseDate.HasValue && dateFrom < movie.ReleaseDate.Value.Date)
            {
                dateFrom = movie.ReleaseDate.Value.Date;
                warnings.Add("Khoảng ngày đã được điều chỉnh theo ngày khởi chiếu của phim.");
            }

            if (movie.EndDate.HasValue && dateTo > movie.EndDate.Value.Date)
            {
                dateTo = movie.EndDate.Value.Date;
                warnings.Add("Khoảng ngày đã được điều chỉnh theo ngày kết thúc chiếu của phim.");
            }

            if (dateTo < dateFrom)
            {
                return ([], warnings);
            }

            var hallsQuery =
                from hall in context.Halls.AsNoTracking()
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                where hall.Status.ToLower() == "active" && cinema.IsActive
                select new { hall, cinema };

            if (request.CinemaId.HasValue && request.CinemaId.Value > 0)
            {
                hallsQuery = hallsQuery.Where(x => x.cinema.CinemaId == request.CinemaId.Value);
            }

            var halls = await hallsQuery
                .OrderBy(x => x.cinema.CinemaId)
                .ThenBy(x => x.hall.HallId)
                .ToListAsync();

            if (halls.Count == 0)
            {
                return ([], warnings);
            }

            var rangeEnd = dateTo.AddDays(1);
            var existing = await context.ShowTimes.AsNoTracking()
                .Where(x => x.StartTime >= dateFrom && x.StartTime < rangeEnd)
                .ToListAsync();
            var suggestions = new List<ShowtimeDTO.ShowtimeSuggestion>();
            var slots = new[] { 9, 12, 15, 18, 21 };
            var earliestStart = DateTime.Now.AddMinutes(30);

            for (var date = dateFrom; date <= dateTo; date = date.AddDays(1))
            {
                foreach (var row in halls)
                {
                    foreach (var slot in slots)
                    {
                        var startTime = date.AddHours(slot);
                        var endTime = startTime.AddMinutes(movie.DurationMins);

                        if (startTime <= earliestStart ||
                            startTime.TimeOfDay < row.cinema.OpeningTime ||
                            endTime.TimeOfDay > row.cinema.ClosingTime)
                        {
                            continue;
                        }

                        var overlaps = existing.Any(x =>
                            x.HallId == row.hall.HallId &&
                            !string.Equals(x.Status, "cancelled", StringComparison.OrdinalIgnoreCase) &&
                            x.StartTime < endTime &&
                            startTime < x.EndTime) ||
                            suggestions.Any(x =>
                                x.HallId == row.hall.HallId &&
                                x.StartTime < endTime &&
                                startTime < x.EndTime);

                        if (overlaps)
                        {
                            continue;
                        }

                        suggestions.Add(new ShowtimeDTO.ShowtimeSuggestion
                        {
                            MovieId = movie.MovieId,
                            MovieTitle = movie.Title,
                            HallId = row.hall.HallId,
                            HallName = row.hall.HallName,
                            CinemaId = row.cinema.CinemaId,
                            CinemaName = row.cinema.CinemaName,
                            StartTime = startTime,
                            EndTime = endTime,
                            LanguageType = "subtitled",
                            IsSpecial = false,
                            Status = "scheduled"
                        });
                    }
                }
            }

            return (suggestions, warnings);
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
        if (IsInactiveShowtimeStatus(details.Status) || details.EndTime <= DateTime.Now)
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

    private static bool IsInactiveShowtimeStatus(string? status)
    {
        return string.Equals(status, "cancelled", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(status, "completed", StringComparison.OrdinalIgnoreCase) ||
               string.Equals(status, "ended", StringComparison.OrdinalIgnoreCase);
    }
}
}
