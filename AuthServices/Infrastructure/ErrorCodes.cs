namespace AuthServices.Infrastructure;

public static class ErrorCodes
{
    public const string Unauthorized = "ERR_UNAUTHORIZED";
    public const string TokenInvalid = "ERR_TOKEN_INVALID";
    public const string LoginFailed = "ERR_LOGIN_FAILED";
    public const string Forbidden = "ERR_FORBIDDEN";
    public const string ValidationFailed = "ERR_VALIDATION_FAILED";
    public const string NotFound = "ERR_NOT_FOUND";
    public const string Conflict = "ERR_CONFLICT";
    public const string InternalServerError = "ERR_INTERNAL_SERVER_ERROR";
}
