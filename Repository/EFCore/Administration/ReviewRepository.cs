using DTO.Administration;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Administration;

public class ReviewRepository(SqlServerDbContext context) : IReviewRepository
{
    public async Task<ReviewDTO.ListResponse> GetAllAsync(int? movieId, bool visibleOnly)
    {
        var query =
            from review in context.Reviews.AsNoTracking()
            join movie in context.Movies.AsNoTracking() on review.MovieId equals movie.MovieId
            join user in context.Users.AsNoTracking() on review.UserId equals user.UserId
            select new { review, movie, user };

        if (movieId.HasValue) query = query.Where(x => x.review.MovieId == movieId.Value);
        if (visibleOnly) query = query.Where(x => x.review.IsVisible);

        var stats = await query.GroupBy(_ => 1).Select(group => new ReviewDTO.Stats
        {
            Count = group.Count(),
            VisibleCount = group.Count(x => x.review.IsVisible),
            AverageRating = group.Average(x => (decimal)x.review.Rating)
        }).FirstOrDefaultAsync() ?? new ReviewDTO.Stats();

        var items = await query.OrderByDescending(x => x.review.CreatedAt)
            .Select(x => new ReviewDTO.Response
            {
                ReviewId = x.review.ReviewId,
                MovieId = x.review.MovieId,
                MovieTitle = x.movie.Title,
                UserId = x.review.UserId,
                FullName = x.user.FullName,
                Email = x.user.Email,
                Rating = x.review.Rating,
                Comment = x.review.Comment,
                IsVisible = x.review.IsVisible,
                CreatedAt = x.review.CreatedAt
            }).ToListAsync();

        return new ReviewDTO.ListResponse { Items = items, Stats = stats };
    }

    public Task<Review?> GetByIdAsync(int id) => context.Reviews.FirstOrDefaultAsync(x => x.ReviewId == id);
    public Task SaveAsync(Review review) => context.SaveChangesAsync();

    public async Task DeleteAsync(Review review)
    {
        context.Reviews.Remove(review);
        await context.SaveChangesAsync();
    }
}
