namespace AuthServices.Infrastructure;

public sealed class ApiErrorResponse
{
    public bool Success { get; init; } = false;
    public string ErrorCode { get; init; } = ErrorCodes.InternalServerError;
    public string Message { get; init; } = "An unexpected error occurred";
    public string? TraceId { get; init; }
    public object? Details { get; init; }
}
