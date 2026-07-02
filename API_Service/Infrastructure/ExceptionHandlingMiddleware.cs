using Microsoft.EntityFrameworkCore;

namespace API_Service.Infrastructure;

public sealed class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;
    private readonly IHostEnvironment _environment;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger,
        IHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            var (statusCode, errorCode, message) = MapException(exception);
            _logger.LogError(
                exception,
                "UnhandledException traceId={TraceId} method={Method} path={Path} statusCode={StatusCode} errorCode={ErrorCode}",
                context.TraceIdentifier,
                context.Request.Method,
                context.Request.Path,
                statusCode,
                errorCode);

            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";
            await context.Response.WriteAsJsonAsync(new ApiErrorResponse
            {
                ErrorCode = errorCode,
                Message = message,
                TraceId = context.TraceIdentifier,
                Details = _environment.IsDevelopment() ? exception.Message : null
            });
        }
    }

    private static (int StatusCode, string ErrorCode, string Message) MapException(Exception exception)
    {
        return exception switch
        {
            KeyNotFoundException => (StatusCodes.Status404NotFound, ErrorCodes.NotFound, exception.Message),
            UnauthorizedAccessException => (StatusCodes.Status403Forbidden, ErrorCodes.Forbidden, exception.Message),
            ArgumentException => (StatusCodes.Status400BadRequest, ErrorCodes.ValidationFailed, exception.Message),
            InvalidOperationException => (StatusCodes.Status409Conflict, MapConflictCode(exception.Message), exception.Message),
            DbUpdateException => (StatusCodes.Status500InternalServerError, ErrorCodes.DatabaseError, "Database error occurred"),
            _ => (StatusCodes.Status500InternalServerError, ErrorCodes.InternalServerError, "Internal server error")
        };
    }

    private static string MapConflictCode(string message)
    {
        if (message.Contains("seat", StringComparison.OrdinalIgnoreCase))
        {
            return ErrorCodes.SeatAlreadyBooked;
        }

        if (message.Contains("transaction reference", StringComparison.OrdinalIgnoreCase))
        {
            return ErrorCodes.PaymentDuplicateTransaction;
        }

        return ErrorCodes.Conflict;
    }
}
