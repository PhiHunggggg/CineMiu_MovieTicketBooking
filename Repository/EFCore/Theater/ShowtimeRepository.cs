using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Repository.Pricing;
using System.Data;

namespace Repository.EFCore.Theater
{
    public class ShowtimeRepository(SqlServerDbContext context) : IShowtimeRepository
    {
        private static readonly HashSet<string> AllowedStatuses = new(StringComparer.OrdinalIgnoreCase)
        {
            "scheduled",
            "selling",
            "sold_out",
            "cancelled",
            "completed"
        };

        private static readonly HashSet<string> AllowedLanguageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "subtitled",
            "dubbed",
            "original"
        };

        public async Task<List<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status, bool upcomingOnly = false)
        {
            var (items, _) = await GetShowtimesAsync(keyword, movieId, cinemaId, hallId, date, null, null, status, null, null, upcomingOnly);
            return items;
        }

        public async Task<(List<ShowtimeDTO.ShowtimeResponse> Items, int TotalCount)> GetShowtimesPageAsync(
            string? keyword,
            int? movieId,
            int? cinemaId,
            int? hallId,
            DateTime? date,
            string? status,
            int page,
            int pageSize,
            bool upcomingOnly = false)
        {
            return await GetShowtimesAsync(keyword, movieId, cinemaId, hallId, date, null, null, status, page, pageSize, upcomingOnly);
        }

        public async Task<(List<ShowtimeDTO.ShowtimeResponse> Items, int TotalCount)> GetShowtimesAsync(
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
            bool upcomingOnly = false)
        {
            var query =
                from showtime in context.ShowTimes.AsNoTracking()
                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                join hallType in context.HallTypes.AsNoTracking() on hall.HallTypeId equals hallType.HallTypeId into hallTypeJoin
                from hallType in hallTypeJoin.DefaultIfEmpty()
                select new { showtime, movie, hall, cinema, hallType };

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var trimmedKeyword = keyword.Trim();
                query = query.Where(x =>
                    x.movie.Title.Contains(trimmedKeyword) ||
                    (x.movie.TitleEn != null && x.movie.TitleEn.Contains(trimmedKeyword)) ||
                    x.hall.HallName.Contains(trimmedKeyword) ||
                    x.cinema.CinemaName.Contains(trimmedKeyword));
            }

            if (movieId.HasValue)
            {
                query = query.Where(x => x.showtime.MovieId == movieId.Value);
            }

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.hall.CinemaId == cinemaId.Value);
            }

            if (hallId.HasValue)
            {
                query = query.Where(x => x.showtime.HallId == hallId.Value);
            }

            if (date.HasValue)
            {
                var dayStart = date.Value.Date;
                var dayEnd = dayStart.AddDays(1);
                query = query.Where(x => x.showtime.StartTime >= dayStart && x.showtime.StartTime < dayEnd);
            }
            else
            {
                if (dateFrom.HasValue)
                {
                    query = query.Where(x => x.showtime.StartTime >= dateFrom.Value.Date);
                }

                if (dateTo.HasValue)
                {
                    query = query.Where(x => x.showtime.StartTime < dateTo.Value.Date.AddDays(1));
                }
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                var now = DateTime.Now;

                query = normalizedStatus switch
                {
                    "upcoming" => query.Where(x =>
                        x.showtime.Status.ToLower() != "cancelled" &&
                        x.showtime.Status.ToLower() != "completed" &&
                        x.showtime.Status.ToLower() != "selling" &&
                        x.showtime.StartTime > now),
                    "showing" => query.Where(x =>
                        x.showtime.Status.ToLower() != "cancelled" &&
                        x.showtime.Status.ToLower() != "completed" &&
                        x.showtime.EndTime > now &&
                        (x.showtime.Status.ToLower() == "selling" || x.showtime.StartTime <= now)),
                    "ended" => query.Where(x =>
                        x.showtime.Status.ToLower() != "cancelled" &&
                        (x.showtime.Status.ToLower() == "completed" || x.showtime.EndTime <= now)),
                    "cancelled" => query.Where(x => x.showtime.Status.ToLower() == "cancelled"),
                    _ => query.Where(x => x.showtime.Status.ToLower() == normalizedStatus)
                };
            }

            if (upcomingOnly)
            {
                var now = DateTime.Now;
                query = query.Where(x =>
                    x.showtime.EndTime > now &&
                    x.showtime.Status.ToLower() != "cancelled" &&
                    x.showtime.Status.ToLower() != "completed");
            }

            var totalCount = await query.CountAsync();
            query = query.OrderBy(x => x.showtime.StartTime);

            if (page.HasValue && pageSize.HasValue)
            {
                query = query.Skip((page.Value - 1) * pageSize.Value).Take(pageSize.Value);
            }

            var rows = await query.ToListAsync();

            return (await ToResponsesAsync(rows), totalCount);
        }

        public async Task<ShowtimeDTO.ShowtimeResponse> GetShowtimeByIdAsync(int showtimeId)
        {
            var query =
                from showtime in context.ShowTimes.AsNoTracking()
                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                join hallType in context.HallTypes.AsNoTracking() on hall.HallTypeId equals hallType.HallTypeId into hallTypeJoin
                from hallType in hallTypeJoin.DefaultIfEmpty()
                where showtime.ShowtimeId == showtimeId
                select new { showtime, movie, hall, cinema, hallType };

            var rows = await query.ToListAsync();
            if (rows.Count == 0)
            {
                throw new ArgumentException("Showtime not found");
            }

            return (await ToResponsesAsync(rows)).First();
        }

        public async Task<int> CreateAsync(ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            return await ExecuteInSerializableTransactionAsync(async () =>
            {
                await AcquireHallScheduleLockAsync(showtimeRequest.HallId);

                var prepared = await PrepareShowtimeAsync(showtimeRequest, null);
                if (prepared.Error != null)
                {
                    throw new ArgumentException(prepared.Error);
                }

                var now = DateTime.UtcNow;
                var showtime = new ShowTime
                {
                    MovieId = showtimeRequest.MovieId,
                    HallId = showtimeRequest.HallId,
                    StartTime = showtimeRequest.StartTime,
                    EndTime = prepared.EndTime,
                    LanguageType = prepared.LanguageType,
                    IsSpecial = showtimeRequest.IsSpecial,
                    Status = prepared.Status,
                    CreatedAt = now,
                    UpdatedAt = now
                };

                context.ShowTimes.Add(showtime);
                await context.SaveChangesAsync();

                return showtime.ShowtimeId;
            });
        }

        public async Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            await ExecuteInSerializableTransactionAsync(async () =>
            {
                await AcquireHallScheduleLockAsync(showtimeRequest.HallId);

                var showtime = await context.ShowTimes.FirstOrDefaultAsync(x => x.ShowtimeId == showtimeId);
                if (showtime == null)
                {
                    throw new ArgumentException("Showtime not found");
                }

                var prepared = await PrepareShowtimeAsync(showtimeRequest, showtimeId);
                if (prepared.Error != null)
                {
                    throw new ArgumentException(prepared.Error);
                }

                var hasBookings = await context.Bookings.AnyAsync(x => x.ShowtimeId == showtimeId);
                var scheduleChanged =
                    showtime.MovieId != showtimeRequest.MovieId ||
                    showtime.HallId != showtimeRequest.HallId ||
                    showtime.StartTime != showtimeRequest.StartTime ||
                    showtime.EndTime != prepared.EndTime;

                if (hasBookings && scheduleChanged)
                {
                    throw new ArgumentException("Cannot change movie, hall or time because this showtime already has bookings");
                }

                showtime.MovieId = showtimeRequest.MovieId;
                showtime.HallId = showtimeRequest.HallId;
                showtime.StartTime = showtimeRequest.StartTime;
                showtime.EndTime = prepared.EndTime;
                showtime.LanguageType = prepared.LanguageType;
                showtime.IsSpecial = showtimeRequest.IsSpecial;
                showtime.Status = prepared.Status;
                showtime.UpdatedAt = DateTime.UtcNow;

                await context.SaveChangesAsync();

                return true;
            });
        }

        private async Task<TResult> ExecuteInSerializableTransactionAsync<TResult>(Func<Task<TResult>> operation)
        {
            var strategy = context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync(async () =>
            {
                if (!context.Database.IsRelational())
                {
                    return await operation();
                }

                await using var transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                var result = await operation();
                await transaction.CommitAsync();
                return result;
            });
        }

        public async Task DeleteAsync(int showtimeId)
        {
            var showtime = await context.ShowTimes.FirstOrDefaultAsync(x => x.ShowtimeId == showtimeId);
            if (showtime == null)
            {
                throw new ArgumentException("Showtime not found");
            }

            if (await context.Bookings.AnyAsync(x => x.ShowtimeId == showtimeId && x.Status != "cancelled"))
            {
                throw new ArgumentException("Cannot delete showtime because it has bookings");
            }

            context.SeatLocks.RemoveRange(context.SeatLocks.Where(x => x.ShowtimeId == showtimeId));
            context.ShowTimes.Remove(showtime);
            await context.SaveChangesAsync();
        }

        public async Task<List<ShowtimeDTO.ShowtimeResponse>> GenerateUpcomingAsync(int days)
        {
            var movies = await context.Movies.AsNoTracking()
                .Where(x => x.Status != null &&
                            (x.Status.ToLower() == "nowshowing" || x.Status.ToLower() == "now_showing"))
                .OrderBy(x => x.MovieId).ToListAsync();
            var halls = await context.Halls.AsNoTracking()
                .Where(x => x.Status.ToLower() == "active").OrderBy(x => x.HallId).ToListAsync();
            if (movies.Count == 0 || halls.Count == 0) return [];

            var cinemaHours = await context.Cinemas.AsNoTracking()
                .ToDictionaryAsync(x => x.CinemaId, x => new { x.OpeningTime, x.ClosingTime });

            var today = DateTime.Today;
            var existing = await context.ShowTimes
                .Where(x => x.StartTime >= today && x.StartTime < today.AddDays(days)).ToListAsync();
            var candidates = new List<ShowTime>();
            int[] slots = [9, 12, 15, 18, 21];

            for (var dayIndex = 0; dayIndex < days; dayIndex++)
            {
                var date = today.AddDays(dayIndex);
                for (var hallIndex = 0; hallIndex < halls.Count; hallIndex++)
                {
                    var hall = halls[hallIndex];
                    for (var slotIndex = 0; slotIndex < slots.Length; slotIndex++)
                    {
                        var start = date.AddHours(slots[slotIndex]);
                        var movie = movies[(dayIndex * halls.Count * slots.Length + hallIndex * slots.Length + slotIndex) % movies.Count];
                        var end = start.AddMinutes(movie.DurationMins);
                        if (!cinemaHours.TryGetValue(hall.CinemaId, out var hours) ||
                            start.TimeOfDay < hours.OpeningTime ||
                            end.TimeOfDay > hours.ClosingTime) continue;
                        if (existing.Concat(candidates).Any(x => x.HallId == hall.HallId &&
                                !string.Equals(x.Status, "cancelled", StringComparison.OrdinalIgnoreCase) &&
                                x.StartTime < end && start < x.EndTime)) continue;
                        candidates.Add(new ShowTime
                        {
                            MovieId = movie.MovieId,
                            HallId = hall.HallId,
                            StartTime = start,
                            EndTime = end,
                            LanguageType = "subtitled",
                            Status = "scheduled"
                        });
                    }
                }
            }

            var createdIds = new HashSet<int>();
            foreach (var candidate in candidates)
            {
                try
                {
                    createdIds.Add(await CreateAsync(new ShowtimeDTO.ShowtimeRequest
                    {
                        MovieId = candidate.MovieId,
                        HallId = candidate.HallId,
                        StartTime = candidate.StartTime,
                        EndTime = candidate.EndTime,
                        LanguageType = candidate.LanguageType,
                        Status = candidate.Status
                    }));
                }
                catch (ArgumentException)
                {
                    // A concurrent generator may already have occupied this slot.
                }
            }

            if (createdIds.Count == 0) return [];
            var responses = await GetAllShowtimesAsync(null, null, null, null, null, null);
            return responses.Where(x => createdIds.Contains(x.ShowtimeId)).ToList();
        }

        public async Task<int?> GetDefaultGenerateMovieIdAsync()
        {
            return await context.Movies.AsNoTracking()
                .Where(x => x.Status != null &&
                            (x.Status.ToLower() == "nowshowing" ||
                             x.Status.ToLower() == "now_showing"))
                .OrderBy(x => x.MovieId)
                .Select(x => (int?)x.MovieId)
                .FirstOrDefaultAsync();
        }

        public async Task<(List<ShowtimeDTO.ShowtimeSuggestion> Suggestions, List<string> Warnings)> BuildGenerateSuggestionsAsync(ShowtimeDTO.GenerateShowtimesRequest request)
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

        public async Task<List<ShowtimeDTO.SeatResponse>> GetSeatsAsync(
            int showtimeId,
            ShowtimeDTO.ShowtimeResponse details,
            int? userId,
            string? sessionId)
        {
            var now = DateTime.UtcNow;
            var showtime = await context.ShowTimes.AsNoTracking().FirstAsync(x => x.ShowtimeId == showtimeId);
            var seats = await context.Seats.AsNoTracking()
                .Where(x => x.HallId == details.HallId)
                .OrderBy(x => x.RowLabel).ThenBy(x => x.ColNumber).ToListAsync();
            seats = seats
                .Where(x => RowLabelToNumber(x.RowLabel) <= details.Hall.TotalRows && x.ColNumber <= details.Hall.TotalCols)
                .ToList();
            var seatIds = seats.Select(x => x.SeatId).ToList();
            var usedSeatTypeIds = seats.Select(x => x.SeatTypeId).Distinct().ToList();
            var seatTypes = await context.SeatTypes.AsNoTracking()
                .Where(x => usedSeatTypeIds.Contains(x.SeatTypeId)).ToDictionaryAsync(x => x.SeatTypeId);
            var standardSeatTypeId = await ResolveStandardSeatTypeIdAsync();
            var dayTypes = await context.DayTypes.AsNoTracking().ToListAsync();
            var priceSeatTypeIds = seatTypes.Keys.Append(standardSeatTypeId).Distinct().ToList();
            var priceRules = await context.TicketPrices.AsNoTracking().Where(x =>
                x.CinemaId == details.Hall.CinemaId &&
                x.HallTypeId == details.Hall.HallTypeId &&
                priceSeatTypeIds.Contains(x.SeatTypeId)).ToListAsync();
            var bookedSeatIds = await context.Tickets.AsNoTracking()
                .Join(context.Bookings.AsNoTracking().Where(x => x.ShowtimeId == showtimeId && x.Status != "cancelled"),
                    ticket => ticket.BookingId, booking => booking.BookingId, (ticket, booking) => ticket.SeatId)
                .Where(x => seatIds.Contains(x)).ToHashSetAsync();
            var locks = await context.SeatLocks.AsNoTracking()
                .Where(x => x.ShowtimeId == showtimeId && x.ExpiresAt > now && seatIds.Contains(x.SeatId))
                .ToDictionaryAsync(x => x.SeatId);

            return seats.Select(seat =>
            {
                seatTypes.TryGetValue(seat.SeatTypeId, out var seatType);
                locks.TryGetValue(seat.SeatId, out var seatLock);
                var currentSession = seatLock != null && userId.HasValue && seatLock.UserId == userId && seatLock.SessionId == sessionId;
                var price = TicketPriceCalculator.ResolvePrice(
                    showtime, details.Hall.CinemaId, details.Hall.HallTypeId, seat.SeatTypeId,
                    seatType?.PriceModifier ?? 0, standardSeatTypeId, dayTypes, priceRules);
                var inactive = !seat.IsActive;
                var booked = !inactive && bookedSeatIds.Contains(seat.SeatId);
                var locked = !inactive && seatLock != null && !currentSession;
                return new ShowtimeDTO.SeatResponse
                {
                    SeatId = seat.SeatId,
                    HallId = seat.HallId,
                    SeatTypeId = seat.SeatTypeId,
                    SeatTypeName = seatType?.TypeName,
                    RowLabel = seat.RowLabel,
                    ColNumber = seat.ColNumber,
                    SeatCode = seat.SeatCode,
                    Price = price,
                    FinalPrice = price,
                    Status = inactive ? "maintenance" : booked ? "booked" : locked ? "locked" : "available",
                    IsActive = seat.IsActive,
                    IsBooked = booked,
                    IsLocked = locked,
                    IsLockedByCurrentSession = currentSession,
                    LockExpiresAt = seatLock?.ExpiresAt
                };
            }).ToList();
        }

        public async Task<List<Entities.Bookings.SeatLock>> LockSeatsAsync(
            int showtimeId, int userId, string sessionId, List<int> seatIds, int minutes)
        {
            var showtime = await context.ShowTimes.FirstOrDefaultAsync(x => x.ShowtimeId == showtimeId)
                ?? throw new InvalidOperationException("Showtime not found");
            if (string.Equals(showtime.Status, "cancelled", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(showtime.Status, "completed", StringComparison.OrdinalIgnoreCase) ||
                showtime.EndTime <= DateTime.Now)
                throw new InvalidOperationException("Showtime is not available");
            if (!await context.Halls.AsNoTracking().AnyAsync(x => x.HallId == showtime.HallId && x.Status.ToLower() == "active"))
                throw new InvalidOperationException("The hall is currently unavailable");
            if (!await context.Users.AnyAsync(x => x.UserId == userId && x.IsActive))
                throw new InvalidOperationException("User not found");

            var requested = seatIds.Distinct().ToList();
            var validSeatCount = await context.Seats.CountAsync(x =>
                requested.Contains(x.SeatId) && x.HallId == showtime.HallId && x.IsActive);
            if (validSeatCount != requested.Count)
                throw new InvalidOperationException("Some seats are invalid for this showtime");

            var now = DateTime.UtcNow;
            context.SeatLocks.RemoveRange(await context.SeatLocks.Where(x => x.ExpiresAt <= now).ToListAsync());
            var booked = await context.Tickets
                .Join(context.Bookings.Where(x => x.ShowtimeId == showtimeId && x.Status != "cancelled"),
                    ticket => ticket.BookingId, booking => booking.BookingId, (ticket, booking) => ticket.SeatId)
                .AnyAsync(x => requested.Contains(x));
            if (booked) throw new InvalidOperationException("Some seats are already booked");


            // point

            var conflict = await context.SeatLocks.AnyAsync(x =>
                x.ShowtimeId == showtimeId && requested.Contains(x.SeatId) && x.ExpiresAt > now &&
                (x.UserId != userId || x.SessionId != sessionId));
            if (conflict) throw new InvalidOperationException("Some seats are being held by another customer");

            var ownLocks = await context.SeatLocks
                .Where(x => x.ShowtimeId == showtimeId && x.UserId == userId && x.SessionId == sessionId).ToListAsync();
            context.SeatLocks.RemoveRange(ownLocks.Where(x => !requested.Contains(x.SeatId)));
            var expiresAt = now.AddMinutes(Math.Clamp(minutes, 1, 15));
            foreach (var seatId in requested)
            {
                var seatLock = ownLocks.FirstOrDefault(x => x.SeatId == seatId);
                if (seatLock == null)
                {
                    context.SeatLocks.Add(new Entities.Bookings.SeatLock
                    {
                        ShowtimeId = showtimeId,
                        SeatId = seatId,
                        UserId = userId,
                        SessionId = sessionId,
                        LockedAt = now,
                        ExpiresAt = expiresAt
                    });
                }
                else
                {
                    seatLock.LockedAt = now;
                    seatLock.ExpiresAt = expiresAt;
                }
            }

            try { await context.SaveChangesAsync(); }
            catch (DbUpdateException) { throw new InvalidOperationException("Some seats are no longer available"); }
            return await context.SeatLocks.AsNoTracking().Where(x =>
                x.ShowtimeId == showtimeId && x.UserId == userId && x.SessionId == sessionId && requested.Contains(x.SeatId))
                .ToListAsync();
        }

        public async Task UnlockSeatsAsync(int showtimeId, int userId, string sessionId)
        {
            var locks = await context.SeatLocks
                .Where(x => x.ShowtimeId == showtimeId && x.UserId == userId && x.SessionId == sessionId).ToListAsync();
            if (locks.Count == 0) return;
            context.SeatLocks.RemoveRange(locks);
            await context.SaveChangesAsync();
        }

        private async Task<(DateTime EndTime, string LanguageType, string Status, string? Error)> PrepareShowtimeAsync(ShowtimeDTO.ShowtimeRequest dto, int? currentShowtimeId)
        {
            var movie = await context.Movies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == dto.MovieId);
            if (movie == null)
            {
                return (default, "", "", "Selected movie does not exist");
            }

            var hall = await context.Halls.AsNoTracking().FirstOrDefaultAsync(x => x.HallId == dto.HallId);
            if (hall == null)
            {
                return (default, "", "", "Selected hall does not exist");
            }

            if (!string.Equals(hall.Status, "active", StringComparison.OrdinalIgnoreCase))
            {
                return (default, "", "", "Selected hall is not active");
            }

            if (dto.StartTime == default)
            {
                return (default, "", "", "Start time is required");
            }

            var endTime = dto.EndTime ?? dto.StartTime.AddMinutes(movie.DurationMins);
            if (endTime <= dto.StartTime)
            {
                return (default, "", "", "End time must be after start time");
            }

            var cinema = await context.Cinemas.AsNoTracking().FirstOrDefaultAsync(x => x.CinemaId == hall.CinemaId);
            if (cinema == null)
            {
                return (default, "", "", "Selected cinema does not exist");
            }

            if (dto.StartTime.TimeOfDay < cinema.OpeningTime || endTime.TimeOfDay > cinema.ClosingTime)
            {
                return (default, "", "", $"Showtime must be within cinema operating hours {cinema.OpeningTime:hh\\:mm}-{cinema.ClosingTime:hh\\:mm}");
            }

            var status = NormalizeStatus(dto.Status);
            if (!AllowedStatuses.Contains(status))
            {
                return (default, "", "", "Showtime status is invalid");
            }

            var languageType = NormalizeLanguageType(dto.LanguageType);
            if (!AllowedLanguageTypes.Contains(languageType))
            {
                return (default, "", "", "Language type is invalid");
            }

            if (!string.Equals(status, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                var hasOverlap = await context.ShowTimes.AnyAsync(x =>
                    x.HallId == dto.HallId &&
                    (!currentShowtimeId.HasValue || x.ShowtimeId != currentShowtimeId.Value) &&
                    x.Status.ToLower() != "cancelled" &&
                    x.StartTime < endTime &&
                    dto.StartTime < x.EndTime);

                if (hasOverlap)
                {
                    return (default, "", "", "Phòng chiếu đã có suất khác trong khoảng thời gian này");
                }
            }

            return (endTime, languageType, status, null);
        }

        private async Task AcquireHallScheduleLockAsync(int hallId)
        {
            if (!context.Database.IsSqlServer())
            {
                return;
            }

            var currentTransaction = context.Database.CurrentTransaction
                ?? throw new InvalidOperationException("A schedule transaction is required");
            var connection = context.Database.GetDbConnection();

            await using var command = connection.CreateCommand();
            command.Transaction = currentTransaction.GetDbTransaction();
            command.CommandText = """
                DECLARE @result int;
                EXEC @result = sys.sp_getapplock
                    @Resource = @resource,
                    @LockMode = 'Exclusive',
                    @LockOwner = 'Transaction',
                    @LockTimeout = 10000;
                SELECT @result;
                """;

            var resourceParameter = command.CreateParameter();
            resourceParameter.ParameterName = "@resource";
            resourceParameter.Value = $"showtime-hall:{hallId}";
            command.Parameters.Add(resourceParameter);

            var result = Convert.ToInt32(await command.ExecuteScalarAsync());
            if (result < 0)
            {
                throw new ArgumentException("Phòng chiếu đang được cập nhật lịch. Vui lòng thử lại");
            }
        }

        private async Task<List<ShowtimeDTO.ShowtimeResponse>> ToResponsesAsync<T>(List<T> rows)
        {
            var items = rows.Select(row => new
            {
                Showtime = (ShowTime)row!.GetType().GetProperty("showtime")!.GetValue(row)!,
                Movie = (Movie)row.GetType().GetProperty("movie")!.GetValue(row)!,
                Hall = (Hall)row.GetType().GetProperty("hall")!.GetValue(row)!,
                Cinema = (Cinema)row.GetType().GetProperty("cinema")!.GetValue(row)!,
                HallType = (HallType?)row.GetType().GetProperty("hallType")!.GetValue(row)
            }).ToList();

            if (items.Count == 0)
            {
                return [];
            }

            var showtimeIds = items.Select(x => x.Showtime.ShowtimeId).ToList();
            var bookedSeatCounts = await context.Tickets
                .AsNoTracking()
                .Join(
                    context.Bookings.AsNoTracking().Where(x => showtimeIds.Contains(x.ShowtimeId) && x.Status != "cancelled"),
                    ticket => ticket.BookingId,
                    booking => booking.BookingId,
                    (ticket, booking) => new { booking.ShowtimeId, ticket.SeatId })
                .Distinct()
                .GroupBy(x => x.ShowtimeId)
                .Select(x => new { ShowtimeId = x.Key, Count = x.Count() })
                .ToDictionaryAsync(x => x.ShowtimeId, x => x.Count);

            var cinemaIds = items.Select(x => x.Cinema.CinemaId).Distinct().ToList();
            var hallTypeIds = items.Select(x => x.Hall.HallTypeId).Distinct().ToList();
            var hallIds = items.Select(x => x.Hall.HallId).Distinct().ToList();
            var minShowDate = items.Min(x => x.Showtime.StartTime.Date);
            var maxShowDate = items.Max(x => x.Showtime.StartTime.Date);
            var dayTypes = await context.DayTypes.AsNoTracking().ToListAsync();
            var standardSeatTypeId = await ResolveStandardSeatTypeIdAsync();
            var activeHallSeats = await context.Seats
                .AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId) && x.IsActive)
                .Select(x => new { x.HallId, x.SeatTypeId })
                .ToListAsync();
            var seatTypeIds = activeHallSeats
                .Select(x => x.SeatTypeId)
                .Append(standardSeatTypeId)
                .Distinct()
                .ToList();
            var seatTypes = await context.SeatTypes
                .AsNoTracking()
                .Where(x => seatTypeIds.Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId);
            var seatTypeIdsByHall = activeHallSeats
                .GroupBy(x => x.HallId)
                .ToDictionary(
                    x => x.Key,
                    x => x.Select(seat => seat.SeatTypeId).Distinct().ToList());
            var priceRules = await context.TicketPrices
                .AsNoTracking()
                .Where(x =>
                    cinemaIds.Contains(x.CinemaId) &&
                    hallTypeIds.Contains(x.HallTypeId) &&
                    seatTypeIds.Contains(x.SeatTypeId) &&
                    x.EffectiveFrom.Date <= maxShowDate &&
                    (!x.EffectiveTo.HasValue || x.EffectiveTo.Value.Date >= minShowDate))
                .ToListAsync();

            var now = DateTime.Now;

            return items.Select(item =>
            {
                var bookedSeats = bookedSeatCounts.GetValueOrDefault(item.Showtime.ShowtimeId);
                var totalSeats = item.Hall.TotalSeats;
                var availableSeats = Math.Max(totalSeats - bookedSeats, 0);
                var effectiveStatus = ResolveEffectiveStatus(item.Showtime, now);
                var hallSeatTypeIds = seatTypeIdsByHall.TryGetValue(item.Hall.HallId, out var configuredSeatTypeIds) &&
                    configuredSeatTypeIds.Count > 0
                        ? configuredSeatTypeIds
                        : [standardSeatTypeId];
                var basePrice = hallSeatTypeIds
                    .Select(seatTypeId =>
                    {
                        seatTypes.TryGetValue(seatTypeId, out var seatType);
                        return TicketPriceCalculator.ResolvePrice(
                            item.Showtime,
                            item.Cinema.CinemaId,
                            item.Hall.HallTypeId,
                            seatTypeId,
                            seatType?.PriceModifier ?? 0,
                            standardSeatTypeId,
                            dayTypes,
                            priceRules);
                    })
                    .DefaultIfEmpty(TicketPriceCalculator.DefaultBasePrice)
                    .Min();
                var summary = new ShowtimeDTO.ShowtimeSummary
                {
                    ShowtimeId = item.Showtime.ShowtimeId,
                    MovieId = item.Showtime.MovieId,
                    HallId = item.Showtime.HallId,
                    StartTime = item.Showtime.StartTime,
                    EndTime = item.Showtime.EndTime,
                    LanguageType = item.Showtime.LanguageType,
                    IsSpecial = item.Showtime.IsSpecial,
                    Status = effectiveStatus,
                    BasePrice = basePrice,
                    TotalSeats = totalSeats,
                    AvailableSeats = availableSeats
                };

                return new ShowtimeDTO.ShowtimeResponse
                {
                    ShowtimeId = summary.ShowtimeId,
                    MovieId = summary.MovieId,
                    HallId = summary.HallId,
                    StartTime = summary.StartTime,
                    EndTime = summary.EndTime,
                    LanguageType = summary.LanguageType,
                    IsSpecial = summary.IsSpecial,
                    Status = summary.Status,
                    BasePrice = summary.BasePrice,
                    TotalSeats = summary.TotalSeats,
                    AvailableSeats = summary.AvailableSeats,
                    Showtime = summary,
                    Movie = new MovieDTO.MovieResponse
                    {
                        MovieId = item.Movie.MovieId,
                        Title = item.Movie.Title,
                        TitleEn = item.Movie.TitleEn,
                        CountryId = item.Movie.CountryId,
                        DurationMins = item.Movie.DurationMins,
                        ReleaseDate = item.Movie.ReleaseDate,
                        EndDate = item.Movie.EndDate,
                        AgeRating = item.Movie.AgeRating,
                        Status = item.Movie.Status,
                        Synopsis = item.Movie.Synopsis,
                        Director = item.Movie.Director,
                        CastMembers = item.Movie.CastMembers,
                        Language = item.Movie.Language,
                        Subtitle = item.Movie.Subtitle,
                        PosterUrl = item.Movie.PosterUrl,
                        BannerUrl = item.Movie.BannerUrl,
                        TrailerUrl = item.Movie.TrailerUrl,
                        ImdbRating = item.Movie.ImdbRating
                    },
                    Hall = new HallDTO.HallResponse
                    {
                        HallId = item.Hall.HallId,
                        CinemaId = item.Hall.CinemaId,
                        CinemaName = item.Cinema.CinemaName,
                        CinemaCity = item.Cinema.City,
                        HallTypeId = item.Hall.HallTypeId,
                        HallTypeName = item.HallType?.TypeName,
                        HallName = item.Hall.HallName,
                        Name = item.Hall.HallName,
                        TotalRows = item.Hall.TotalRows,
                        TotalCols = item.Hall.TotalCols,
                        TotalSeats = item.Hall.TotalSeats,
                        ActiveSeatCount = item.Hall.TotalSeats,
                        Status = NormalizeStatus(item.Hall.Status)
                    },
                    Cinema = new CinemaDTO.CinemaResponse
                    {
                        CinemaId = item.Cinema.CinemaId,
                        ChainId = item.Cinema.ChainId,
                        CinemaName = item.Cinema.CinemaName,
                        Address = item.Cinema.Address,
                        City = item.Cinema.City,
                        Ward = item.Cinema.District,
                        Phone = item.Cinema.Phone,
                        Email = item.Cinema.Email,
                        MapUrl = item.Cinema.MapUrl,
                        ImageUrl = item.Cinema.ImageUrl,
                        IsActive = item.Cinema.IsActive
                    }
                };
            }).ToList();
        }

        private async Task<byte> ResolveStandardSeatTypeIdAsync()
        {
            var standardSeatType = await context.SeatTypes
                .AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .FirstOrDefaultAsync(x => x.TypeName.ToLower().Contains("standard"));

            if (standardSeatType != null)
            {
                return standardSeatType.SeatTypeId;
            }

            return await context.SeatTypes
                .AsNoTracking()
                .OrderBy(x => x.SeatTypeId)
                .Select(x => x.SeatTypeId)
                .FirstOrDefaultAsync();
        }

        private static string NormalizeStatus(string? status)
        {
            var trimmed = status?.Trim();
            if (string.IsNullOrWhiteSpace(trimmed))
            {
                return "scheduled";
            }

            return trimmed.ToLowerInvariant() switch
            {
                "upcoming" => "scheduled",
                "showing" => "selling",
                "ended" => "completed",
                _ => trimmed.ToLowerInvariant()
            };
        }

        private static string NormalizeLanguageType(string? languageType)
        {
            var trimmed = languageType?.Trim();
            return string.IsNullOrWhiteSpace(trimmed) ? "subtitled" : trimmed;
        }

        private static string ResolveEffectiveStatus(ShowTime showtime, DateTime now)
        {
            if (string.Equals(showtime.Status, "cancelled", StringComparison.OrdinalIgnoreCase))
            {
                return "cancelled";
            }

            if (string.Equals(showtime.Status, "completed", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(showtime.Status, "ended", StringComparison.OrdinalIgnoreCase))
            {
                return "ended";
            }

            if (showtime.EndTime <= now)
            {
                return "ended";
            }

            if (string.Equals(showtime.Status, "selling", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(showtime.Status, "showing", StringComparison.OrdinalIgnoreCase))
            {
                return "showing";
            }

            return showtime.StartTime <= now ? "showing" : "upcoming";
        }

        private static int RowLabelToNumber(string? rowLabel)
        {
            var value = 0;
            foreach (var character in rowLabel?.Trim().ToUpperInvariant() ?? "")
            {
                if (character < 'A' || character > 'Z') return int.MaxValue;
                value = (value * 26) + character - 'A' + 1;
            }

            return value == 0 ? int.MaxValue : value;
        }
    }
}
