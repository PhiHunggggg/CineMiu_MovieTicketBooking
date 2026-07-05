using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Workers;

public sealed class PendingBookingExpirationWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<PendingBookingExpirationWorker> logger) : BackgroundService
{
    private static readonly TimeSpan CleanupInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Pending booking expiration worker started with intervalSeconds={IntervalSeconds}",
            CleanupInterval.TotalSeconds);

        await CleanupSafelyAsync(stoppingToken);

        using var timer = new PeriodicTimer(CleanupInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await CleanupSafelyAsync(stoppingToken);
        }
    }

    private async Task CleanupSafelyAsync(CancellationToken stoppingToken)
    {
        try
        {
            await CleanupAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // The application is shutting down.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to clean up expired bookings and seat locks");
        }
    }

    private async Task CleanupAsync(CancellationToken cancellationToken)
    {
        await using var scope = scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();
        var now = DateTime.UtcNow;

        int expiredBookingCount;
        int deletedSeatLockCount;

        if (db.Database.IsRelational())
        {
            expiredBookingCount = await db.Bookings
                .Where(booking =>
                    booking.Status == "pending" &&
                    booking.ExpiresAt.HasValue &&
                    booking.ExpiresAt.Value <= now)
                .ExecuteUpdateAsync(updates => updates
                    .SetProperty(booking => booking.Status, "cancelled")
                    .SetProperty(booking => booking.CancelledAt, now)
                    .SetProperty(booking => booking.CancelReason, "Payment timeout"),
                    cancellationToken);

            deletedSeatLockCount = await db.SeatLocks
                .Where(seatLock => seatLock.ExpiresAt <= now)
                .ExecuteDeleteAsync(cancellationToken);
        }
        else
        {
            var expiredBookings = await db.Bookings
                .Where(booking =>
                    booking.Status == "pending" &&
                    booking.ExpiresAt.HasValue &&
                    booking.ExpiresAt.Value <= now)
                .ToListAsync(cancellationToken);

            foreach (var booking in expiredBookings)
            {
                booking.Status = "cancelled";
                booking.CancelledAt = now;
                booking.CancelReason = "Payment timeout";
            }

            var expiredSeatLocks = await db.SeatLocks
                .Where(seatLock => seatLock.ExpiresAt <= now)
                .ToListAsync(cancellationToken);

            db.SeatLocks.RemoveRange(expiredSeatLocks);
            await db.SaveChangesAsync(cancellationToken);

            expiredBookingCount = expiredBookings.Count;
            deletedSeatLockCount = expiredSeatLocks.Count;
        }

        if (expiredBookingCount > 0 || deletedSeatLockCount > 0)
        {
            logger.LogInformation(
                "Expired booking cleanup completed expiredBookings={ExpiredBookingCount} deletedSeatLocks={DeletedSeatLockCount}",
                expiredBookingCount,
                deletedSeatLockCount);
        }
    }
}
