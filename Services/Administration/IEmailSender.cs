namespace Services.Administration;

public interface IEmailSender
{
    Task SendAsync(
        string recipientEmail,
        string subject,
        string plainText,
        string? htmlBody = null,
        CancellationToken cancellationToken = default);
}
