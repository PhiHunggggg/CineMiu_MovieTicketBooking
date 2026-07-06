using System.Threading.Channels;
using Services.Administration;

namespace API_Service.Infrastructure;

public sealed class EmailDispatchQueue : IEmailDispatchQueue
{
    private readonly Channel<EmailDispatchMessage> _messages =
        Channel.CreateUnbounded<EmailDispatchMessage>(new UnboundedChannelOptions
        {
            SingleReader = true,
            SingleWriter = false
        });

    public void Enqueue(EmailDispatchMessage message)
    {
        if (!_messages.Writer.TryWrite(message))
            throw new InvalidOperationException("Could not queue email for delivery");
    }

    public ValueTask<EmailDispatchMessage> DequeueAsync(CancellationToken cancellationToken) =>
        _messages.Reader.ReadAsync(cancellationToken);
}

public sealed class EmailDispatchWorker(
    IEmailDispatchQueue queue,
    IServiceScopeFactory scopeFactory,
    ILogger<EmailDispatchWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            EmailDispatchMessage message;
            try
            {
                message = await queue.DequeueAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }

            try
            {
                await using var scope = scopeFactory.CreateAsyncScope();
                var emailSender = scope.ServiceProvider.GetRequiredService<IEmailSender>();
                await emailSender.SendAsync(
                    message.RecipientEmail,
                    message.Subject,
                    message.PlainText,
                    message.HtmlBody,
                    stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                logger.LogError(
                    exception,
                    "QueuedEmailDeliveryFailed recipient={Recipient} subject={Subject}",
                    message.RecipientEmail,
                    message.Subject);
            }
        }
    }
}
