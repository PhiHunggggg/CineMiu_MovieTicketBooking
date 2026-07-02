using System.Net.Http.Json;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;
using Services.Administration;

namespace API_Service.Infrastructure;

public sealed class NotificationApiOptions
{
    public const string SectionName = "NotificationApi";

    public string BaseUrl { get; init; } = "http://localhost:8081";
    public string ApiKey { get; init; } = "";
}

public sealed class PhpEmailSender : IEmailSender
{
    private readonly HttpClient _httpClient;
    private readonly NotificationApiOptions _options;

    public PhpEmailSender(
        HttpClient httpClient,
        IOptions<NotificationApiOptions> options)
    {
        _httpClient = httpClient;
        _options = options.Value;
    }

    public async Task SendAsync(
        string recipientEmail,
        string subject,
        string plainText,
        string? htmlBody = null,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new InvalidOperationException("NotificationApi:ApiKey is not configured");

        using var request = new HttpRequestMessage(HttpMethod.Post, _options.BaseUrl);
        request.Headers.Add("X-API-Key", _options.ApiKey);
        request.Content = JsonContent.Create(new
        {
            to = recipientEmail,
            subject,
            html = htmlBody ?? HtmlEncoder.Default.Encode(plainText)
                .Replace("\r\n", "<br>", StringComparison.Ordinal)
                .Replace("\n", "<br>", StringComparison.Ordinal),
            text = plainText
        });

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (response.IsSuccessStatusCode)
            return;

        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
        throw new HttpRequestException(
            $"PHP notification service returned {(int)response.StatusCode}: {responseBody}");
    }
}
