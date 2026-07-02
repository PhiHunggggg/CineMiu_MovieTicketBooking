namespace AuthServices.Infrastructure;

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
            var statusCode = exception switch
            {
                KeyNotFoundException => StatusCodes.Status404NotFound,
                UnauthorizedAccessException => StatusCodes.Status403Forbidden,
                ArgumentException => StatusCodes.Status400BadRequest,
                InvalidOperationException => StatusCodes.Status409Conflict,
                _ => StatusCodes.Status500InternalServerError
            };
            var errorCode = statusCode switch
            {
                StatusCodes.Status404NotFound => ErrorCodes.NotFound,
                StatusCodes.Status403Forbidden => ErrorCodes.Forbidden,
                StatusCodes.Status400BadRequest => ErrorCodes.ValidationFailed,
                StatusCodes.Status409Conflict => ErrorCodes.Conflict,
                _ => ErrorCodes.InternalServerError
            };

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
                Message = statusCode == StatusCodes.Status500InternalServerError ? "Internal server error" : exception.Message,
                TraceId = context.TraceIdentifier,
                Details = _environment.IsDevelopment() ? exception.Message : null
            });
        }
    }
}
