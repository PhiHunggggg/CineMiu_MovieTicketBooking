using Microsoft.EntityFrameworkCore;
using Repository;

namespace API_Service.Workers;

public sealed class ShowtimeStatusWorker(
    IServiceScopeFactory scopeFactory,
    ILogger<ShowtimeStatusWorker> logger) : BackgroundService
{
    private static readonly TimeSpan UpdateInterval = TimeSpan.FromSeconds(30);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation(
            "Showtime status worker started with intervalSeconds={IntervalSeconds}",
            UpdateInterval.TotalSeconds);

        await UpdateSafelyAsync(stoppingToken);

        using var timer = new PeriodicTimer(UpdateInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            await UpdateSafelyAsync(stoppingToken);
        }
    }

    private async Task UpdateSafelyAsync(CancellationToken cancellationToken)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<SqlServerDbContext>();
            var now = DateTime.Now;
            int updatedCount;

            if (db.Database.IsRelational())
            {
                updatedCount = await db.ShowTimes
                    .Where(showtime =>
                        showtime.EndTime <= now &&
                        showtime.Status != "completed" &&
                        showtime.Status != "cancelled")
                    .ExecuteUpdateAsync(updates => updates
                        .SetProperty(showtime => showtime.Status, "completed")
                        .SetProperty(showtime => showtime.UpdatedAt, DateTime.UtcNow),
                        cancellationToken);
            }
            else
            {
                var endedShowtimes = await db.ShowTimes
                    .Where(showtime =>
                        showtime.EndTime <= now &&
                        showtime.Status != "completed" &&
                        showtime.Status != "cancelled")
                    .ToListAsync(cancellationToken);

                foreach (var showtime in endedShowtimes)
                {
                    showtime.Status = "completed";
                    showtime.UpdatedAt = DateTime.UtcNow;
                }

                await db.SaveChangesAsync(cancellationToken);
                updatedCount = endedShowtimes.Count;
            }

            if (updatedCount > 0)
            {
                logger.LogInformation(
                    "Showtime status update completed updatedShowtimes={UpdatedCount}",
                    updatedCount);
            }
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            // Application is shutting down.
        }
        catch (Exception exception)
        {
            logger.LogError(exception, "Failed to update ended showtimes");
        }
    }
}
