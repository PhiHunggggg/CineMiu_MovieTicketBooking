using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class MovieRepository(SqlServerDbContext context) : IMovieRepository
    {
        public async Task<List<MovieDTO.GenreResponse>> GetGenresAsync()
        {
            return await context.Genres
                .AsNoTracking()
                .OrderBy(x => x.GenreId)
                .Select(x => new MovieDTO.GenreResponse
                {
                    GenreId = (int)x.GenreId,
                    GenreName = x.GenreName
                })
                .ToListAsync();
        }

        public async Task<List<MovieDTO.MovieResponse>> GetAllMoviesAsync(
            string? keyword,
            IReadOnlyCollection<string> statusAliases,
            int? cinemaId)
        {
            var query = context.Movies.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                keyword = keyword.Trim();
                query = query.Where(m => m.Title.Contains(keyword) || (m.TitleEn != null && m.TitleEn.Contains(keyword)));
            }

            if (statusAliases.Count > 0)
            {
                query = query.Where(x => x.Status != null && statusAliases.Contains(x.Status));
            }

            if (cinemaId.HasValue)
            {
                var movieIds = context.ShowTimes
                    .Join(context.Halls, showtime => showtime.HallId, hall => hall.HallId,
                        (showtime, hall) => new { showtime.MovieId, hall.CinemaId })
                    .Where(x => x.CinemaId == cinemaId.Value)
                    .Select(x => x.MovieId)
                    .Distinct();
                query = query.Where(x => movieIds.Contains(x.MovieId));
            }
            var movies = await query.OrderByDescending(x => x.ReleaseDate).ToListAsync();
            var movieIdsList = movies.Select(m => m.MovieId).ToList();
            var movieGenres = await context.MovieGenres
                .AsNoTracking()
                .Where(mg => movieIdsList.Contains(mg.MovieId))
                .Join(context.Genres, mg => mg.GenreId, g => g.GenreId, (mg, g) => new { mg.MovieId, GenreId = (int)g.GenreId, g.GenreName })
                .ToListAsync();
            var genreIdsLookup = movieGenres.ToLookup(mg => mg.MovieId, mg => mg.GenreId);
            var genreNamesLookup = movieGenres.ToLookup(mg => mg.MovieId, mg => mg.GenreName);
            var items = movies.Select(x => new MovieDTO.MovieResponse
            {
                MovieId = x.MovieId,
                Title = x.Title,
                TitleEn = x.TitleEn,
                CountryId = x.CountryId,
                DurationMins = x.DurationMins,
                ReleaseDate = x.ReleaseDate,
                EndDate = x.EndDate,
                AgeRating = x.AgeRating,
                Synopsis = x.Synopsis,
                Director = x.Director,
                CastMembers = x.CastMembers,
                Language = x.Language,
                Subtitle = x.Subtitle,
                PosterUrl = x.PosterUrl,
                BannerUrl = x.BannerUrl,
                TrailerUrl = x.TrailerUrl,
                ImdbRating = x.ImdbRating,
                Status = NormalizeStatusForClient(x.Status),

                GenreIds = genreIdsLookup[x.MovieId].ToList(),
                Genres = genreNamesLookup[x.MovieId].ToList()
            }).ToList();

            return items;
        }
        public async Task<MovieDTO.MovieDetailResponse> GetMovieByIdAsync(int movieId)
        {
            var movie = await context.Movies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }
            var genreIds = await context.MovieGenres
                .AsNoTracking()
                .Where(mg => mg.MovieId == movieId)
                .Select(mg => (int)mg.GenreId)
                .ToListAsync();
            var genres = await context.MovieGenres
                .AsNoTracking()
                .Where(mg => mg.MovieId == movieId)
                .Join(context.Genres, mg => mg.GenreId, g => g.GenreId, (_, g) => g.GenreName)
                .ToListAsync();
            var movieResponse = new MovieDTO.MovieResponse
            {
                MovieId = movie.MovieId,
                Title = movie.Title,
                TitleEn = movie.TitleEn,
                CountryId = movie.CountryId,
                DurationMins = movie.DurationMins,
                ReleaseDate = movie.ReleaseDate,
                EndDate = movie.EndDate,
                AgeRating = movie.AgeRating,
                Synopsis = movie.Synopsis,
                Director = movie.Director,
                CastMembers = movie.CastMembers,
                Language = movie.Language,
                Subtitle = movie.Subtitle,
                PosterUrl = movie.PosterUrl,
                BannerUrl = movie.BannerUrl,
                TrailerUrl = movie.TrailerUrl,
                ImdbRating = movie.ImdbRating,
                Status = NormalizeStatusForClient(movie.Status),
                GenreIds = genreIds,
                Genres = genres
            };

            return new MovieDTO.MovieDetailResponse
            {
                Movie = movieResponse,
                GenreIds = genreIds,
                Genres = genres
            };
        }

        public async Task<MovieDTO.MovieResponse> CreateAsync(MovieDTO.MovieRequest movieRequest)
        {
            var validationError = await ValidateMovieDto(movieRequest);
            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }

            var movie = new Movie
            {
                Title = movieRequest.Title,
                TitleEn = movieRequest.TitleEn,
                CountryId = movieRequest.CountryId,
                DurationMins = movieRequest.DurationMins,
                ReleaseDate = movieRequest.ReleaseDate,
                EndDate = movieRequest.EndDate,
                AgeRating = movieRequest.AgeRating,
                Status = movieRequest.Status,
                Synopsis = movieRequest.Synopsis,
                Director = movieRequest.Director,
                CastMembers = movieRequest.CastMembers,
                Language = movieRequest.Language,
                Subtitle = movieRequest.Subtitle,
                PosterUrl = movieRequest.PosterUrl,
                BannerUrl = movieRequest.BannerUrl,
                TrailerUrl = movieRequest.TrailerUrl,
                ImdbRating = movieRequest.ImdbRating,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            context.Movies.Add(movie);
            await context.SaveChangesAsync();

            if (movieRequest.GenreIds != null && movieRequest.GenreIds.Count > 0)
            {
                var movieGenres = movieRequest.GenreIds.Distinct().Select(genreId => new MovieGenre
                {
                    MovieId = movie.MovieId,
                    GenreId = (byte)genreId
                }).ToList();

                context.MovieGenres.AddRange(movieGenres);
                await context.SaveChangesAsync();
            }

            return (await GetMovieByIdAsync(movie.MovieId)).Movie;
        }

        public async Task<MovieDTO.MovieResponse> UpdateAsync(int movieId, MovieDTO.MovieRequest dto)
        {
            var validationError = await ValidateMovieDto(dto);

            if (validationError != null)
            {
                throw new ArgumentException(validationError);
            }
            var movie = await context.Movies.FirstOrDefaultAsync(x => x.MovieId == movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }

            movie.Title = dto.Title;
            movie.TitleEn = dto.TitleEn;
            movie.CountryId = dto.CountryId;
            movie.DurationMins = dto.DurationMins;
            movie.ReleaseDate = dto.ReleaseDate;
            movie.EndDate = dto.EndDate;
            movie.AgeRating = dto.AgeRating;
            movie.Status = dto.Status;
            movie.Synopsis = dto.Synopsis;
            movie.Director = dto.Director;
            movie.CastMembers = dto.CastMembers;
            movie.Language = dto.Language;
            movie.Subtitle = dto.Subtitle;
            movie.PosterUrl = dto.PosterUrl;
            movie.BannerUrl = dto.BannerUrl;
            movie.TrailerUrl = dto.TrailerUrl;
            movie.ImdbRating = dto.ImdbRating;
            movie.UpdatedAt = DateTime.UtcNow;

            // Cập nhật thể loại phim
            if(dto.GenreIds != null) 
            {
                var existingGenres = await context.MovieGenres.Where(mg => mg.MovieId == movieId).ToListAsync();
                context.MovieGenres.RemoveRange(existingGenres);
                var newMovieGenres = dto.GenreIds.Distinct().Select(genreId => new MovieGenre
                {
                    MovieId = movieId,
                    GenreId = (byte)genreId
                }).ToList();
                context.MovieGenres.AddRange(newMovieGenres);
            }
            await context.SaveChangesAsync();

            return (await GetMovieByIdAsync(movieId)).Movie;
        }
        public async Task DeleteAsync(int movieId)
        {
            var movie = await context.Movies.FirstOrDefaultAsync(x => x.MovieId == movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }

            if (await context.ShowTimes.AnyAsync(x => x.MovieId == movieId))
            {
                throw new InvalidOperationException("Cannot delete movie because it has showtimes");
            }

            var movieGenres = await context.MovieGenres.Where(x => x.MovieId == movieId).ToListAsync();
            context.MovieGenres.RemoveRange(movieGenres);
            context.Movies.Remove(movie);
            await context.SaveChangesAsync();
        }

        private static string[] GetStatusAliases(string status)
        {
            return status.Trim().ToLowerInvariant() switch
            {
                "now_showing" or "nowshowing" => ["NowShowing", "now_showing", "nowshowing"],
                "coming_soon" or "comingsoon" => ["ComingSoon", "coming_soon", "comingsoon"],
                "ended" => ["Ended", "ended"],
                _ => [status.Trim()]
            };
        }

        private static string? NormalizeStatusForClient(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return status;

            return status.Trim().ToLowerInvariant() switch
            {
                "now_showing" or "nowshowing" => "now_showing",
                "coming_soon" or "comingsoon" => "coming_soon",
                "ended" => "ended",
                _ => status
            };
        }
        // Thêm, sửa, xóa phim sẽ cần thêm các phương thức tương ứng ở đây, ví dụ:
        private async Task<string?> ValidateMovieDto(MovieDTO.MovieRequest dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
            {
                return "Movie title is required";
            }

            if (dto.DurationMins <= 0)
            {
                return "Movie duration must be greater than zero";
            }

            if (dto.ImdbRating.HasValue && (dto.ImdbRating < 0 || dto.ImdbRating > 10))
            {
                return "IMDb rating must be between 0 and 10";
            }

            if (dto.CountryId.HasValue && !await context.Countries.AnyAsync(x => x.CountryId == dto.CountryId.Value))
            {
                return "Selected country does not exist";
            }

            if (dto.GenreIds?.Count > 0)
            {
                var genreIds = dto.GenreIds.Distinct().ToList();
                if (genreIds.Any(x => x < byte.MinValue || x > byte.MaxValue))
                {
                    return "One or more selected genres do not exist";
                }

                var genreBytes = genreIds.Select(x => (byte)x).ToList();
                var existingCount = await context.Genres.CountAsync(x => genreBytes.Contains(x.GenreId));
                if (existingCount != genreIds.Count)
                {
                    return "One or more selected genres do not exist";
                }
            }

            return null;
        }
    }
}
