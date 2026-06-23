using DTO.Administration;
using Entities;

namespace Services.Administration;

public interface IReviewService
{
    Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly);
    Task<Review> UpdateVisibilityAsync(int id, bool isVisible);
    Task<Notification> ReplyAsync(int id, ReviewDTO.ReplyRequest request);
    Task DeleteAsync(int id);
}
