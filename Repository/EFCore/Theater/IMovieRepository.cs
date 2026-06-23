using Entities;
using System;
using System.Collections.Generic;
using System.Text;
using DTO;
using DTO.Theater;

namespace Repository.EFCore.Theater
{
    public interface IMovieRepository
    {
        Task<List<MovieDTO.GenreResponse>> GetGenresAsync();
        Task<List<MovieDTO.MovieResponse>> GetAllMoviesAsync(string? keyword, IReadOnlyCollection<string> statusAliases, int? cinemaId);
        Task<MovieDTO.MovieResponse> CreateAsync(MovieDTO.MovieRequest movieRequest);
        Task<MovieDTO.MovieResponse> UpdateAsync(int movieId, MovieDTO.MovieRequest movieRequest);
        Task DeleteAsync(int movieId);
        Task<MovieDTO.MovieDetailResponse> GetMovieByIdAsync(int movieId);
    }
}
