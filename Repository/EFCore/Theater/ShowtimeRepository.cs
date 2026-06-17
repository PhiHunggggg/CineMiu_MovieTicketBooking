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
            var result = await GetShowtimesPageAsync(
                keyword,
                movieId,
                cinemaId,
                hallId,
                date,
                status,
                1,
                int.MaxValue,
                upcomingOnly);
            return result.Items;
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

            if (!string.IsNullOrWhiteSpace(status))
            {
                var normalizedStatus = status.Trim().ToLower();
                var now = DateTime.Now;

                query = normalizedStatus switch
                {
                    "upcoming" => query.Where(x =>
                        x.showtime.Status != "cancelled" &&
                        x.showtime.Status != "completed" &&
                        x.showtime.Status != "selling" &&
                        x.showtime.StartTime > now),
                    "showing" => query.Where(x =>
                        x.showtime.Status != "cancelled" &&
                        x.showtime.Status != "completed" &&
                        x.showtime.EndTime > now &&
                        (x.showtime.Status == "selling" || x.showtime.StartTime <= now)),
                    "ended" => query.Where(x =>
                        x.showtime.Status != "cancelled" &&
                        (x.showtime.Status == "completed" || x.showtime.EndTime <= now)),
                    "cancelled" => query.Where(x => x.showtime.Status == "cancelled"),
                    _ => query.Where(x => x.showtime.Status == normalizedStatus)
                };
            }

            if (upcomingOnly)
            {
                var now = DateTime.Now;
                query = query.Where(x =>
                    x.showtime.EndTime > now &&
                    x.showtime.Status != "cancelled" &&
                    x.showtime.Status != "completed");
            }

            var totalCount = await query.CountAsync();
            var rows = await query
                .OrderByDescending(x => x.showtime.StartTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

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
            IDbContextTransaction? transaction = null;

            try
            {
                if (context.Database.IsRelational())
                {
                    transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                }

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

                if (transaction != null)
                {
                    await transaction.CommitAsync();
                }

                return showtime.ShowtimeId;
            }
            catch
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (transaction != null)
                {
                    await transaction.DisposeAsync();
                }
            }
        }

        public async Task UpdateAsync(int showtimeId, ShowtimeDTO.ShowtimeRequest showtimeRequest)
        {
            IDbContextTransaction? transaction = null;

            try
            {
                if (context.Database.IsRelational())
                {
                    transaction = await context.Database.BeginTransactionAsync(IsolationLevel.Serializable);
                }

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

                if (transaction != null)
                {
                    await transaction.CommitAsync();
                }
            }
            catch
            {
                if (transaction != null)
                {
                    await transaction.RollbackAsync();
                }

                throw;
            }
            finally
            {
                if (transaction != null)
                {
                    await transaction.DisposeAsync();
                }
            }
        }

        public async Task DeleteAsync(int showtimeId)
        {
            var showtime = await context.ShowTimes.FirstOrDefaultAsync(x => x.ShowtimeId == showtimeId);
            if (showtime == null)
            {
                throw new ArgumentException("Showtime not found");
            }

            if (await context.Bookings.AnyAsync(x => x.ShowtimeId == showtimeId))
            {
                throw new ArgumentException("Cannot delete showtime because it already has bookings");
            }

            context.ShowTimes.Remove(showtime);
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
                    x.Status != "cancelled" &&
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
            var dayTypes = await context.DayTypes.AsNoTracking().ToListAsync();
            var standardSeatTypeId = await ResolveStandardSeatTypeIdAsync();
            var priceRules = await context.TicketPrices
                .AsNoTracking()
                .Where(x =>
                    cinemaIds.Contains(x.CinemaId) &&
                    hallTypeIds.Contains(x.HallTypeId) &&
                    x.SeatTypeId == standardSeatTypeId)
                .ToListAsync();

            var now = DateTime.Now;

            return items.Select(item =>
            {
                var bookedSeats = bookedSeatCounts.GetValueOrDefault(item.Showtime.ShowtimeId);
                var totalSeats = item.Hall.TotalSeats;
                var availableSeats = Math.Max(totalSeats - bookedSeats, 0);
                var effectiveStatus = ResolveEffectiveStatus(item.Showtime, now);
                var basePrice = TicketPriceCalculator.ResolvePrice(
                    item.Showtime,
                    item.Cinema.CinemaId,
                    item.Hall.HallTypeId,
                    standardSeatTypeId,
                    0,
                    standardSeatTypeId,
                    dayTypes,
                    priceRules);
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
                        Status = item.Hall.Status
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
    }
}
