using DTO.Administration;
using Entities;

namespace Services.Administration;

public interface IReviewService
{
    Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly);
    Task<Review> UpdateVisibilityAsync(int id, bool isVisible);
    Task<Notification> ReplyAsync(int id, ReviewDTO.ReplyRequest request);
    Task DeleteAsync(int id);

    Task<ReviewDTO.PublicListResponse> GetPublicReviewsAsync(int movieId, int page, int pageSize);
    Task<ReviewDTO.EligibilityResponse> GetEligibilityAsync(int movieId, int userId);
    Task<ReviewDTO.PublicResponse> CreateReviewAsync(int movieId, int userId, ReviewDTO.CreateRequest request);
    Task<ReviewDTO.PublicResponse> UpdateReviewAsync(int reviewId, int userId, ReviewDTO.UpdateRequest request);
    Task DeleteByUserAsync(int reviewId, int userId);
}
