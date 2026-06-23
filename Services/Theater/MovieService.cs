using DTO.Common;
using DTO.Theater;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class MovieService(IMovieRepository movieRepository) : IMovieService
    {
        public Task<List<MovieDTO.GenreResponse>> GetGenresAsync() => movieRepository.GetGenresAsync();

        public async Task<Paging.PaginationResponse<MovieDTO.MovieResponse>> GetAllMoviesAsync(
            string? keyword,
            string? status,
            int? cinemaId,
            int page = 1,
            int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);
            var movies = await movieRepository.GetAllMoviesAsync(keyword, GetStatusAliases(status), cinemaId);
            foreach (var movie in movies) movie.Status = NormalizeStatusForClient(movie.Status);

            var totalCount = movies.Count;
            return new Paging.PaginationResponse<MovieDTO.MovieResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = (int)Math.Ceiling(totalCount / (double)pageSize),
                Items = movies.Skip((page - 1) * pageSize).Take(pageSize).ToList()
            };
        }

        public async Task<MovieDTO.MovieDetailResponse> GetMovieByIdAsync(int movieId)
        {
            var detail = await movieRepository.GetMovieByIdAsync(movieId);
            detail.Movie.Status = NormalizeStatusForClient(detail.Movie.Status);
            return detail;
        }

        public async Task<MovieDTO.MovieResponse> CreateAsync(MovieDTO.MovieRequest request)
        {
            NormalizeRequest(request);
            var movie = await movieRepository.CreateAsync(request);
            movie.Status = NormalizeStatusForClient(movie.Status);
            return movie;
        }

        public async Task<MovieDTO.MovieResponse> UpdateAsync(int movieId, MovieDTO.MovieRequest request)
        {
            NormalizeRequest(request);
            var movie = await movieRepository.UpdateAsync(movieId, request);
            movie.Status = NormalizeStatusForClient(movie.Status);
            return movie;
        }

        public Task DeleteAsync(int movieId) => movieRepository.DeleteAsync(movieId);

        private static void NormalizeRequest(MovieDTO.MovieRequest request)
        {
            request.Title = request.Title?.Trim() ?? "";
            request.TitleEn = OptionalText(request.TitleEn);
            request.AgeRating = OptionalText(request.AgeRating);
            request.Status = NormalizeStatusForStorage(request.Status);
            request.Synopsis = OptionalText(request.Synopsis);
            request.Director = OptionalText(request.Director);
            request.CastMembers = OptionalText(request.CastMembers);
            request.Language = OptionalText(request.Language);
            request.Subtitle = OptionalText(request.Subtitle);
            request.PosterUrl = OptionalText(request.PosterUrl);
            request.BannerUrl = OptionalText(request.BannerUrl);
            request.TrailerUrl = OptionalText(request.TrailerUrl);
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
            if (string.IsNullOrWhiteSpace(normalized)) return [];
            return normalized switch
            {
                "NowShowing" => ["NowShowing", "now_showing", "nowshowing"],
                "ComingSoon" => ["ComingSoon", "coming_soon", "comingsoon"],
                "Ended" => ["Ended", "ended"],
                _ => [normalized]
            };
        }

        private static string? OptionalText(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
