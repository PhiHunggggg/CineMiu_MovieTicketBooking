using Microsoft.AspNetCore.Mvc;

namespace API_Service.Infrastructure;

public static class ApiErrors
{
    public static ObjectResult Create(
        ControllerBase controller,
        int statusCode,
        string errorCode,
        string message,
        object? details = null)
    {
        return controller.StatusCode(statusCode, new ApiErrorResponse
        {
            ErrorCode = errorCode,
            Message = message,
            TraceId = controller.HttpContext.TraceIdentifier,
            Details = details
        });
    }

    public static ObjectResult BadRequest(ControllerBase controller, string errorCode, string message, object? details = null) =>
        Create(controller, StatusCodes.Status400BadRequest, errorCode, message, details);

    public static ObjectResult Unauthorized(ControllerBase controller, string errorCode, string message) =>
        Create(controller, StatusCodes.Status401Unauthorized, errorCode, message);

    public static ObjectResult Forbidden(ControllerBase controller, string errorCode, string message) =>
        Create(controller, StatusCodes.Status403Forbidden, errorCode, message);

    public static ObjectResult NotFound(ControllerBase controller, string errorCode, string message) =>
        Create(controller, StatusCodes.Status404NotFound, errorCode, message);

    public static ObjectResult Conflict(ControllerBase controller, string errorCode, string message) =>
        Create(controller, StatusCodes.Status409Conflict, errorCode, message);
}
