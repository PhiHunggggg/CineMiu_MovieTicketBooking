using DTO.Administration;
using Entities;

namespace Repository.EFCore.Administration;

public interface IReviewRepository
{
    Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly);
    Task<Review?> GetByIdAsync(int id);
    Task SaveAsync(Review review);
    Task DeleteAsync(Review review);
}
