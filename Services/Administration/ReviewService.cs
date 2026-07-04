using DTO.Administration;
using Entities;
using Repository.EFCore.Administration;

namespace Services.Administration;

public class ReviewService(
    IReviewRepository reviewRepository,
    INotificationService notificationService) : IReviewService
{
    public Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly) =>
        reviewRepository.GetAllAsync(movieId, visibleOnly);

    public async Task<Review> UpdateVisibilityAsync(int id, bool isVisible)
    {
        var review = await GetRequiredAsync(id);
        review.IsVisible = isVisible;
        await reviewRepository.SaveAsync(review);
        return review;
    }

    public async Task<Notification> ReplyAsync(int id, ReviewDTO.ReplyRequest request)
    {
        var review = await GetRequiredAsync(id);
        if (string.IsNullOrWhiteSpace(request.Message))
            throw new ArgumentException("Reply message is required");

        return await notificationService.CreateAsync(new NotificationDTO.Request
        {
            UserId = review.UserId,
            Type = "review_reply",
            Title = string.IsNullOrWhiteSpace(request.Title) ? "Phản hồi đánh giá" : request.Title,
            Message = request.Message,
            SentVia = request.SentVia ?? "email"
        });
    }

    public async Task DeleteAsync(int id) => await reviewRepository.DeleteAsync(await GetRequiredAsync(id));

    public Task<ReviewDTO.PublicListResponse> GetPublicReviewsAsync(int movieId, int page, int pageSize)
    {
        return reviewRepository.GetVisibleByMovieAsync(movieId, page, pageSize);
    }

    public async Task<ReviewDTO.EligibilityResponse> GetEligibilityAsync(int movieId, int userId)
    {
        var existing = await reviewRepository.GetByMovieAndUserAsync(movieId, userId);
        if (existing != null)
        {
            return new ReviewDTO.EligibilityResponse 
            { 
                CanReview = false, 
                Reason = "Bạn đã đánh giá phim này.",
                ExistingReview = new ReviewDTO.PublicResponse
                {
                    ReviewId = existing.ReviewId,
                    MovieId = existing.MovieId,
                    UserId = existing.UserId,
                    Rating = existing.Rating,
                    Comment = existing.Comment,
                    CreatedAt = existing.CreatedAt
                }
            };
        }

        var hasWatched = await reviewRepository.HasWatchedMovieAsync(userId, movieId, DateTime.UtcNow);
        if (!hasWatched)
        {
            return new ReviewDTO.EligibilityResponse
            {
                CanReview = false,
                Reason = "Bạn cần đã xem xong phim (booking completed) tại CineMiu trước khi bình luận."
            };
        }

        return new ReviewDTO.EligibilityResponse { CanReview = true };
    }

    public async Task<ReviewDTO.PublicResponse> CreateReviewAsync(int movieId, int userId, ReviewDTO.CreateRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            throw new ArgumentException("Rating must be between 1 and 5.");
        var comment = request.Comment?.Trim() ?? "";
        if (comment.Length < 10 || comment.Length > 1000)
            throw new ArgumentException("Comment must be between 10 and 1000 characters.");

        var eligibility = await GetEligibilityAsync(movieId, userId);
        if (!eligibility.CanReview)
        {
            if (eligibility.ExistingReview != null)
                throw new InvalidOperationException("409:You have already reviewed this movie.");
            throw new UnauthorizedAccessException("403:You are not eligible to review this movie.");
        }

        var review = new Review
        {
            MovieId = movieId,
            UserId = userId,
            Rating = request.Rating,
            Comment = comment,
            IsVisible = true,
            CreatedAt = DateTime.UtcNow
        };

        await reviewRepository.CreateAsync(review);

        return new ReviewDTO.PublicResponse
        {
            ReviewId = review.ReviewId,
            MovieId = review.MovieId,
            UserId = review.UserId,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }

    public async Task<ReviewDTO.PublicResponse> UpdateReviewAsync(int reviewId, int userId, ReviewDTO.UpdateRequest request)
    {
        if (request.Rating < 1 || request.Rating > 5)
            throw new ArgumentException("Rating must be between 1 and 5.");
        var comment = request.Comment?.Trim() ?? "";
        if (comment.Length < 10 || comment.Length > 1000)
            throw new ArgumentException("Comment must be between 10 and 1000 characters.");

        var review = await GetRequiredAsync(reviewId);
        if (review.UserId != userId)
            throw new UnauthorizedAccessException("403:You do not own this review.");

        review.Rating = request.Rating;
        review.Comment = comment;
        await reviewRepository.UpdateAsync(review);

        return new ReviewDTO.PublicResponse
        {
            ReviewId = review.ReviewId,
            MovieId = review.MovieId,
            UserId = review.UserId,
            Rating = review.Rating,
            Comment = review.Comment,
            CreatedAt = review.CreatedAt
        };
    }

    public async Task DeleteByUserAsync(int reviewId, int userId)
    {
        var review = await GetRequiredAsync(reviewId);
        if (review.UserId != userId)
            throw new UnauthorizedAccessException("403:You do not own this review.");
            
        await reviewRepository.DeleteAsync(review);
    }
    private async Task<Review> GetRequiredAsync(int id) =>
        await reviewRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Review not found");
}
