using Azure;
using Entities;
using DTO.Theater;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Text;

namespace Repository.EFCore.Theater
{
    public class MovieRepository(SqlServerDbContext context) : IMovieRepository
    {
        public async Task<List<DTO.Theater.MovieDTO.MovieResponse>> GetAllMoviesAsync(string? keyword, string? status, int? cinemaId)
        {
            var query = context.Movies.AsNoTracking();

            if(!string.IsNullOrEmpty(keyword))
            {
                query = query.Where(m => m.Title.Contains(keyword) || (m.TitleEn != null && m.TitleEn.Contains(keyword)));
            }

            // now_showing, coming_soon, ended
            if(!string.IsNullOrEmpty(status))
            {
                query = query.Where(x => status.Contains(x.Status!));
            }

            // Tìm theo id phim
            if (cinemaId.HasValue)
            {
                var movieIds = context.ShowTimes
                    .Join(context.Halls, s => s.HallId, h => h.HallId, (s, h) => new { s.MovieId, h.CinemaId })
                    .Where(x => x.CinemaId == cinemaId.Value)
                    .Select(x => x.MovieId)
                    .Distinct();

                query = query.Where(m => movieIds.Contains(m.MovieId));
            }
            var movies = await query.ToListAsync();
            var movieIdsList = movies.Select(m => m.MovieId).ToList();
            var movieGenres = await context.MovieGenres
                .AsNoTracking()
                .Where(mg => movieIdsList.Contains(mg.MovieId))
                .Join(context.Genres, mg => mg.GenreId, g => g.GenreId, (mg, g) => new { mg.MovieId, g.GenreId })
                .ToListAsync();
            var genreIdsLookup = movieGenres.ToLookup(mg => mg.MovieId, mg => mg.GenreId);
            var items = movies.Select(x => new MovieDTO.MovieResponse
            {
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
                Status = x.Status,

                GenreIds = genreIdsLookup[x.MovieId].ToList()
            }).ToList();

            return items;
        }
        public async Task<DTO.Theater.MovieDTO.MovieResponse> GetMovieByIdAsync(int movieId)
        {
            var movie = await context.Movies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }
            var genreIds = await context.MovieGenres
                .AsNoTracking()
                .Where(mg => mg.MovieId == movieId)
                .Select(mg => mg.GenreId)
                .ToListAsync();
            return new MovieDTO.MovieResponse
            {
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
                Status = movie.Status,
                GenreIds = genreIds
            };
        }
        public async Task CreateAsync(MovieDTO.MovieRequest movieRequest)
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
                var movieGenres = movieRequest.GenreIds.Select(genreId => new MovieGenre
                {
                    MovieId = movie.MovieId,
                    GenreId = genreId
                }).ToList();

                context.MovieGenres.AddRange(movieGenres);
                await context.SaveChangesAsync();
            }
        }
        public async Task UpdateAsync(int movieId, MovieDTO.MovieRequest dto)
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
                    GenreId = genreId
                }).ToList();
                context.MovieGenres.AddRange(newMovieGenres);
            }
            await context.SaveChangesAsync();
        }
        public async Task DeleteAsync(int movieId)
        {
            var movie = await context.Movies.FirstOrDefaultAsync(x => x.MovieId == movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }
            context.Movies.Remove(movie);
            await context.SaveChangesAsync();
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
                var existingCount = await context.Genres.CountAsync(x => genreIds.Contains(x.GenreId));
                if (existingCount != genreIds.Count)
                {
                    return "One or more selected genres do not exist";
                }
            }

            return null;
        }
    }
}
