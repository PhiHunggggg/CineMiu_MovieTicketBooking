namespace Services.Administration;

public sealed record EmailDispatchMessage(
    string RecipientEmail,
    string Subject,
    string PlainText,
    string? HtmlBody = null);

public interface IEmailDispatchQueue
{
    void Enqueue(EmailDispatchMessage message);
    ValueTask<EmailDispatchMessage> DequeueAsync(CancellationToken cancellationToken);
}
