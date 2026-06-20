using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

  namespace API_Service.Controllers
  {
    [Route("api/movies")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public MoviesController(SqlServerDbContext context)
        {
            _context = context;
        }

        private static string? NormalizeStatusForStorage(string? status)
        {
            if (string.IsNullOrWhiteSpace(status)) return null;
            return status.Trim().ToLowerInvariant() switch
            {
                "now_showing" or "nowshowing" => "NowShowing",
                "coming_soon" or "comingsoon" => "ComingSoon",
                "ended" => "Ended",
                _ => null
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

        private static string[] GetStatusAliases(string? status)
        {
            var normalized = NormalizeStatusForStorage(status);
            if (string.IsNullOrWhiteSpace(normalized)) return Array.Empty<string>();

            return normalized switch
            {
                "NowShowing" => new[] { "NowShowing", "now_showing", "nowshowing" },
                "ComingSoon" => new[] { "ComingSoon", "coming_soon", "comingsoon" },
                "Ended" => new[] { "Ended", "ended" },
                _ => new[] { normalized }
            };
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? keyword, [FromQuery] string? status, [FromQuery] int? cinemaId, [FromQuery] int page = 1, [FromQuery] int pageSize = 12)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var query = _context.CinemaMovies.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                query = query.Where(x => x.Title.Contains(keyword) || (x.TitleEn != null && x.TitleEn.Contains(keyword)));
            }

            var statusAliases = GetStatusAliases(status);
            if (statusAliases.Length > 0)
            {
                query = query.Where(x => statusAliases.Contains(x.Status));
            }

            if (cinemaId.HasValue)
            {
                var movieIds = _context.CinemaShowtimes
                    .Join(_context.CinemaHalls, s => s.HallId, h => h.HallId, (s, h) => new { s.MovieId, h.CinemaId })
                    .Where(x => x.CinemaId == cinemaId.Value)
                    .Select(x => x.MovieId)
                    .Distinct();
                
                query = query.Where(m => movieIds.Contains(m.MovieId));
            }

            var movies = await query
                .OrderByDescending(x => x.ReleaseDate)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var movieIdsList = movies.Select(m => m.MovieId).ToList();
            var movieGenres = await _context.CinemaMovieGenres
                .AsNoTracking()
                .Where(mg => movieIdsList.Contains(mg.MovieId))
                .Join(_context.CinemaGenres, mg => mg.GenreId, g => g.GenreId, (mg, g) => new { mg.MovieId, g.GenreName })
                .ToListAsync();
            var totalCount = await query.CountAsync();
            var items = movies.Select(x => new
            {
                id = x.MovieId,
                movieId = x.MovieId,
                title = x.Title,
                titleEn = x.TitleEn,
                countryId = x.CountryId,
                durationMins = x.DurationMins,
                releaseDate = x.ReleaseDate,
                endDate = x.EndDate,
                ageRating = x.AgeRating,
                synopsis = x.Synopsis,
                director = x.Director,
                castMembers = x.CastMembers,
                language = x.Language,
                subtitle = x.Subtitle,
                posterUrl = x.PosterUrl,
                bannerUrl = x.BannerUrl,
                trailerUrl = x.TrailerUrl,
                imdbRating = x.ImdbRating,
                status = NormalizeStatusForClient(x.Status),
                genres = movieGenres.Where(mg => mg.MovieId == x.MovieId).Select(mg => mg.GenreName).ToList()
            }).ToList();

            return Ok(new { items, totalCount, page, pageSize, totalPages = (int)Math.Ceiling((double)totalCount / pageSize) });
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var movie = await _context.CinemaMovies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == id);
            if (movie == null)
            {
                return NotFound(new { message = "Movie not found" });
            }

            var movieGenres = await _context.CinemaMovieGenres
                .AsNoTracking()
                .Where(mg => mg.MovieId == id)
                .Join(_context.CinemaGenres, mg => mg.GenreId, g => g.GenreId, (mg, g) => new { mg.GenreId, g.GenreName })
                .ToListAsync();

            return Ok(new
            {
                movie = new
                {
                    id = movie.MovieId,
                    movieId = movie.MovieId,
                    title = movie.Title,
                    titleEn = movie.TitleEn,
                    countryId = movie.CountryId,
                    durationMins = movie.DurationMins,
                    releaseDate = movie.ReleaseDate,
                    endDate = movie.EndDate,
                    ageRating = movie.AgeRating,
                    status = NormalizeStatusForClient(movie.Status),
                    synopsis = movie.Synopsis,
                    director = movie.Director,
                    castMembers = movie.CastMembers,
                    language = movie.Language,
                    subtitle = movie.Subtitle,
                    posterUrl = movie.PosterUrl,
                    bannerUrl = movie.BannerUrl,
                    trailerUrl = movie.TrailerUrl,
                    imdbRating = movie.ImdbRating,
                    genres = movieGenres.Select(x => x.GenreName).ToList()
                },
                genreIds = movieGenres.Select(x => x.GenreId).ToList()
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] MovieDto dto)
        {
            var validationError = await ValidateMovieDto(dto);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            var movie = new CinemaMovie
            {
                Title = dto.Title.Trim(),
                TitleEn = NormalizeNullableText(dto.TitleEn),
                CountryId = dto.CountryId,
                DurationMins = dto.DurationMins,
                ReleaseDate = dto.ReleaseDate,
                EndDate = dto.EndDate,
                AgeRating = NormalizeNullableText(dto.AgeRating) ?? "P",
                Status = NormalizeStatusForStorage(dto.Status) ?? "ComingSoon",
                Synopsis = NormalizeNullableText(dto.Synopsis),
                Director = NormalizeNullableText(dto.Director),
                CastMembers = NormalizeNullableText(dto.CastMembers),
                Language = NormalizeNullableText(dto.Language),
                Subtitle = NormalizeNullableText(dto.Subtitle),
                PosterUrl = NormalizeNullableText(dto.PosterUrl),
                BannerUrl = NormalizeNullableText(dto.BannerUrl),
                TrailerUrl = NormalizeNullableText(dto.TrailerUrl),
                ImdbRating = dto.ImdbRating,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.CinemaMovies.Add(movie);
            await _context.SaveChangesAsync();
            await ReplaceGenres(movie.MovieId, dto.GenreIds);

            return CreatedAtAction(nameof(GetById), new { id = movie.MovieId }, movie);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] MovieDto dto)
        {
            var validationError = await ValidateMovieDto(dto);
            if (validationError != null)
            {
                return BadRequest(new { message = validationError });
            }

            var movie = await _context.CinemaMovies.FindAsync(id);
            if (movie == null)
            {
                return NotFound(new { message = "Movie not found" });
            }

            movie.Title = dto.Title.Trim();
            movie.TitleEn = NormalizeNullableText(dto.TitleEn);
            movie.CountryId = dto.CountryId;
            movie.DurationMins = dto.DurationMins;
            movie.ReleaseDate = dto.ReleaseDate;
            movie.EndDate = dto.EndDate;
            movie.AgeRating = NormalizeNullableText(dto.AgeRating) ?? movie.AgeRating;
            movie.Status = NormalizeStatusForStorage(dto.Status) ?? movie.Status;
            movie.Synopsis = NormalizeNullableText(dto.Synopsis);
            movie.Director = NormalizeNullableText(dto.Director);
            movie.CastMembers = NormalizeNullableText(dto.CastMembers);
            movie.Language = NormalizeNullableText(dto.Language);
            movie.Subtitle = NormalizeNullableText(dto.Subtitle);
            movie.PosterUrl = NormalizeNullableText(dto.PosterUrl);
            movie.BannerUrl = NormalizeNullableText(dto.BannerUrl);
            movie.TrailerUrl = NormalizeNullableText(dto.TrailerUrl);
            movie.ImdbRating = dto.ImdbRating;
            movie.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await ReplaceGenres(movie.MovieId, dto.GenreIds);

            return Ok(movie);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var movie = await _context.CinemaMovies.FindAsync(id);
            if (movie == null)
            {
                return NotFound(new { message = "Movie not found" });
            }

            if (await _context.CinemaShowtimes.AnyAsync(x => x.MovieId == id))
            {
                return BadRequest(new { message = "Cannot delete movie because it has showtimes" });
            }

            _context.CinemaMovieGenres.RemoveRange(_context.CinemaMovieGenres.Where(x => x.MovieId == id));
            _context.CinemaMovies.Remove(movie);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task ReplaceGenres(int movieId, IEnumerable<int>? genreIds)
        {
            _context.CinemaMovieGenres.RemoveRange(_context.CinemaMovieGenres.Where(x => x.MovieId == movieId));
            if (genreIds != null)
            {
                _context.CinemaMovieGenres.AddRange(genreIds.Distinct().Select(genreId => new CinemaMovieGenre { MovieId = movieId, GenreId = (byte)genreId }));
            }

            await _context.SaveChangesAsync();
        }

        private async Task<string?> ValidateMovieDto(MovieDto dto)
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

            if (dto.CountryId.HasValue && !await _context.CinemaCountries.AnyAsync(x => x.CountryId == dto.CountryId.Value))
            {
                return "Selected country does not exist";
            }

            if (dto.GenreIds?.Count > 0)
            {
                var genreIds = dto.GenreIds.Distinct().ToList();
                var existingCount = await _context.CinemaGenres.CountAsync(x => genreIds.Contains(x.GenreId));
                if (existingCount != genreIds.Count)
                {
                    return "One or more selected genres do not exist";
                }
            }

            return null;
        }

        private static string? NormalizeNullableText(string? value)
        {
            return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
        }
    }

    public class MovieDto
    {
        public string Title { get; set; } = "";
        public string? TitleEn { get; set; }
        public int? CountryId { get; set; }
        public short DurationMins { get; set; }
        public DateTime? ReleaseDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? AgeRating { get; set; }
        public string? Status { get; set; }
        public string? Synopsis { get; set; }
        public string? Director { get; set; }
        public string? CastMembers { get; set; }
        public string? Language { get; set; }
        public string? Subtitle { get; set; }
        public string? PosterUrl { get; set; }
        public string? BannerUrl { get; set; }
        public string? TrailerUrl { get; set; }
        public decimal? ImdbRating { get; set; }
        public List<int>? GenreIds { get; set; }
    }
}
