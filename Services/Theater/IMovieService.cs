using System;
using System.Collections.Generic;
using System.Text;
using DTO.Booking;
using DTO.Common;
using DTO.Theater;
namespace Services.Theater
{
    public interface IMovieService
    {
        Task<List<MovieDTO.GenreResponse>> GetGenresAsync();
        Task<DTO.Common.Paging.PaginationResponse<MovieDTO.MovieResponse>> GetAllMoviesAsync(string? keyword, string? status, int? cinemaId, int page =1 , int pageSize = 12);
        Task<MovieDTO.MovieResponse> CreateAsync(MovieDTO.MovieRequest movieRequest);
        Task<MovieDTO.MovieResponse> UpdateAsync(int movieId, MovieDTO.MovieRequest movieRequest);
        Task DeleteAsync(int movieId);
        Task<MovieDTO.MovieDetailResponse> GetMovieByIdAsync(int movieId);
    }
}
