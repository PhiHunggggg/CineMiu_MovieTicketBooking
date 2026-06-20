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
        public async Task<Paging.PaginationResponse<ShowtimeDTO.ShowtimeResponse>> GetAllShowtimesAsync(string? keyword, int? movieId, int? cinemaId, int? hallId, DateTime? date, string? status, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var showtimes = await showtimeRepository.GetAllShowtimesAsync(keyword, movieId, cinemaId, hallId, date, status);
            var totalCount = showtimes.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);
            var items = showtimes.Skip((page - 1) * pageSize).Take(pageSize).ToList();

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
            var results = await GetAllShowtimesAsync(null, movieId, cinemaId, null, date, null, 1, 1000);
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
                null, null, null, null, null, null);
            return responses.Where(x => createdIds.Contains(x.ShowtimeId)).ToList();
        }

        public async Task<ShowtimeDTO.ShowtimeResponse?> GetShowtimeDetailsAsync(int id)
        {
            try
            {
                return await GetShowtimeByIdAsync(id);
            }
            catch
            {
                return null;
            }
        }

        public async Task<List<object>> LockSeatsAsync(int id, int userId, string sessionId, List<int> seatIds, int minutes)
        {
            var showtime = await context.ShowTimes.FirstOrDefaultAsync(x => x.ShowtimeId == id);
            if (showtime == null)
            {
                throw new InvalidOperationException("Showtime not found");
            }

            if (showtime.Status == "cancelled" || showtime.EndTime <= DateTime.Now)
            {
                throw new InvalidOperationException("Showtime is not available");
            }

            if (!await context.Users.AnyAsync(x => x.UserId == userId && x.IsActive))
            {
                throw new InvalidOperationException("User not found");
            }

            var requestedSeatIds = seatIds.Distinct().ToList();
            var seats = await context.Seats
                .Where(x => requestedSeatIds.Contains(x.SeatId) && x.HallId == showtime.HallId && x.IsActive)
                .ToListAsync();
            if (seats.Count != requestedSeatIds.Count)
            {
                throw new InvalidOperationException("Some seats are invalid for this showtime");
            }

            var now = DateTime.UtcNow;
            var expiredLocks = await context.SeatLocks
                .Where(x => x.ExpiresAt <= now)
                .ToListAsync();
            context.SeatLocks.RemoveRange(expiredLocks);

            var bookedSeatIds = await context.Tickets
                .Join(
                    context.Bookings.Where(x => x.ShowtimeId == id && x.Status != "cancelled"),
                    ticket => ticket.BookingId,
                    booking => booking.BookingId,
                    (ticket, booking) => ticket.SeatId)
                .Where(x => requestedSeatIds.Contains(x))
                .Distinct()
                .ToListAsync();
            if (bookedSeatIds.Count > 0)
            {
                throw new InvalidOperationException("Some seats are already booked");
            }

            var conflictingLocks = await context.SeatLocks
                .Where(x => x.ShowtimeId == id &&
                            requestedSeatIds.Contains(x.SeatId) &&
                            x.ExpiresAt > now &&
                            (x.UserId != userId || x.SessionId != sessionId))
                .Select(x => x.SeatId)
                .ToListAsync();
            if (conflictingLocks.Count > 0)
            {
                throw new InvalidOperationException("Some seats are being held by another customer");
            }

            var ownLocks = await context.SeatLocks
                .Where(x => x.ShowtimeId == id && x.UserId == userId && x.SessionId == sessionId)
                .ToListAsync();
            context.SeatLocks.RemoveRange(ownLocks.Where(x => !requestedSeatIds.Contains(x.SeatId)));

            var expiresAt = now.AddMinutes(Math.Clamp(minutes, 1, 15));
            foreach (var seatId in requestedSeatIds)
            {
                var seatLock = ownLocks.FirstOrDefault(x => x.SeatId == seatId);
                if (seatLock == null)
                {
                    seatLock = new Entities.Bookings.SeatLock
                    {
                        ShowtimeId = id,
                        SeatId = seatId,
                        UserId = userId,
                        SessionId = sessionId,
                        LockedAt = now,
                        ExpiresAt = expiresAt
                    };
                    context.SeatLocks.Add(seatLock);
                }
                else
                {
                    seatLock.LockedAt = now;
                    seatLock.ExpiresAt = expiresAt;
                }
            }

            try
            {
                await context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                throw new InvalidOperationException("Some seats are no longer available");
            }

            return ownLocks
                .Where(x => requestedSeatIds.Contains(x.SeatId))
                .Cast<object>()
                .Concat(context.SeatLocks.Local
                    .Where(x => x.ShowtimeId == id &&
                                x.UserId == userId &&
                                x.SessionId == sessionId &&
                                requestedSeatIds.Contains(x.SeatId))
                    .Cast<object>())
                .Distinct()
                .ToList();
        }

        public async Task UnlockSeatsAsync(int id, int userId, string sessionId)
        {
            var locks = await context.SeatLocks
                .Where(x => x.ShowtimeId == id && x.UserId == userId && x.SessionId == sessionId)
                .ToListAsync();
            if (locks.Count == 0)
            {
                return;
            }

            context.SeatLocks.RemoveRange(locks);
            await context.SaveChangesAsync();
        }
    }
}
