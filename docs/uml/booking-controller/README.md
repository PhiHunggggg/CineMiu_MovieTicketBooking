# Mermaid luồng BookingsController

Mỗi file `.mmd` tương ứng một endpoint trong `API_Service/Controllers/BookingController.cs`:

1. `01-get-all.mmd` — `GetAll`
2. `02-get-by-code.mmd` — `GetByCode`
3. `03-get-by-id.mmd` — `GetById`
4. `04-get-by-user.mmd` — `GetByUser`
5. `05-get-by-user-email.mmd` — `GetByUserEmail`
6. `06-create.mmd` — `Create`
7. `07-add-payment.mmd` — `AddPayment`
8. `08-cancel.mmd` — `Cancel`
9. `09-refund.mmd` — `Refund`
10. `10-check-in-by-ticket.mmd` — `CheckInByTicket`
11. `11-check-in-by-booking.mmd` — `CheckIn`

Render bằng Mermaid Live Editor hoặc Mermaid CLI:

```powershell
mmdc -i docs/uml/booking-controller/01-get-all.mmd -o get-all-bookings.png
```

Các sơ đồ bám theo implementation hiện tại trong Controller, `BookkingService` và `BookingRepository`, bao gồm cả LoyaltyService ở luồng thanh toán.
