using DTO.Booking;
using Entities;
using Libs.Booking;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;
using static DTO.Booking.BookingDto;
using static Entities.Bookings;
using static Libs.Booking.PromotionValidation;
using Repository.Pricing;
namespace Repository.EFCore.Bookings
{
    public class BookingRepository(SqlServerDbContext context) : IBookingRepository
    {
        public Task<List<BookingDto.BookingResponse>> GetAllAsync(string? keyword, string? status, int? cinemaId, DateTime? date)
        {
            var query = from booking in context.Bookings.AsNoTracking()
                        join user in context.Users.AsNoTracking() on booking.UserId equals user.UserId
                        join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                        join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                        join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                        join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                        select new { booking, user, showtime, movie, hall, cinema };
            if (!string.IsNullOrEmpty(keyword))
            {
                var search = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.booking.BookingCode.ToLower().Contains(search) ||
                    x.user.FullName.ToLower().Contains(search) ||
                    x.user.Email.ToLower().Contains(search) ||
                    (x.user.Phone != null && x.user.Phone.ToLower().Contains(search))
                );
            }
            if (!string.IsNullOrEmpty(status))
            {
                query = query.Where(x => x.booking.Status.ToLower() == status.Trim().ToLower());
            }
            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.cinema.CinemaId == cinemaId.Value);
            }
            if (date.HasValue)
            {
                var dateOnly = date.Value.Date;
                query = query.Where(x => x.showtime.StartTime.Date == dateOnly);
            }
            var result = query.Select(x => new BookingDto.BookingResponse
            {
                BookingId = x.booking.BookingId,
                BookingCode = x.booking.BookingCode,
                UserId = x.booking.UserId,
                FullName = x.user.FullName,
                email = x.user.Email,
                phone = x.user.Phone,
                ShowtimeId = x.booking.ShowtimeId,
                TotalAmount = x.booking.TotalAmount,
                DiscountAmount = x.booking.DiscountAmount,
                FinalAmount = x.booking.FinalAmount,
                Status = x.booking.Status,
                BookingChannel = x.booking.BookingChannel,
                CreatedAt = x.booking.CreatedAt,
                ConfirmedAt = x.booking.ConfirmedAt,
                CancelledAt = x.booking.CancelledAt,
                CancelReason = x.booking.CancelReason,
                MovieTitle = x.movie.Title,
                CinemaName = x.cinema.CinemaName,
                HallName = x.hall.HallName,
                StartTime = x.showtime.StartTime,
                EndTime = x.showtime.EndTime,
                TicketCount = context.Tickets.Count(t => t.BookingId == x.booking.BookingId),
                UsedTicketCount = context.Tickets.Count(t => t.BookingId == x.booking.BookingId && t.IsUsed),
                RefundAmount = context.Payments
                    .Where(p => p.BookingId == x.booking.BookingId)
                    .Sum(p => p.RefundAmount ?? 0),
                RefundedAt = context.Payments
                    .Where(p => p.BookingId == x.booking.BookingId && p.RefundedAt != null)
                    .Max(p => p.RefundedAt)
            }).ToListAsync();

            return result;
        }
        public async Task<BookingDto.BookingResponse?> GetByIdAsync(int id)
        {
            var result = await (from booking in context.Bookings.AsNoTracking()
                                join user in context.Users.AsNoTracking() on booking.UserId equals user.UserId
                                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                                where booking.BookingId == id
                                select new BookingDto.BookingResponse
                                {
                                    BookingId = booking.BookingId,
                                    BookingCode = booking.BookingCode,
                                    UserId = booking.UserId,
                                    FullName = user.FullName,
                                    email = user.Email,
                                    phone = user.Phone,
                                    ShowtimeId = booking.ShowtimeId,
                                    TotalAmount = booking.TotalAmount,
                                    DiscountAmount = booking.DiscountAmount,
                                    FinalAmount = booking.FinalAmount,
                                    Status = booking.Status,
                                    BookingChannel = booking.BookingChannel,
                                    CreatedAt = booking.CreatedAt,
                                    ConfirmedAt = booking.ConfirmedAt,
                                    CancelledAt = booking.CancelledAt,
                                    CancelReason = booking.CancelReason,
                                    MovieTitle = movie.Title,
                                    CinemaName = cinema.CinemaName,
                                    HallName = hall.HallName,
                                    StartTime = showtime.StartTime,
                                    EndTime = showtime.EndTime,
                                    TicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId),
                                    UsedTicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId && t.IsUsed),
                                    RefundAmount = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId)
                                        .Sum(p => p.RefundAmount ?? 0),
                                    RefundedAt = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId && p.RefundedAt != null)
                                        .Max(p => p.RefundedAt)
                                }).FirstOrDefaultAsync();
            return result;
        }
        public async Task<BookingDto.BookingDetailResponse?> GetDetailAsync(int id)
        {
            var booking = await GetByIdAsync(id);
            if (booking == null)
            {
                return null;
            }

            var tickets = await (from ticket in context.Tickets.AsNoTracking()
                                 join seat in context.Seats.AsNoTracking() on ticket.SeatId equals seat.SeatId
                                 join seatType in context.SeatTypes.AsNoTracking() on ticket.SeatTypeId equals seatType.SeatTypeId
                                 where ticket.BookingId == id
                                 orderby seat.RowLabel, seat.ColNumber
                                 select new BookingDto.TicketResponse
                                 {
                                     TicketId = ticket.TicketId,
                                     BookingId = ticket.BookingId,
                                     SeatId = ticket.SeatId,
                                     SeatCode = seat.SeatCode,
                                     SeatTypeId = ticket.SeatTypeId,
                                     SeatTypeName = seatType.TypeName,
                                     Price = ticket.Price,
                                     QrCode = ticket.QrCode,
                                     IsUsed = ticket.IsUsed,
                                     UsedAt = ticket.UsedAt,
                                     CheckedBy = ticket.CheckedBy
                                 }).ToListAsync();

            var concessions = await (from concession in context.BookingConcessions.AsNoTracking()
                                     join item in context.ConcessionItems.AsNoTracking() on concession.ItemId equals item.ItemId into itemJoin
                                     from item in itemJoin.DefaultIfEmpty()
                                     where concession.BookingId == id
                                     orderby concession.Id
                                     select new BookingDto.BookingConcessionResponse
                                     {
                                         Id = concession.Id,
                                         BookingId = concession.BookingId,
                                         ItemId = concession.ItemId,
                                         ItemName = item != null ? item.ItemName : "",
                                         Quantity = concession.Quantity,
                                         UnitPrice = concession.UnitPrice,
                                         Subtotal = concession.Subtotal
                                     }).ToListAsync();

            var payments = await context.Payments
                .AsNoTracking()
                .Where(x => x.BookingId == id)
                .OrderByDescending(x => x.PaidAt ?? DateTime.MinValue)
                .ThenByDescending(x => x.PaymentId)
                .Select(x => new BookingDto.PaymentResponse
                {
                    PaymentId = x.PaymentId,
                    BookingId = x.BookingId,
                    MethodId = x.MethodId,
                    TransactionRef = x.TransactionRef,
                    Amount = x.Amount,
                    Currency = x.Currency,
                    Status = x.Status,
                    PaidAt = x.PaidAt,
                    RefundAmount = x.RefundAmount,
                    RefundedAt = x.RefundedAt
                })
                .ToListAsync();

            return new BookingDto.BookingDetailResponse
            {
                Booking = booking,
                Tickets = tickets,
                Concessions = concessions,
                Payments = payments
            };
        }
        public async Task<BookingDto.BookingResponse?> GetByBookingCodeAsync(string bookingCode)
        {
            var result = await (from booking in context.Bookings.AsNoTracking()
                                join user in context.Users.AsNoTracking() on booking.UserId equals user.UserId
                                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                                where booking.BookingCode == bookingCode
                                select new BookingDto.BookingResponse
                                {
                                    BookingId = booking.BookingId,
                                    BookingCode = booking.BookingCode,
                                    UserId = booking.UserId,
                                    FullName = user.FullName,
                                    email = user.Email,
                                    phone = user.Phone,
                                    ShowtimeId = booking.ShowtimeId,
                                    TotalAmount = booking.TotalAmount,
                                    DiscountAmount = booking.DiscountAmount,
                                    FinalAmount = booking.FinalAmount,
                                    Status = booking.Status,
                                    BookingChannel = booking.BookingChannel,
                                    CreatedAt = booking.CreatedAt,
                                    ConfirmedAt = booking.ConfirmedAt,
                                    CancelledAt = booking.CancelledAt,
                                    CancelReason = booking.CancelReason,
                                    MovieTitle = movie.Title,
                                    CinemaName = cinema.CinemaName,
                                    HallName = hall.HallName,
                                    StartTime = showtime.StartTime,
                                    EndTime = showtime.EndTime,
                                    TicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId),
                                    UsedTicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId && t.IsUsed),
                                    RefundAmount = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId)
                                        .Sum(p => p.RefundAmount ?? 0),
                                    RefundedAt = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId && p.RefundedAt != null)
                                        .Max(p => p.RefundedAt)
                                }).FirstOrDefaultAsync();
            return result;
        }
        public async Task<BookingDto.BookingResponse?> GetByUser(int userId)
        {
            var result = await (from booking in context.Bookings.AsNoTracking()
                                join user in context.Users.AsNoTracking() on booking.UserId equals user.UserId
                                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                                where booking.UserId == userId
                                select new BookingDto.BookingResponse
                                {
                                    BookingId = booking.BookingId,
                                    BookingCode = booking.BookingCode,
                                    UserId = booking.UserId,
                                    FullName = user.FullName,
                                    email = user.Email,
                                    phone = user.Phone,
                                    ShowtimeId = booking.ShowtimeId,
                                    TotalAmount = booking.TotalAmount,
                                    DiscountAmount = booking.DiscountAmount,
                                    FinalAmount = booking.FinalAmount,
                                    Status = booking.Status,
                                    BookingChannel = booking.BookingChannel,
                                    CreatedAt = booking.CreatedAt,
                                    ConfirmedAt = booking.ConfirmedAt,
                                    CancelledAt = booking.CancelledAt,
                                    CancelReason = booking.CancelReason,
                                    MovieTitle = movie.Title,
                                    CinemaName = cinema.CinemaName,
                                    HallName = hall.HallName,
                                    StartTime = showtime.StartTime,
                                    EndTime = showtime.EndTime,
                                    TicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId),
                                    UsedTicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId && t.IsUsed),
                                    RefundAmount = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId)
                                        .Sum(p => p.RefundAmount ?? 0),
                                    RefundedAt = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId && p.RefundedAt != null)
                                        .Max(p => p.RefundedAt)
                                }).FirstOrDefaultAsync();
            return result;
        }
        public async Task<BookingDto.BookingResponse?> GetByUserEmail(string email)
        {
            var result = await (from booking in context.Bookings.AsNoTracking()
                                join user in context.Users.AsNoTracking() on booking.UserId equals user.UserId
                                join showtime in context.ShowTimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                                join movie in context.Movies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                                join hall in context.Halls.AsNoTracking() on showtime.HallId equals hall.HallId
                                join cinema in context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                                where user.Email == email
                                select new BookingDto.BookingResponse
                                {
                                    BookingId = booking.BookingId,
                                    BookingCode = booking.BookingCode,
                                    UserId = booking.UserId,
                                    FullName = user.FullName,
                                    email = user.Email,
                                    phone = user.Phone,
                                    ShowtimeId = booking.ShowtimeId,
                                    TotalAmount = booking.TotalAmount,
                                    DiscountAmount = booking.DiscountAmount,
                                    FinalAmount = booking.FinalAmount,
                                    Status = booking.Status,
                                    BookingChannel = booking.BookingChannel,
                                    CreatedAt = booking.CreatedAt,
                                    ConfirmedAt = booking.ConfirmedAt,
                                    CancelledAt = booking.CancelledAt,
                                    CancelReason = booking.CancelReason,
                                    MovieTitle = movie.Title,
                                    CinemaName = cinema.CinemaName,
                                    HallName = hall.HallName,
                                    StartTime = showtime.StartTime,
                                    EndTime = showtime.EndTime,
                                    TicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId),
                                    UsedTicketCount = context.Tickets.Count(t => t.BookingId == booking.BookingId && t.IsUsed),
                                    RefundAmount = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId)
                                        .Sum(p => p.RefundAmount ?? 0),
                                    RefundedAt = context.Payments
                                        .Where(p => p.BookingId == booking.BookingId && p.RefundedAt != null)
                                        .Max(p => p.RefundedAt)
                                }).FirstOrDefaultAsync();
            return result;
        }
        public async Task<int> Create(BookingDto.BookingCreateRequest request)
        {
            try
            {
                if (!await context.Users.AnyAsync(u => u.UserId == request.UserId))
                {
                    throw new Exception("User not found");
                }
                var showtime = await context.ShowTimes.FirstOrDefaultAsync(s => s.ShowtimeId == request.ShowtimeId);
                if (showtime == null)
                {
                    throw new Exception("Showtime not found");
                }

                if (string.Equals(showtime.Status, "cancelled", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(showtime.Status, "completed", StringComparison.OrdinalIgnoreCase) ||
                    showtime.EndTime <= DateTime.Now)
                {
                    throw new Exception("This showtime is no longer available");
                }

                var hall = await context.Halls.AsNoTracking()
                    .FirstOrDefaultAsync(x => x.HallId == showtime.HallId);
                if (hall == null || !string.Equals(hall.Status, "active", StringComparison.OrdinalIgnoreCase))
                {
                    throw new Exception("The hall is currently unavailable");
                }

                if (request.Seats == null || request.Seats.Count == 0)
                {
                    throw new Exception("At least one seat must be selected");
                }
                if (request.SeatIds.Count != request.SeatIds.Distinct().Count())
                {
                    throw new Exception("Duplicate seats are not allowed");
                }
                var seats = await context.Seats
                    .Where(s =>
                        request.SeatIds.Contains(s.SeatId) &&
                        s.HallId == showtime.HallId &&
                        s.IsActive)
                    .ToListAsync();
                if (seats.Count != request.SeatIds.Distinct().Count())
                {
                    throw new Exception("Some selected seats do not exist or are inactive");
                }

                var unavailabeSeats = await context.Tickets
                    .Join(context.Bookings.Where(x => x.ShowtimeId == request.ShowtimeId && x.Status != "cancelled"), t => t.BookingId, b => b.BookingId, (t, b) => t.SeatId)
                    .Where(seatId => request.SeatIds.Contains(seatId))
                    .ToListAsync();
                if (unavailabeSeats.Count > 0)
                {
                    throw new Exception("Some selected seats are not available");
                }
                var seatTypeIds = seats.Select(x => x.SeatTypeId).Distinct().ToList();
                var seatTypes = await context.SeatTypes.AsNoTracking()
                    .Where(x => seatTypeIds.Contains(x.SeatTypeId))
                    .ToDictionaryAsync(x => x.SeatTypeId);
                var standardSeatTypeId = await context.SeatTypes.AsNoTracking()
                    .Where(x => x.TypeName.ToLower().Contains("standard"))
                    .OrderBy(x => x.SeatTypeId)
                    .Select(x => x.SeatTypeId)
                    .FirstOrDefaultAsync();
                if (standardSeatTypeId == 0)
                {
                    standardSeatTypeId = await context.SeatTypes.AsNoTracking()
                        .OrderBy(x => x.SeatTypeId)
                        .Select(x => x.SeatTypeId)
                        .FirstOrDefaultAsync();
                }

                var dayTypes = await context.DayTypes.AsNoTracking().ToListAsync();
                var priceSeatTypeIds = seatTypeIds.Append(standardSeatTypeId).Distinct().ToList();
                var priceRules = await context.TicketPrices.AsNoTracking()
                    .Where(x =>
                        x.CinemaId == hall.CinemaId &&
                        x.HallTypeId == hall.HallTypeId &&
                        priceSeatTypeIds.Contains(x.SeatTypeId))
                    .ToListAsync();
                var calculatedPrices = seats.ToDictionary(
                    seat => seat.SeatId,
                    seat => TicketPriceCalculator.ResolvePrice(
                        showtime,
                        hall.CinemaId,
                        hall.HallTypeId,
                        seat.SeatTypeId,
                        seatTypes.GetValueOrDefault(seat.SeatTypeId)?.PriceModifier ?? 0,
                        standardSeatTypeId,
                        dayTypes,
                        priceRules));

                if (request.Seats.Any(x =>
                        !calculatedPrices.TryGetValue(x.SeatId, out var calculatedPrice) ||
                        x.Price != calculatedPrice))
                {
                    throw new Exception("Ticket prices have changed. Please refresh the seat map before booking");
                }

                var ticketTotal = calculatedPrices.Values.Sum();
                var itemIds = request.Concessions.Select(c => c.ItemId).Distinct().ToList();
                var items = await context.ConcessionItems.Where(x => itemIds.Contains(x.ItemId)).ToDictionaryAsync(x => x.ItemId);
                if (request.Concessions.Any(x => x.Quantity <= 0))
                {
                    throw new Exception("Concession quantity must be greater than 0");
                }

                if (seats.Any(s => s.HallId != showtime.HallId || !s.IsActive))
                {
                    throw new Exception("Some selected seats are not valid for this showtime");
                }

                if (items.Count != itemIds.Count)
                {
                    throw new Exception("Some concessions were not found");
                }

                var concessionTotal = request.Concessions.Sum(x => items.TryGetValue(x.ItemId, out var item) ? item.Price * x.Quantity : 0);
                var totalAmount = ticketTotal + concessionTotal;
                var promoValidation = await ValidatePromotionForBooking(request.PromoCode, request.UserId, totalAmount);
                if (!promoValidation.IsValid)
                {
                    throw new Exception(promoValidation.Message);
                }

                var discountAmount = promoValidation.DiscountAmount;

                var booking = new Entities.Bookings.Booking
                {
                    UserId = request.UserId,
                    ShowtimeId = request.ShowtimeId,
                    BookingCode = string.IsNullOrWhiteSpace(request.BookingCode) ? $"BT{DateTime.UtcNow:yyyyMMddHHmmssfff}" : request.BookingCode,
                    TotalAmount = totalAmount,
                    DiscountAmount = discountAmount,
                    FinalAmount = Math.Max(0, totalAmount - discountAmount),
                    Status = "pending",
                    BookingChannel = request.BookingChannel ?? "web",
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                    Notes = string.IsNullOrWhiteSpace(request.PromoCode)
                        ? request.Notes
                        : string.Join(" | ", new[] { request.Notes, $"Promo:{request.PromoCode.Trim().ToUpperInvariant()}" }.Where(x => !string.IsNullOrWhiteSpace(x)))
                };
                context.Bookings.Add(booking);
                await context.SaveChangesAsync();

                var seatLookup = seats.ToDictionary(x => x.SeatId);
                foreach (var requestedSeat in request.Seats)
                {
                    var seat = seatLookup[requestedSeat.SeatId];
                    context.Tickets.Add(new Tickets.Ticket
                    {
                        BookingId = booking.BookingId,
                        SeatId = seat.SeatId,
                        SeatTypeId = seat.SeatTypeId,
                        Price = calculatedPrices[requestedSeat.SeatId],
                        QrCode = string.IsNullOrWhiteSpace(requestedSeat.QrCode)
                            ? Guid.NewGuid().ToString("N")
                            : requestedSeat.QrCode
                    });
                }
                foreach (var requestedItem in request.Concessions)
                {
                    if (!items.TryGetValue(requestedItem.ItemId, out var item))
                    {
                        continue;
                    }

                    context.BookingConcessions.Add(new Entities.Bookings.BookingConcession
                    {
                        BookingId = booking.BookingId,
                        ItemId = item.ItemId,
                        Quantity = requestedItem.Quantity,
                        UnitPrice = item.Price,
                        Subtotal = item.Price * requestedItem.Quantity
                    });
                }

                var selectedSeatIds = request.SeatIds.Distinct().ToList();
                context.SeatLocks.RemoveRange(context.SeatLocks.Where(x =>
                    x.ShowtimeId == request.ShowtimeId && selectedSeatIds.Contains(x.SeatId)));

                if (promoValidation.Promotion != null && discountAmount > 0)
                {
                    promoValidation.Promotion.TotalUses += 1;
                    context.PromoUsages.Add(new PromoUsage
                    {
                        PromoId = promoValidation.Promotion.PromoId,
                        UserId = request.UserId,
                        BookingId = booking.BookingId,
                        UsedAt = DateTime.UtcNow
                    });
                }

                await context.SaveChangesAsync();
                return booking.BookingId;
            }
            catch (DbUpdateException dbEx)
            {
                var innerMsg = dbEx.InnerException?.Message ?? dbEx.Message;
                Console.WriteLine($"[BookingsController] DB Error: {innerMsg}");
                throw new Exception("Database error occurred");
            }
            catch (InvalidOperationException ex)
            {
                throw new Exception(ex.Message);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BookingsController] Error: {ex}");
                throw new Exception(ex.Message);
            }
        }
        public async Task Cancel(int bookingId, BookingDto.CancelBookingDto cancelReason, int currentUserId, string currentUserRole, int? currentUserCinemaId)
        {
            var booking = await context.Bookings.FirstOrDefaultAsync(b => b.BookingId == bookingId);
            if (booking == null)
            {
                throw new Exception("Booking not found");
            }

            // Authorization check
            var isUserOwner = booking.UserId == currentUserId;
            var isAdmin = string.Equals(currentUserRole, "admin", StringComparison.OrdinalIgnoreCase);
            var isManager = string.Equals(currentUserRole, "cinema_manager", StringComparison.OrdinalIgnoreCase);

            if (!isUserOwner && !isAdmin && !isManager)
            {
                throw new Exception("You are not authorized to cancel this booking");
            }

            if (isManager)
            {
                var bookingCinemaId = await (from b in context.Bookings
                                             join s in context.ShowTimes on b.ShowtimeId equals s.ShowtimeId
                                             join h in context.Halls on s.HallId equals h.HallId
                                             where b.BookingId == bookingId
                                             select (int?)h.CinemaId).FirstOrDefaultAsync();

                if (bookingCinemaId != currentUserCinemaId)
                {
                    throw new Exception("Cinema managers can only cancel bookings for their own cinema");
                }
            }
            if (booking.Status == "cancelled")
            {
                throw new Exception("Booking is already cancelled");
            }
            booking.Status = "cancelled";
            booking.CancelledAt = DateTime.UtcNow;
            booking.CancelReason = cancelReason.Reason;

            var seatIds = await context.Tickets.Where(t => t.BookingId == bookingId).Select(t => t.SeatId).ToListAsync();

            if(seatIds.Count > 0)
            {
                context.SeatLocks.RemoveRange(context.SeatLocks.Where(x =>
                    x.ShowtimeId == booking.ShowtimeId && seatIds.Contains(x.SeatId)));
            }
            await context.SaveChangesAsync();
        }
        public async Task RefundAsync(int bookingId, BookingDto.RefundBookingDto refund)
        {
            var booking = await context.Bookings.FirstOrDefaultAsync(b => b.BookingId == bookingId);
            if (booking == null)
            {
                throw new Exception("Booking not found");
            }

            var usedTicketCount = await context.Tickets.CountAsync(t => t.BookingId == bookingId && t.IsUsed);
            if (usedTicketCount > 0)
            {
                throw new Exception("Cannot refund a booking with checked-in tickets");
            }

            if (booking.FinalAmount <= 0)
            {
                throw new Exception("Booking has no refundable amount");
            }

            var payments = await context.Payments
                .Where(x => x.BookingId == bookingId)
                .OrderBy(x => x.PaymentId)
                .ToListAsync();

            var refundedAmount = payments.Sum(x => x.RefundAmount ?? 0);
            var remainingRefund = booking.FinalAmount - refundedAmount;
            if (remainingRefund <= 0)
            {
                throw new Exception("Booking has already been refunded");
            }

            var now = DateTime.UtcNow;

            if (payments.Count == 0)
            {
                context.Payments.Add(new Entities.Bookings.Payment
                {
                    BookingId = bookingId,
                    MethodId = 1,
                    TransactionRef = $"ADMIN-REFUND-{booking.BookingCode}",
                    Amount = booking.FinalAmount,
                    Currency = "VND",
                    Status = "refunded",
                    GatewayResponse = refund.Reason,
                    PaidAt = booking.ConfirmedAt ?? booking.CreatedAt,
                    RefundAmount = booking.FinalAmount,
                    RefundedAt = now
                });
            }
            else
            {
                foreach (var payment in payments)
                {
                    if (remainingRefund <= 0)
                    {
                        break;
                    }

                    var alreadyRefunded = payment.RefundAmount ?? 0;
                    var refundableFromPayment = Math.Max(payment.Amount - alreadyRefunded, 0);
                    if (refundableFromPayment <= 0)
                    {
                        continue;
                    }

                    var amount = Math.Min(refundableFromPayment, remainingRefund);
                    payment.RefundAmount = alreadyRefunded + amount;
                    payment.RefundedAt = now;
                    payment.Status = payment.RefundAmount >= payment.Amount ? "refunded" : "partial_refund";
                    payment.GatewayResponse = string.IsNullOrWhiteSpace(refund.Reason)
                        ? payment.GatewayResponse
                        : refund.Reason;
                    remainingRefund -= amount;
                }
            }

            booking.Status = "cancelled";
            booking.CancelledAt ??= now;
            booking.CancelReason = string.IsNullOrWhiteSpace(refund.Reason)
                ? booking.CancelReason ?? "Refunded by administrator"
                : refund.Reason;

            var seatIds = await context.Tickets
                .Where(t => t.BookingId == bookingId)
                .Select(t => t.SeatId)
                .ToListAsync();

            if (seatIds.Count > 0)
            {
                context.SeatLocks.RemoveRange(context.SeatLocks.Where(x =>
                    x.ShowtimeId == booking.ShowtimeId && seatIds.Contains(x.SeatId)));
            }

            await context.SaveChangesAsync();
        }
        public async Task<int?> GetBookingIdByTicketQrAsync(string qrCode)
        {
            if (string.IsNullOrWhiteSpace(qrCode))
            {
                return null;
            }

            var normalizedQrCode = qrCode.Trim();
            return await context.Tickets
                .AsNoTracking()
                .Where(x => x.QrCode == normalizedQrCode)
                .Select(x => (int?)x.BookingId)
                .FirstOrDefaultAsync();
        }
        private async Task<BookingPromotionValidation> ValidatePromotionForBooking(string? promoCode, int userId, decimal orderAmount)
        {
            if (string.IsNullOrWhiteSpace(promoCode))
            {
                return BookingPromotionValidation.Valid(null, 0);
            }

            if (userId <= 0)
            {
                return BookingPromotionValidation.Invalid("User is required to use voucher");
            }

            var code = promoCode.Trim().ToUpperInvariant();
            var promotion = await context.Promotions.FirstOrDefaultAsync(x => x.PromoCode == code);
            if (promotion == null)
            {
                return BookingPromotionValidation.Invalid("Voucher not found");
            }

            var now = DateTime.UtcNow;
            if (!promotion.IsActive)
            {
                return BookingPromotionValidation.Invalid("Voucher is not active");
            }

            if (promotion.ValidFrom > now)
            {
                return BookingPromotionValidation.Invalid("Voucher is not active yet");
            }

            if (promotion.ValidTo < now)
            {
                return BookingPromotionValidation.Invalid("Voucher has expired");
            }

            if (promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value)
            {
                return BookingPromotionValidation.Invalid("Voucher usage limit has been reached");
            }

            if (orderAmount < promotion.MinOrderAmt)
            {
                return BookingPromotionValidation.Invalid($"Minimum order amount is {promotion.MinOrderAmt:n0}");
            }

            var userUses = await context.PromoUsages.CountAsync(x => x.PromoId == promotion.PromoId && x.UserId == userId);
            if (userUses >= promotion.PerUserLimit)
            {
                return BookingPromotionValidation.Invalid("You have reached the usage limit for this voucher");
            }

            var discountAmount = CalculateDiscount(promotion, orderAmount);
            if (discountAmount <= 0)
            {
                return BookingPromotionValidation.Invalid("Voucher does not apply to this order");
            }

            return BookingPromotionValidation.Valid(promotion, discountAmount);
        }
        private static decimal CalculateDiscount(Entities.Promotion promotion, decimal orderAmount)
        {
            if (orderAmount <= 0)
            {
                return 0;
            }

            decimal discountAmount;
            if (promotion.DiscountType == "percent")
            {
                discountAmount = orderAmount * promotion.DiscountValue / 100m;
                if (promotion.MaxDiscount.HasValue)
                {
                    discountAmount = Math.Min(discountAmount, promotion.MaxDiscount.Value);
                }
            }
            else
            {
                discountAmount = promotion.DiscountValue;
            }

            discountAmount = Math.Min(discountAmount, orderAmount);
            return Math.Round(discountAmount, 0, MidpointRounding.AwayFromZero);
        }
        public async Task<(Booking? booking,
                           Users? user,
                           List<Tickets.Ticket> tickets)>
        GetCheckInDataAsync(
            int bookingId,
            int userId,
            TicketCheckInDto dto)
        {
            var booking = await context.Bookings
                .FirstOrDefaultAsync(x => x.BookingId == bookingId);

            var user = await context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.UserId == userId);

            IQueryable<Tickets.Ticket> ticketsQuery =
                context.Tickets
                .Where(x => x.BookingId == bookingId);

            if (dto.TicketId.HasValue)
            {
                ticketsQuery = ticketsQuery
                    .Where(x => x.TicketId == dto.TicketId.Value);
            }

            if (!string.IsNullOrWhiteSpace(dto.QrCode))
            {
                var qrCode = dto.QrCode.Trim();

                ticketsQuery = ticketsQuery
                    .Where(x => x.QrCode == qrCode);
            }

            var tickets = await ticketsQuery.ToListAsync();

            return (booking, user, tickets);
        }
        public async Task<bool> HasRemainingUnusedTicketsAsync(
        int bookingId,
        List<int> checkedTicketIds)
        {
                return await context.Tickets
                    .AnyAsync(x =>
                        x.BookingId == bookingId &&
                        !x.IsUsed &&
                        !checkedTicketIds.Contains(x.TicketId));
        }
        public async Task SaveChangesAsync()
        {
            await context.SaveChangesAsync();
        }
    }
}


