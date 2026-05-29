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
        Task<List<DTO.Theater.MovieDTO.MovieResponse>> GetAllMoviesAsync(string? keyword, string? status, int? cinemaId);
        Task CreateAsync(MovieDTO.MovieRequest movieRequest);
        Task UpdateAsync(int movieId, MovieDTO.MovieRequest movieRequest);
        Task DeleteAsync(int movieId);
        Task<DTO.Theater.MovieDTO.MovieResponse> GetMovieByIdAsync(int movieId);
    }
}
