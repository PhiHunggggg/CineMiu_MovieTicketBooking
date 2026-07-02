namespace API_Service.Infrastructure;

public static class ErrorCodes
{
    public const string Unauthorized = "ERR_UNAUTHORIZED";
    public const string TokenInvalid = "ERR_TOKEN_INVALID";
    public const string TokenExpired = "ERR_TOKEN_EXPIRED";
    public const string LoginFailed = "ERR_LOGIN_FAILED";
    public const string Forbidden = "ERR_FORBIDDEN";
    public const string ValidationFailed = "ERR_VALIDATION_FAILED";
    public const string NotFound = "ERR_NOT_FOUND";
    public const string Conflict = "ERR_CONFLICT";
    public const string DatabaseError = "ERR_DATABASE_ERROR";
    public const string InternalServerError = "ERR_INTERNAL_SERVER_ERROR";

    public const string BookingNotFound = "ERR_BOOKING_NOT_FOUND";
    public const string BookingAccessDenied = "ERR_BOOKING_ACCESS_DENIED";
    public const string BookingAlreadyPaid = "ERR_BOOKING_ALREADY_PAID";
    public const string BookingNotPayable = "ERR_BOOKING_NOT_PAYABLE";
    public const string SeatAlreadyBooked = "ERR_SEAT_ALREADY_BOOKED";
    public const string SeatAlreadyLocked = "ERR_SEAT_ALREADY_LOCKED";
    public const string SeatLockExpired = "ERR_SEAT_LOCK_EXPIRED";
    public const string ShowtimeNotFound = "ERR_SHOWTIME_NOT_FOUND";
    public const string ShowtimeExpired = "ERR_SHOWTIME_EXPIRED";

    public const string PaymentFailed = "ERR_PAYMENT_FAILED";
    public const string PaymentDuplicateTransaction = "ERR_PAYMENT_DUPLICATE_TRANSACTION";
    public const string PaymentMethodNotFound = "ERR_PAYMENT_METHOD_NOT_FOUND";
    public const string PaymentConflict = "ERR_PAYMENT_CONFLICT";
    public const string RefundNotAllowed = "ERR_REFUND_NOT_ALLOWED";

    public const string TicketNotFound = "ERR_TICKET_NOT_FOUND";
    public const string TicketAlreadyUsed = "ERR_TICKET_ALREADY_USED";
    public const string TicketNotPaid = "ERR_TICKET_NOT_PAID";
    public const string CheckInForbidden = "ERR_CHECKIN_FORBIDDEN";
}
