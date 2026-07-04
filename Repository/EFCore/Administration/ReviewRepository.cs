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

    public async Task<ReviewDTO.PublicListResponse> GetVisibleByMovieAsync(int movieId, int page, int pageSize)
    {
        var query = 
            from review in context.Reviews.AsNoTracking()
            join user in context.Users.AsNoTracking() on review.UserId equals user.UserId
            where review.MovieId == movieId && review.IsVisible
            select new { review, user };

        var stats = await query.GroupBy(_ => 1).Select(g => new ReviewDTO.Stats
        {
            Count = g.Count(),
            VisibleCount = g.Count(),
            AverageRating = g.Average(x => (decimal)x.review.Rating)
        }).FirstOrDefaultAsync() ?? new ReviewDTO.Stats();

        var items = await query.OrderByDescending(x => x.review.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new ReviewDTO.PublicResponse
            {
                ReviewId = x.review.ReviewId,
                MovieId = x.review.MovieId,
                UserId = x.review.UserId,
                FullName = x.user.FullName,
                Rating = x.review.Rating,
                Comment = x.review.Comment,
                CreatedAt = x.review.CreatedAt
            }).ToListAsync();

        return new ReviewDTO.PublicListResponse { Items = items, Stats = stats };
    }

    public Task<Review?> GetByMovieAndUserAsync(int movieId, int userId)
    {
        return context.Reviews.FirstOrDefaultAsync(x => x.MovieId == movieId && x.UserId == userId);
    }

    public async Task<bool> HasWatchedMovieAsync(int userId, int movieId, DateTime now)
    {
        var validStatuses = new[] { "completed" };
        var hasWatched = await (
            from b in context.Bookings.AsNoTracking()
            join s in context.ShowTimes.AsNoTracking() on b.ShowtimeId equals s.ShowtimeId
            join t in context.Tickets.AsNoTracking() on b.BookingId equals t.BookingId
            where b.UserId == userId 
                  && s.MovieId == movieId 
                  && validStatuses.Contains(b.Status)
                  && s.EndTime <= now
                  && t.IsUsed 
                  && t.UsedAt != null
            select 1
        ).AnyAsync();

        return hasWatched;
    }

    public async Task<Review> CreateAsync(Review review)
    {
        context.Reviews.Add(review);
        await context.SaveChangesAsync();
        return review;
    }

    public async Task<Review> UpdateAsync(Review review)
    {
        context.Reviews.Update(review);
        await context.SaveChangesAsync();
        return review;
    }

    public Task<Review?> GetByIdAsync(int id) => context.Reviews.FirstOrDefaultAsync(x => x.ReviewId == id);
    public Task SaveAsync(Review review) => context.SaveChangesAsync();

    public async Task DeleteAsync(Review review)
    {
        context.Reviews.Remove(review);
        await context.SaveChangesAsync();
    }
}
