using DTO.Administration;
using DTO.Booking;
using Entities;
using Repository.EFCore.Administration;
using System.Globalization;
using System.Net;
using System.Text;

namespace Services.Administration;

public class NotificationService(
    INotificationRepository repository,
    IEmailSender emailSender) : INotificationService
{
    public Task<List<NotificationDTO.Response>> GetAllAsync(
        int? userId, string? type, string? sentVia, bool unreadOnly) =>
        repository.GetAllAsync(userId, type, sentVia, unreadOnly);

    public async Task<Notification> CreateAsync(NotificationDTO.Request request)
    {
        var recipientEmail = await repository.GetActiveUserEmailAsync(request.UserId);
        if (string.IsNullOrWhiteSpace(recipientEmail))
            throw new ArgumentException("User not found");
        if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Message))
            throw new ArgumentException("Title and message are required");

        var notification = await repository.CreateAsync(new Notification
        {
            UserId = request.UserId,
            Type = Normalize(request.Type, "system"),
            Title = request.Title.Trim(),
            Message = request.Message.Trim(),
            IsRead = false,
            SentVia = Normalize(request.SentVia, "email"),
            CreatedAt = DateTime.UtcNow
        });

        if (notification.SentVia == "email")
        {
            await emailSender.SendAsync(
                recipientEmail,
                notification.Title,
                notification.Message);
        }

        return notification;
    }

    public async Task<Notification> CreatePaymentSuccessAsync(BookingDto.BookingDetailResponse detail)
    {
        var booking = detail.Booking;
        if (booking.UserId <= 0 || string.IsNullOrWhiteSpace(booking.email))
            throw new ArgumentException("Booking user email is required");
        if (detail.Tickets.Count == 0)
            throw new ArgumentException("Paid booking does not contain any tickets");

        const string notificationType = "payment_success";
        var title = $"Thanh toán thành công - Vé xem phim {booking.BookingCode}";
        var plainText = BuildPaymentPlainText(detail);
        var htmlBody = BuildPaymentHtml(detail);

        var notification = await repository.CreateAsync(new Notification
        {
            UserId = booking.UserId,
            Type = notificationType,
            Title = title,
            Message = plainText,
            IsRead = false,
            SentVia = "email",
            CreatedAt = DateTime.UtcNow
        });

        await emailSender.SendAsync(
            booking.email,
            title,
            plainText,
            htmlBody);

        return notification;
    }

    public async Task<Notification> MarkReadAsync(int id, bool isRead)
    {
        var notification = await repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Notification not found");
        notification.IsRead = isRead;
        await repository.SaveAsync(notification);
        return notification;
    }

    public async Task DeleteAsync(int id)
    {
        var notification = await repository.GetByIdAsync(id)
            ?? throw new KeyNotFoundException("Notification not found");
        await repository.DeleteAsync(notification);
    }

    private static string Normalize(string? value, string fallback) =>
        string.IsNullOrWhiteSpace(value) ? fallback : value.Trim().ToLowerInvariant();

    private static string BuildPaymentPlainText(BookingDto.BookingDetailResponse detail)
    {
        var booking = detail.Booking;
        var seats = string.Join(", ", detail.Tickets.Select(x => x.SeatCode));
        var showtime = ToVietnamTime(booking.StartTime);

        return $"""
            Xin chào {booking.FullName},

            CineMiu đã nhận thanh toán cho booking {booking.BookingCode}.
            Phim: {booking.MovieTitle}
            Rạp: {booking.CinemaName} - {booking.HallName}
            Suất chiếu: {showtime:HH:mm, dd/MM/yyyy}
            Ghế: {seats}
            Tổng thanh toán: {FormatCurrency(booking.FinalAmount)}

            Mỗi vé có một mã QR riêng trong phiên bản HTML của email này. Vui lòng xuất trình đúng mã QR khi check-in và có mặt trước giờ chiếu ít nhất 15 phút.

            Cảm ơn bạn đã lựa chọn CineMiu!
            """;
    }

    private static string BuildPaymentHtml(BookingDto.BookingDetailResponse detail)
    {
        var booking = detail.Booking;
        var showtime = ToVietnamTime(booking.StartTime);
        var paidAt = detail.Payments
            .Where(x => x.Status is "paid" or "success")
            .OrderByDescending(x => x.PaidAt)
            .FirstOrDefault()?.PaidAt;

        var ticketCards = new StringBuilder();
        for (var index = 0; index < detail.Tickets.Count; index++)
        {
            var ticket = detail.Tickets[index];
            var qrValue = Uri.EscapeDataString(ticket.QrCode);
            var qrUrl = $"https://api.qrserver.com/v1/create-qr-code/?size=220x220&format=png&margin=10&data={qrValue}";

            if (index % 2 == 0)
                ticketCards.Append("<tr>");

            ticketCards.Append($"""
                <td style="padding:8px;vertical-align:top;width:50%;">
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                         style="border:1px solid #e5e7eb;border-radius:14px;background:#ffffff;">
                    <tr>
                      <td style="padding:18px;text-align:center;">
                        <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Vé CineMiu</div>
                        <div style="font-size:22px;font-weight:700;color:#111827;margin:6px 0;">Ghế {Encode(ticket.SeatCode)}</div>
                        <div style="font-size:13px;color:#6b7280;margin-bottom:12px;">{Encode(ticket.SeatTypeName)}</div>
                        <img src="{qrUrl}" width="190" height="190" alt="QR vé ghế {Encode(ticket.SeatCode)}"
                             style="display:block;width:190px;height:190px;margin:0 auto;border:0;" />
                        <div style="font-size:11px;color:#6b7280;word-break:break-all;margin-top:10px;">
                          {Encode(ticket.QrCode)}
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
                """);

            if (index % 2 == 1)
                ticketCards.Append("</tr>");
        }

        if (detail.Tickets.Count % 2 == 1)
        {
            ticketCards.Append("""
                <td style="padding:8px;width:50%;"></td>
                </tr>
                """);
        }

        var paidAtText = paidAt.HasValue
            ? ToVietnamTime(paidAt.Value).ToString("HH:mm, dd/MM/yyyy")
            : "Đã xác nhận";
        var seats = string.Join(", ", detail.Tickets.Select(x => x.SeatCode));

        return $$"""
            <!doctype html>
            <html lang="vi">
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
            <body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
                <tr>
                  <td align="center" style="padding:28px 12px;">
                    <table role="presentation" width="640" cellpadding="0" cellspacing="0"
                           style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;">
                      <tr>
                        <td style="padding:30px;background:#111827;text-align:center;">
                          <div style="font-size:30px;font-weight:800;color:#fbbf24;letter-spacing:1px;">CineMiu</div>
                          <div style="font-size:14px;color:#d1d5db;margin-top:6px;">Xác nhận thanh toán và vé điện tử</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:32px;">
                          <div style="text-align:center;">
                            <div style="display:inline-block;width:52px;height:52px;line-height:52px;border-radius:50%;
                                        background:#dcfce7;color:#15803d;font-size:28px;font-weight:700;">✓</div>
                            <h1 style="font-size:24px;line-height:32px;margin:16px 0 8px;color:#111827;">
                              Thanh toán thành công
                            </h1>
                            <p style="font-size:15px;line-height:24px;color:#4b5563;margin:0;">
                              Xin chào {{Encode(booking.FullName)}}, booking của bạn đã được xác nhận.
                            </p>
                          </div>

                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
                                 style="margin-top:26px;background:#f9fafb;border-radius:14px;">
                            <tr><td style="padding:20px;">
                              <table role="presentation" width="100%" cellpadding="6" cellspacing="0">
                                <tr><td style="color:#6b7280;">Mã booking</td>
                                    <td align="right" style="font-weight:700;color:#b45309;">{{Encode(booking.BookingCode)}}</td></tr>
                                <tr><td style="color:#6b7280;">Phim</td>
                                    <td align="right" style="font-weight:700;">{{Encode(booking.MovieTitle)}}</td></tr>
                                <tr><td style="color:#6b7280;">Rạp</td>
                                    <td align="right">{{Encode(booking.CinemaName)}} · {{Encode(booking.HallName)}}</td></tr>
                                <tr><td style="color:#6b7280;">Suất chiếu</td>
                                    <td align="right" style="font-weight:700;">{{showtime:HH:mm, dd/MM/yyyy}}</td></tr>
                                <tr><td style="color:#6b7280;">Ghế</td>
                                    <td align="right">{{Encode(seats)}}</td></tr>
                                <tr><td style="color:#6b7280;">Thanh toán lúc</td>
                                    <td align="right">{{paidAtText}}</td></tr>
                                <tr><td style="padding-top:12px;color:#111827;font-weight:700;border-top:1px solid #e5e7eb;">Tổng cộng</td>
                                    <td align="right" style="padding-top:12px;color:#dc2626;font-size:20px;font-weight:800;border-top:1px solid #e5e7eb;">
                                      {{FormatCurrency(booking.FinalAmount)}}
                                    </td></tr>
                              </table>
                            </td></tr>
                          </table>

                          <h2 style="font-size:18px;margin:28px 0 8px;">QR vé của bạn</h2>
                          <p style="font-size:13px;line-height:20px;color:#6b7280;margin:0 0 10px;">
                            Mỗi ghế sử dụng một QR riêng. Không chia sẻ mã này với người khác.
                          </p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                            {{ticketCards}}
                          </table>

                          <div style="margin-top:24px;padding:16px 18px;background:#fffbeb;border-left:4px solid #f59e0b;
                                      border-radius:8px;font-size:13px;line-height:21px;color:#78350f;">
                            Vui lòng có mặt trước giờ chiếu ít nhất 15 phút và mở sẵn email này để quét QR tại quầy soát vé.
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:22px;background:#111827;text-align:center;color:#9ca3af;font-size:12px;line-height:19px;">
                          Đây là email tự động từ CineMiu. Vui lòng không trả lời email này.<br>
                          Chúc bạn có một trải nghiệm điện ảnh tuyệt vời!
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
            """;
    }

    private static string Encode(string? value) => WebUtility.HtmlEncode(value ?? "");

    private static string FormatCurrency(decimal amount) =>
        amount.ToString("#,##0", CultureInfo.GetCultureInfo("vi-VN")) + " ₫";

    private static DateTime ToVietnamTime(DateTime value)
    {
        var utc = value.Kind == DateTimeKind.Utc
            ? value
            : DateTime.SpecifyKind(value, DateTimeKind.Utc);
        try
        {
            return TimeZoneInfo.ConvertTimeFromUtc(
                utc,
                TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time"));
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.ConvertTimeFromUtc(
                utc,
                TimeZoneInfo.FindSystemTimeZoneById("Asia/Ho_Chi_Minh"));
        }
    }
}
