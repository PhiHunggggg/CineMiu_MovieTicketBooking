using DTO.Theater;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class MovieRepository(SqlServerDbContext context) : IMovieRepository
    {
        public Task<List<MovieDTO.GenreResponse>> GetGenresAsync() => context.Genres.AsNoTracking()
            .OrderBy(x => x.GenreId)
            .Select(x => new MovieDTO.GenreResponse { GenreId = x.GenreId, GenreName = x.GenreName })
            .ToListAsync();

        public async Task<List<MovieDTO.MovieResponse>> GetAllMoviesAsync(
            string? keyword,
            IReadOnlyCollection<string> statusAliases,
            int? cinemaId)
        {
            var query = context.Movies.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var value = keyword.Trim();
                query = query.Where(x => x.Title.Contains(value) || (x.TitleEn != null && x.TitleEn.Contains(value)));
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
            return await MapMoviesAsync(movies);
        }

        public async Task<MovieDTO.MovieDetailResponse> GetMovieByIdAsync(int movieId)
        {
            var movie = await context.Movies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == movieId)
                ?? throw new KeyNotFoundException("Movie not found");
            var response = (await MapMoviesAsync([movie])).Single();
            var genreIds = await context.MovieGenres.AsNoTracking()
                .Where(x => x.MovieId == movieId)
                .Select(x => x.GenreId)
                .ToListAsync();
            return new MovieDTO.MovieDetailResponse { Movie = response, GenreIds = genreIds };
        }

        public async Task<MovieDTO.MovieResponse> CreateAsync(MovieDTO.MovieRequest request)
        {
            await ValidateMovieAsync(request);
            var now = DateTime.UtcNow;
            var movie = new Movie
            {
                Title = request.Title,
                TitleEn = request.TitleEn,
                CountryId = request.CountryId,
                DurationMins = request.DurationMins,
                ReleaseDate = request.ReleaseDate,
                EndDate = request.EndDate,
                AgeRating = request.AgeRating ?? "P",
                Status = request.Status ?? "ComingSoon",
                Synopsis = request.Synopsis,
                Director = request.Director,
                CastMembers = request.CastMembers,
                Language = request.Language,
                Subtitle = request.Subtitle,
                PosterUrl = request.PosterUrl,
                BannerUrl = request.BannerUrl,
                TrailerUrl = request.TrailerUrl,
                ImdbRating = request.ImdbRating,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.Movies.Add(movie);
            await context.SaveChangesAsync();
            await ReplaceGenresAsync(movie.MovieId, request.GenreIds);
            return (await GetMovieByIdAsync(movie.MovieId)).Movie;
        }

        public async Task<MovieDTO.MovieResponse> UpdateAsync(int movieId, MovieDTO.MovieRequest request)
        {
            await ValidateMovieAsync(request);
            var movie = await context.Movies.FirstOrDefaultAsync(x => x.MovieId == movieId)
                ?? throw new KeyNotFoundException("Movie not found");

            movie.Title = request.Title;
            movie.TitleEn = request.TitleEn;
            movie.CountryId = request.CountryId;
            movie.DurationMins = request.DurationMins;
            movie.ReleaseDate = request.ReleaseDate;
            movie.EndDate = request.EndDate;
            movie.AgeRating = request.AgeRating ?? movie.AgeRating;
            movie.Status = request.Status ?? movie.Status;
            movie.Synopsis = request.Synopsis;
            movie.Director = request.Director;
            movie.CastMembers = request.CastMembers;
            movie.Language = request.Language;
            movie.Subtitle = request.Subtitle;
            movie.PosterUrl = request.PosterUrl;
            movie.BannerUrl = request.BannerUrl;
            movie.TrailerUrl = request.TrailerUrl;
            movie.ImdbRating = request.ImdbRating;
            movie.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
            await ReplaceGenresAsync(movieId, request.GenreIds);
            return (await GetMovieByIdAsync(movieId)).Movie;
        }

        public async Task DeleteAsync(int movieId)
        {
            var movie = await context.Movies.FirstOrDefaultAsync(x => x.MovieId == movieId)
                ?? throw new KeyNotFoundException("Movie not found");
            if (await context.ShowTimes.AnyAsync(x => x.MovieId == movieId))
            {
                throw new ArgumentException("Cannot delete movie because it has showtimes");
            }

            context.MovieGenres.RemoveRange(context.MovieGenres.Where(x => x.MovieId == movieId));
            context.Movies.Remove(movie);
            await context.SaveChangesAsync();
        }

        private async Task ReplaceGenresAsync(int movieId, IEnumerable<byte>? genreIds)
        {
            context.MovieGenres.RemoveRange(context.MovieGenres.Where(x => x.MovieId == movieId));
            if (genreIds != null)
            {
                context.MovieGenres.AddRange(genreIds.Distinct().Select(genreId => new MovieGenre
                {
                    MovieId = movieId,
                    GenreId = genreId
                }));
            }
            await context.SaveChangesAsync();
        }

        private async Task ValidateMovieAsync(MovieDTO.MovieRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Title))
                throw new ArgumentException("Movie title is required");
            if (request.DurationMins <= 0)
                throw new ArgumentException("Movie duration must be greater than zero");
            if (request.ImdbRating.HasValue && (request.ImdbRating < 0 || request.ImdbRating > 10))
                throw new ArgumentException("IMDb rating must be between 0 and 10");
            if (request.CountryId.HasValue && !await context.Countries.AnyAsync(x => x.CountryId == request.CountryId))
                throw new ArgumentException("Selected country does not exist");

            if (request.GenreIds?.Count > 0)
            {
                var ids = request.GenreIds.Distinct().ToList();
                if (await context.Genres.CountAsync(x => ids.Contains(x.GenreId)) != ids.Count)
                    throw new ArgumentException("One or more selected genres do not exist");
            }
        }

        private async Task<List<MovieDTO.MovieResponse>> MapMoviesAsync(List<Movie> movies)
        {
            if (movies.Count == 0) return [];
            var movieIds = movies.Select(x => x.MovieId).ToList();
            var genreRows = await context.MovieGenres.AsNoTracking()
                .Where(x => movieIds.Contains(x.MovieId))
                .Join(context.Genres.AsNoTracking(), movieGenre => movieGenre.GenreId, genre => genre.GenreId,
                    (movieGenre, genre) => new { movieGenre.MovieId, genre.GenreName })
                .ToListAsync();
            var genres = genreRows.ToLookup(x => x.MovieId, x => x.GenreName);

            return movies.Select(x => new MovieDTO.MovieResponse
            {
                MovieId = x.MovieId,
                Title = x.Title,
                TitleEn = x.TitleEn,
                CountryId = x.CountryId,
                DurationMins = x.DurationMins,
                ReleaseDate = x.ReleaseDate,
                EndDate = x.EndDate,
                AgeRating = x.AgeRating,
                Status = x.Status,
                Synopsis = x.Synopsis,
                Director = x.Director,
                CastMembers = x.CastMembers,
                Language = x.Language,
                Subtitle = x.Subtitle,
                PosterUrl = x.PosterUrl,
                BannerUrl = x.BannerUrl,
                TrailerUrl = x.TrailerUrl,
                ImdbRating = x.ImdbRating,
                Genres = genres[x.MovieId].ToList()
            }).ToList();
        }
    }
}
