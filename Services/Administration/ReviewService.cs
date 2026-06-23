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

    private async Task<Review> GetRequiredAsync(int id) =>
        await reviewRepository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Review not found");
}
