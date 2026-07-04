using DTO.Administration;
using Entities;

namespace Repository.EFCore.Administration;

public interface IReviewRepository
{
    Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly);
    Task<ReviewDTO.PublicListResponse> GetVisibleByMovieAsync(int movieId, int page, int pageSize);
    Task<Review?> GetByMovieAndUserAsync(int movieId, int userId);
    Task<bool> HasWatchedMovieAsync(int userId, int movieId, DateTime now);
    Task<Review?> GetByIdAsync(int id);
    Task<Review> CreateAsync(Review review);
    Task<Review> UpdateAsync(Review review);
    Task SaveAsync(Review review);
    Task DeleteAsync(Review review);
}
