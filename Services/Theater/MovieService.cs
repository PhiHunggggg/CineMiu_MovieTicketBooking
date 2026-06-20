using DTO.Common;
using DTO.Theater;
using Entities;
using Microsoft.IdentityModel.Tokens;
using Repository.EFCore.Theater;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
using static DTO.Common.Paging;
namespace Services.Theater
{
    public class MovieService(IMovieRepository movieRepository) : IMovieService
    {
        public async Task<List<MovieDTO.GenreResponse>> GetGenresAsync()
        {
            return await movieRepository.GetGenresAsync();
        }

        public async Task<PaginationResponse<MovieDTO.MovieResponse>> GetAllMoviesAsync(string? keyword, string? status, int? cinemaId, int page = 1, int pageSize = 12)
        {
            page = Math.Max(page, 1);
            pageSize = Math.Clamp(pageSize, 1, 100);

            var movies = await movieRepository.GetAllMoviesAsync(keyword, status, cinemaId);
            var totalCount = movies.Count;
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var items = movies.Skip((page - 1) * pageSize).Take(pageSize).ToList();

            return new PaginationResponse<MovieDTO.MovieResponse>
            {
                Page = page,
                PageSize = pageSize,
                TotalCount = totalCount,
                TotalPages = totalPages,
                Items = items
            };
        }
        public async Task<MovieDTO.MovieResponse> GetMovieByIdAsync(int movieId)
        {
            var movie = await movieRepository.GetMovieByIdAsync(movieId);
            if (movie == null)
            {
                throw new ArgumentException("Movie not found");
            }
            return movie;
        }
        public async Task CreateAsync(MovieDTO.MovieRequest movieRequest)
        {
            await movieRepository.CreateAsync(movieRequest);
        }
        public async Task UpdateAsync(int movieId, MovieDTO.MovieRequest movieRequest)
        {
            await movieRepository.UpdateAsync(movieId, movieRequest);
        }
        public async Task DeleteAsync(int movieId)
        {
            await movieRepository.DeleteAsync(movieId);
        }
    } 
}
