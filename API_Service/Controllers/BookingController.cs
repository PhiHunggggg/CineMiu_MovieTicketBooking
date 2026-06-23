using Entities;
using Repository;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Services;
using Services.Booking;
using Services.Theater;
using Services.Loyalty;
using DTO.Common;
using DTO.Booking;
using System.Security.Claims;
using Repository.Pricing;

namespace API_Service.Controllers
{
    [Route("api/bookings")]
    [ApiController]
    public class BookingsController : ControllerBase
    {
        private const string CheckInRoles = "admin,ticket_staff,staff,cinema_manager,manager";
        private static readonly HashSet<string> CheckInRoleNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "admin",
            "ticket_staff",
            "staff",
            "cinema_manager",
            "manager"
        };

        private readonly SqlServerDbContext _context;
        private readonly ILoyaltyService _loyaltyService;
        private readonly IBookingService _bookingService;

        public BookingsController(SqlServerDbContext context, ILoyaltyService loyaltyService, IBookingService bookingService)
        {
            _context = context;
            _loyaltyService = loyaltyService;
            _bookingService = bookingService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? keyword,
            [FromQuery] string? status,
            [FromQuery] int? movieId,
            [FromQuery] int? cinemaId,
            [FromQuery] DateTime? date,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 100)
        {
            page = Math.Max(1, page);
            pageSize = Math.Clamp(pageSize, 1, 500);

            var query =
                from booking in _context.CinemaBookings.AsNoTracking()
                join user in _context.CinemaUsers.AsNoTracking() on booking.UserId equals user.UserId
                join showtime in _context.CinemaShowtimes.AsNoTracking() on booking.ShowtimeId equals showtime.ShowtimeId
                join movie in _context.CinemaMovies.AsNoTracking() on showtime.MovieId equals movie.MovieId
                join hall in _context.CinemaHalls.AsNoTracking() on showtime.HallId equals hall.HallId
                join cinema in _context.Cinemas.AsNoTracking() on hall.CinemaId equals cinema.CinemaId
                select new { booking, user, showtime, movie, hall, cinema };

            if (!string.IsNullOrWhiteSpace(keyword))
            {
                var search = keyword.Trim().ToLower();
                query = query.Where(x =>
                    x.booking.BookingCode.ToLower().Contains(search) ||
                    x.user.FullName.ToLower().Contains(search) ||
                    x.user.Email.ToLower().Contains(search) ||
                    (x.user.Phone != null && x.user.Phone.Contains(search)));
            }

            if (!string.IsNullOrWhiteSpace(status))
            {
                query = query.Where(x => x.booking.Status == status);
            }

            if (cinemaId.HasValue)
            {
                query = query.Where(x => x.cinema.CinemaId == cinemaId.Value);
            }

            if (movieId.HasValue)
            {
                query = query.Where(x => x.movie.MovieId == movieId.Value);
            }

            if (date.HasValue)
            {
                var day = date.Value.Date;
                var nextDay = day.AddDays(1);
                query = query.Where(x => x.booking.CreatedAt >= day && x.booking.CreatedAt < nextDay);
            }

            var total = await query.CountAsync();
            var items = await query
                .OrderByDescending(x => x.booking.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(x => new
                {
                    x.booking.BookingId,
                    x.booking.BookingCode,
                    x.booking.UserId,
                    x.user.FullName,
                    x.user.Email,
                    x.user.Phone,
                    x.booking.ShowtimeId,
                    x.booking.TotalAmount,
                    x.booking.DiscountAmount,
                    x.booking.FinalAmount,
                    x.booking.Status,
                    x.booking.BookingChannel,
                    x.booking.CreatedAt,
                    x.booking.ConfirmedAt,
                    x.booking.CancelledAt,
                    x.booking.CancelReason,
                    MovieTitle = x.movie.Title,
                    CinemaName = x.cinema.CinemaName,
                    HallName = x.hall.HallName,
                    x.showtime.StartTime,
                    x.showtime.EndTime,
                    TicketCount = _context.CinemaTickets.Count(t => t.BookingId == x.booking.BookingId),
                    UsedTicketCount = _context.CinemaTickets.Count(t => t.BookingId == x.booking.BookingId && t.IsUsed),
                    RefundAmount = _context.CinemaPayments
                        .Where(p => p.BookingId == x.booking.BookingId)
                        .Sum(p => p.RefundAmount ?? 0),
                    RefundedAt = _context.CinemaPayments
                        .Where(p => p.BookingId == x.booking.BookingId && p.RefundedAt != null)
                        .Max(p => p.RefundedAt)
                })
                .ToListAsync();

            return Ok(new { total, items });
        }

        [HttpGet("code/{code}")]
        public async Task<IActionResult> GetByCode(string code)
        {
            var bookingId = await _context.CinemaBookings.AsNoTracking()
                .Where(x => x.BookingCode == code)
                .Select(x => (int?)x.BookingId)
                .FirstOrDefaultAsync();

            return bookingId.HasValue
                ? await GetById(bookingId.Value)
                : NotFound(new { message = "Booking not found" });
        }



        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var booking = await _context.CinemaBookings.AsNoTracking().FirstOrDefaultAsync(x => x.BookingId == id);
            if (booking == null)
            {
                return NotFound(new { message = "Booking not found" });
            }

            var tickets = await _context.CinemaTickets.AsNoTracking().Where(x => x.BookingId == id).ToListAsync();
            var concessions = await _context.CinemaBookingConcessions.AsNoTracking().Where(x => x.BookingId == id).ToListAsync();
            var payments = await _context.CinemaPayments.AsNoTracking().Where(x => x.BookingId == id).ToListAsync();
            return Ok(new { booking, tickets, concessions, payments });
        }



        [HttpGet("user/{userId:int}")]
        public async Task<IActionResult> GetByUser(int userId)
        {
            return Ok(await BuildUserBookings(userId));
        }

        [HttpGet("user-by-email")]
        public async Task<IActionResult> GetByUserEmail([FromQuery] string email)
        {
            if (string.IsNullOrWhiteSpace(email))
            {
                return BadRequest(new { message = "Email is required" });
            }
            var userId = await _context.CinemaUsers.AsNoTracking()
                .Where(x => x.Email == email && x.IsActive)
                .Select(x => (int?)x.UserId)
                .FirstOrDefaultAsync();

            if (userId == null)
            {
                return NotFound(new { message = "User not found" });
            }

            return Ok(await BuildUserBookings(userId.Value));
        }

        private async Task<IEnumerable<object>> BuildUserBookings(int userId)
        {
            var bookings = await _context.CinemaBookings.AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();

            var bookingIds = bookings.Select(x => x.BookingId).ToList();
            var showtimeIds = bookings.Select(x => x.ShowtimeId).Distinct().ToList();

            var showtimes = await _context.CinemaShowtimes.AsNoTracking()
                .Where(x => showtimeIds.Contains(x.ShowtimeId))
                .ToDictionaryAsync(x => x.ShowtimeId);

            var movieIds = showtimes.Values.Select(x => x.MovieId).Distinct().ToList();
            var hallIds = showtimes.Values.Select(x => x.HallId).Distinct().ToList();

            var movies = await _context.CinemaMovies.AsNoTracking()
                .Where(x => movieIds.Contains(x.MovieId))
                .ToDictionaryAsync(x => x.MovieId);

            var halls = await _context.CinemaHalls.AsNoTracking()
                .Where(x => hallIds.Contains(x.HallId))
                .ToDictionaryAsync(x => x.HallId);

            var cinemaIds = halls.Values.Select(x => x.CinemaId).Distinct().ToList();
            var cinemas = await _context.Cinemas.AsNoTracking()
                .Where(x => cinemaIds.Contains(x.CinemaId))
                .ToDictionaryAsync(x => x.CinemaId);

            var tickets = await _context.CinemaTickets.AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .ToListAsync();

            var seatIds = tickets.Select(x => x.SeatId).Distinct().ToList();
            var seats = await _context.CinemaSeats.AsNoTracking()
                .Where(x => seatIds.Contains(x.SeatId))
                .ToDictionaryAsync(x => x.SeatId);

            var concessions = await _context.CinemaBookingConcessions.AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .ToListAsync();

            var itemIds = concessions.Select(x => x.ItemId).Distinct().ToList();
            var items = await _context.CinemaConcessionItems.AsNoTracking()
                .Where(x => itemIds.Contains(x.ItemId))
                .ToDictionaryAsync(x => x.ItemId);

            var payments = await _context.CinemaPayments.AsNoTracking()
                .Where(x => bookingIds.Contains(x.BookingId))
                .ToListAsync();

            var pointTransactions = new List<CinemaPointTransaction>();
            try
            {
                pointTransactions = await _context.CinemaPointTransactions.AsNoTracking()
                    .Where(x => x.UserId == userId && x.BookingId != null && bookingIds.Contains(x.BookingId.Value))
                    .ToListAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BookingsController] Loading point transactions failed: {ex.Message}");
            }

            return bookings.Select(booking =>
            {
                showtimes.TryGetValue(booking.ShowtimeId, out var showtime);
                CinemaMovie? movie = null;
                CinemaHall? hall = null;
                Cinema? cinema = null;

                if (showtime != null)
                {
                    movies.TryGetValue(showtime.MovieId, out movie);
                    halls.TryGetValue(showtime.HallId, out hall);
                    if (hall != null)
                    {
                        cinemas.TryGetValue(hall.CinemaId, out cinema);
                    }
                }

                return new
                {
                    booking,
                    showtime,
                    movie,
                    hall,
                    cinema,
                    tickets = tickets
                        .Where(x => x.BookingId == booking.BookingId)
                        .Select(ticket =>
                        {
                            seats.TryGetValue(ticket.SeatId, out var seat);
                            return new { ticket, seat };
                        })
                        .ToList(),
                    concessions = concessions
                        .Where(x => x.BookingId == booking.BookingId)
                        .Select(concession =>
                        {
                            items.TryGetValue(concession.ItemId, out var item);
                            return new { concession, item };
                        })
                        .ToList(),
                    payments = payments.Where(x => x.BookingId == booking.BookingId).ToList(),
                    pointTransactions = pointTransactions.Where(x => x.BookingId == booking.BookingId).ToList()
                };
            });
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBookingDto dto)
        {
            try
            {
                if (!await _context.CinemaUsers.AnyAsync(x => x.UserId == dto.UserId && x.IsActive))
                {
                    return BadRequest(new { message = "User not found" });
                }

            var showtime = await _context.CinemaShowtimes.FindAsync(dto.ShowtimeId);
            if (showtime == null)
            {
                return NotFound(new { message = "Showtime not found" });
            }

            if (string.Equals(showtime.Status, "cancelled", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(showtime.Status, "completed", StringComparison.OrdinalIgnoreCase) ||
                showtime.EndTime <= DateTime.Now)
            {
                return Conflict(new { message = "This showtime is no longer available" });
            }

            var hall = await _context.CinemaHalls.AsNoTracking()
                .FirstOrDefaultAsync(x => x.HallId == showtime.HallId);
            if (hall == null)
            {
                return BadRequest(new { message = "Hall not found" });
            }

            if (!string.Equals(hall.Status, "active", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = "This hall is currently unavailable" });
            }

            if (dto.Seats.Count == 0)
            {
                return BadRequest(new { message = "At least one seat is required" });
            }

            if (dto.SeatIds.Count != dto.SeatIds.Distinct().Count())
            {
                return BadRequest(new { message = "Duplicate seats are not allowed" });
            }

            var seats = await _context.CinemaSeats
                .Where(x =>
                    dto.SeatIds.Contains(x.SeatId) &&
                    x.HallId == showtime.HallId &&
                    x.IsActive)
                .ToListAsync();
            if (seats.Count != dto.SeatIds.Distinct().Count())
            {
                return BadRequest(new { message = "Some seats were not found or are inactive" });
            }

            var unavailableSeatIds = await _context.CinemaTickets
                .Join(_context.CinemaBookings.Where(x => x.ShowtimeId == dto.ShowtimeId && x.Status != "cancelled"), t => t.BookingId, b => b.BookingId, (t, b) => t.SeatId)
                .Where(seatId => dto.SeatIds.Contains(seatId))
                .ToListAsync();
            if (unavailableSeatIds.Count > 0)
            {
                return BadRequest(new { message = "Some seats are already booked", seatIds = unavailableSeatIds });
            }

            var seatTypeIds = seats.Select(x => x.SeatTypeId).Distinct().ToList();
            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => seatTypeIds.Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId);
            var standardSeatTypeId = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => x.TypeName.ToLower().Contains("standard"))
                .OrderBy(x => x.SeatTypeId)
                .Select(x => x.SeatTypeId)
                .FirstOrDefaultAsync();
            if (standardSeatTypeId == 0)
            {
                standardSeatTypeId = await _context.CinemaSeatTypes.AsNoTracking()
                    .OrderBy(x => x.SeatTypeId)
                    .Select(x => x.SeatTypeId)
                    .FirstOrDefaultAsync();
            }

            var dayTypes = await _context.CinemaDayTypes.AsNoTracking().ToListAsync();
            var priceSeatTypeIds = seatTypeIds.Append(standardSeatTypeId).Distinct().ToList();
            var priceRules = await _context.CinemaTicketPrices.AsNoTracking()
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

            var hasStalePrice = dto.Seats.Any(x =>
                !calculatedPrices.TryGetValue(x.SeatId, out var calculatedPrice) ||
                x.Price != calculatedPrice);
            if (hasStalePrice)
            {
                return Conflict(new
                {
                    message = "Ticket prices have changed. Please refresh the seat map before booking",
                    prices = calculatedPrices.Select(x => new { seatId = x.Key, price = x.Value })
                });
            }

            var ticketTotal = calculatedPrices.Values.Sum();
            var itemIds = dto.Concessions.Select(x => x.ItemId).Distinct().ToList();
            var items = await _context.CinemaConcessionItems.Where(x => itemIds.Contains(x.ItemId)).ToDictionaryAsync(x => x.ItemId);
            if (dto.Concessions.Any(x => x.Quantity <= 0))
            {
                return BadRequest(new { message = "Concession quantity must be greater than 0" });
            }

            if (items.Count != itemIds.Count)
            {
                return BadRequest(new { message = "Some concessions were not found" });
            }

            var concessionTotal = dto.Concessions.Sum(x => items.TryGetValue(x.ItemId, out var item) ? item.Price * x.Quantity : 0);
            var totalAmount = ticketTotal + concessionTotal;
            var promoValidation = await ValidatePromotionForBooking(dto.PromoCode, dto.UserId, totalAmount);
            if (!promoValidation.IsValid)
            {
                return BadRequest(new { message = promoValidation.Message });
            }

            var discountAmount = promoValidation.DiscountAmount;

                var booking = new Bookings.Booking
            {
                UserId = dto.UserId,
                ShowtimeId = dto.ShowtimeId,
                BookingCode = string.IsNullOrWhiteSpace(dto.BookingCode) ? $"BT{DateTime.UtcNow:yyyyMMddHHmmssfff}" : dto.BookingCode,
                TotalAmount = totalAmount,
                DiscountAmount = discountAmount,
                FinalAmount = Math.Max(0, totalAmount - discountAmount),
                Status = "pending",
                BookingChannel = dto.BookingChannel ?? "web",
                CreatedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                Notes = string.IsNullOrWhiteSpace(dto.PromoCode)
                    ? dto.Notes
                    : string.Join(" | ", new[] { dto.Notes, $"Promo:{dto.PromoCode.Trim().ToUpperInvariant()}" }.Where(x => !string.IsNullOrWhiteSpace(x)))
            };

            _context.CinemaBookings.Add(booking);
            await _context.SaveChangesAsync();

            var seatLookup = seats.ToDictionary(x => x.SeatId);
            foreach (var requestedSeat in dto.Seats)
            {
                var seat = seatLookup[requestedSeat.SeatId];
                _context.CinemaTickets.Add(new CinemaTicket
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

            foreach (var requestedItem in dto.Concessions)
            {
                if (!items.TryGetValue(requestedItem.ItemId, out var item))
                {
                    continue;
                }

                _context.CinemaBookingConcessions.Add(new CinemaBookingConcession
                {
                    BookingId = booking.BookingId,
                    ItemId = item.ItemId,
                    Quantity = requestedItem.Quantity,
                    UnitPrice = item.Price,
                    Subtotal = item.Price * requestedItem.Quantity
                });
            }

            var selectedSeatIds = dto.SeatIds.Distinct().ToList();
            _context.CinemaSeatLocks.RemoveRange(_context.CinemaSeatLocks.Where(x =>
                x.ShowtimeId == dto.ShowtimeId && selectedSeatIds.Contains(x.SeatId)));

            if (promoValidation.Promotion != null && discountAmount > 0)
            {
                promoValidation.Promotion.TotalUses += 1;
                _context.CinemaPromoUsages.Add(new CinemaPromoUsage
                {
                    PromoId = promoValidation.Promotion.PromoId,
                    UserId = dto.UserId,
                    BookingId = booking.BookingId,
                    UsedAt = DateTime.UtcNow
                });
            }

                await _context.SaveChangesAsync();
                return CreatedAtAction(nameof(GetById), new { id = booking.BookingId }, booking);
            }

           
            catch (DbUpdateException dbEx)
            {
                var innerMsg = dbEx.InnerException?.Message ?? dbEx.Message;
                Console.WriteLine($"[BookingsController] DB Error: {innerMsg}");
                return StatusCode(500, new { message = $"Database error: {innerMsg}" });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[BookingsController] Error: {ex}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        [HttpPost("{id:int}/payments")]
        public async Task<IActionResult> AddPayment(int id, [FromBody] PaymentDto dto)
        {
            var result = await _bookingService.AddPaymentAsync(id, dto);

            if (!result.Success)
            {
                if (result.Message.Contains("not found", StringComparison.OrdinalIgnoreCase))
                {
                    return NotFound(new { message = result.Message });
                }
                return BadRequest(new { message = result.Message });
            }

            return Ok(result.Payment);
        }


        private async Task<decimal> CalculatePromotionDiscountAsync(string promoCode, int userId, decimal totalAmount)
        {
            var normalizedCode = promoCode.Trim().ToUpper();
            var promotion = await _context.CinemaPromotions
                .FirstOrDefaultAsync(x => x.PromoCode.ToUpper() == normalizedCode);

            if (promotion == null)
            {
                throw new InvalidOperationException("Promotion not found");
            }

            var now = DateTime.UtcNow;
            if (!promotion.IsActive || promotion.ValidFrom > now || promotion.ValidTo < now)
            {
                throw new InvalidOperationException("Promotion is not active");
            }

            if (totalAmount < promotion.MinOrderAmt)
            {
                throw new InvalidOperationException("Order amount does not meet promotion minimum");
            }

            if (promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value)
            {
                throw new InvalidOperationException("Promotion usage limit reached");
            }

            var userUsageCount = await _context.CinemaPromoUsages
                .CountAsync(x => x.PromoId == promotion.PromoId && x.UserId == userId);
            if (userUsageCount >= promotion.PerUserLimit)
            {
                throw new InvalidOperationException("Promotion usage limit reached for this user");
            }

            var discount = string.Equals(promotion.DiscountType, "percent", StringComparison.OrdinalIgnoreCase)
                ? totalAmount * promotion.DiscountValue / 100
                : promotion.DiscountValue;

            if (promotion.MaxDiscount.HasValue && discount > promotion.MaxDiscount.Value)
            {
                discount = promotion.MaxDiscount.Value;
            }

            return Math.Clamp(discount, 0, totalAmount);
        }

        private async Task ApplyPromotionUsageAsync(Bookings.Booking booking, string? promoCode)
        {
            if (booking.DiscountAmount <= 0 || string.IsNullOrWhiteSpace(promoCode))
            {
                return;
            }

            var normalizedCode = promoCode.Trim().ToUpper();
            var promotion = await _context.CinemaPromotions
                .FirstOrDefaultAsync(x => x.PromoCode.ToUpper() == normalizedCode);

            if (promotion == null)
            {
                throw new InvalidOperationException("Promotion not found");
            }

            var usageExists = await _context.CinemaPromoUsages
                .AnyAsync(x => x.PromoId == promotion.PromoId && x.BookingId == booking.BookingId);
            if (usageExists)
            {
                return;
            }

            if (promotion.UsageLimit.HasValue && promotion.TotalUses >= promotion.UsageLimit.Value)
            {
                throw new InvalidOperationException("Promotion usage limit reached");
            }

            var userUsageCount = await _context.CinemaPromoUsages
                .CountAsync(x => x.PromoId == promotion.PromoId && x.UserId == booking.UserId);
            if (userUsageCount >= promotion.PerUserLimit)
            {
                throw new InvalidOperationException("Promotion usage limit reached for this user");
            }

            promotion.TotalUses += 1;
            _context.CinemaPromoUsages.Add(new CinemaPromoUsage
            {
                PromoId = promotion.PromoId,
                UserId = booking.UserId,
                BookingId = booking.BookingId,
                UsedAt = DateTime.UtcNow
            });
        }


        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> Cancel(int id, [FromBody] CancelBookingDto dto)
        {
            var booking = await _context.CinemaBookings.FindAsync(id);
            if (booking == null)
            {
                return NotFound(new { message = "Booking not found" });
            }

            booking.Status = "cancelled";
            booking.CancelReason = dto.Reason;
            booking.CancelledAt = DateTime.UtcNow;

            var seatIds = await _context.CinemaTickets
                .AsNoTracking()
                .Where(x => x.BookingId == id)
                .Select(x => x.SeatId)
                .ToListAsync();

            if (seatIds.Count > 0)
            {
                _context.CinemaSeatLocks.RemoveRange(_context.CinemaSeatLocks.Where(x =>
                    x.ShowtimeId == booking.ShowtimeId && seatIds.Contains(x.SeatId)));
            }

            await _context.SaveChangesAsync();
            return Ok(booking);
        }

        [HttpPost("{id:int}/refund")]
        public async Task<IActionResult> Refund(int id, [FromBody] RefundBookingDto dto)
        {
            var strategy = _context.Database.CreateExecutionStrategy();

            return await strategy.ExecuteAsync<IActionResult>(async () =>
            {
                await using var transaction = await _context.Database.BeginTransactionAsync();

                var booking = await _context.CinemaBookings.FirstOrDefaultAsync(x => x.BookingId == id);
                if (booking == null)
                {
                    return NotFound(new { message = "Booking not found" });
                }

                var usedTicketCount = await _context.CinemaTickets.CountAsync(x => x.BookingId == id && x.IsUsed);
                if (usedTicketCount > 0)
                {
                    return BadRequest(new { message = "Cannot refund a booking that has checked-in tickets" });
                }

                var payments = await _context.CinemaPayments
                    .Where(x => x.BookingId == id)
                    .ToListAsync();

                var refundablePayments = payments
                    .Where(x =>
                        (string.Equals(x.Status, "success", StringComparison.OrdinalIgnoreCase)
                         || string.Equals(x.Status, "paid", StringComparison.OrdinalIgnoreCase)
                         || string.Equals(x.Status, "partial_refund", StringComparison.OrdinalIgnoreCase))
                        && x.Amount > x.RefundAmount.GetValueOrDefault())
                    .ToList();

                var refundAmount = refundablePayments.Sum(x => x.Amount - x.RefundAmount.GetValueOrDefault());
                if (refundAmount <= 0)
                {
                    return BadRequest(new { message = "Booking has no paid payment to refund or has already been refunded" });
                }

                var now = DateTime.UtcNow;
                foreach (var payment in refundablePayments)
                {
                    payment.RefundAmount = payment.Amount;
                    payment.RefundedAt = now;
                    payment.Status = "refunded";
                }

                booking.Status = "cancelled";
                booking.CancelledAt ??= now;
                booking.CancelReason = string.IsNullOrWhiteSpace(dto.Reason)
                    ? "Refunded by administrator"
                    : dto.Reason.Trim();

                var seatIds = await _context.CinemaTickets
                    .AsNoTracking()
                    .Where(x => x.BookingId == id)
                    .Select(x => x.SeatId)
                    .ToListAsync();

                if (seatIds.Count > 0)
                {
                    _context.CinemaSeatLocks.RemoveRange(_context.CinemaSeatLocks.Where(x =>
                        x.ShowtimeId == booking.ShowtimeId && seatIds.Contains(x.SeatId)));
                }

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new
                {
                    message = "Refund successful",
                    booking.BookingId,
                    booking.BookingCode,
                    refundAmount,
                    refundedAt = now,
                    payments = refundablePayments.Select(x => new
                    {
                        x.PaymentId,
                        x.TransactionRef,
                        x.Amount,
                        x.RefundAmount,
                        x.Status,
                        x.RefundedAt
                    })
                });
            });
        }

        [Authorize(Roles = CheckInRoles)]
        [HttpPost("check-in")]
        public async Task<IActionResult> CheckInByTicket([FromBody] TicketCheckInDto dto)
        {
            if (!dto.TicketId.HasValue && string.IsNullOrWhiteSpace(dto.QrCode))
            {
                return BadRequest(new { message = "TicketId or QrCode is required" });
            }

            var ticketsQuery = _context.CinemaTickets.AsNoTracking().AsQueryable();
            if (dto.TicketId.HasValue)
            {
                ticketsQuery = ticketsQuery.Where(x => x.TicketId == dto.TicketId.Value);
            }

            if (!string.IsNullOrWhiteSpace(dto.QrCode))
            {
                var qrCode = dto.QrCode.Trim();
                ticketsQuery = ticketsQuery.Where(x => x.QrCode == qrCode);
            }

            var ticket = await ticketsQuery.FirstOrDefaultAsync();
            if (ticket == null)
            {
                return NotFound(new { message = "Ticket not found" });
            }

            return await CheckIn(ticket.BookingId, dto);
        }

        [Authorize(Roles = CheckInRoles)]
        [HttpPost("{id:int}/check-in")]
        public async Task<IActionResult> CheckIn(int id, [FromBody] TicketCheckInDto dto)
        {
            var booking = await _context.CinemaBookings.FirstOrDefaultAsync(x => x.BookingId == id);
            if (booking == null)
            {
                return NotFound(new { message = "Booking not found" });
            }

            var checkInUserId = ResolveAuthenticatedUserId();
            if (!checkInUserId.HasValue)
            {
                return Unauthorized(new { message = "Authenticated staff account is required" });
            }

            var checkInUser = await (
                from user in _context.CinemaUsers.AsNoTracking()
                join role in _context.CinemaRoles.AsNoTracking() on user.RoleId equals role.RoleId
                where user.UserId == checkInUserId.Value && user.IsActive
                select new { user.UserId, role.RoleName }).FirstOrDefaultAsync();
            if (checkInUser == null || !CheckInRoleNames.Contains(checkInUser.RoleName))
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { message = "Only ticket staff, cinema managers or admins can check in tickets" });
            }

            if (booking.Status == "cancelled")
            {
                return BadRequest(new { message = "Booking has been cancelled" });
            }

            if (booking.Status != "confirmed" && booking.Status != "paid" && booking.Status != "completed")
            {
                return BadRequest(new { message = "Booking must be paid before check-in" });
            }

            var isSpecificTicket = dto.TicketId.HasValue || !string.IsNullOrWhiteSpace(dto.QrCode);
            var ticketsQuery = _context.CinemaTickets.Where(x => x.BookingId == id);
            if (dto.TicketId.HasValue)
            {
                ticketsQuery = ticketsQuery.Where(x => x.TicketId == dto.TicketId.Value);
            }

            if (!string.IsNullOrWhiteSpace(dto.QrCode))
            {
                var qrCode = dto.QrCode.Trim();
                ticketsQuery = ticketsQuery.Where(x => x.QrCode == qrCode);
            }

            if (!isSpecificTicket)
            {
                ticketsQuery = ticketsQuery.Where(x => !x.IsUsed);
            }

            var tickets = await ticketsQuery.ToListAsync();
            if (tickets.Count == 0)
            {
                return isSpecificTicket
                    ? NotFound(new { message = "Ticket not found for this booking" })
                    : Conflict(new { message = "All tickets in this booking have already been checked in" });
            }

            if (isSpecificTicket)
            {
                var usedTickets = tickets.Where(x => x.IsUsed).ToList();
                if (usedTickets.Count > 0)
                {
                    return Conflict(new
                    {
                        message = "Ticket has already been checked in",
                        tickets = usedTickets.Select(x => new { x.TicketId, x.QrCode, x.UsedAt, x.CheckedBy })
                    });
                }
            }

            var now = DateTime.UtcNow;
            foreach (var ticket in tickets)
            {
                ticket.IsUsed = true;
                ticket.UsedAt = now;
                ticket.CheckedBy = checkInUser.UserId;
            }

            var checkedTicketIds = tickets.Select(x => x.TicketId).ToList();
            var hasRemainingUnusedTickets = await _context.CinemaTickets
                .AnyAsync(x => x.BookingId == id && !x.IsUsed && !checkedTicketIds.Contains(x.TicketId));
            if (!hasRemainingUnusedTickets)
            {
                booking.Status = "completed";
            }

            await _context.SaveChangesAsync();
            return Ok(new
            {
                message = "Check-in successful",
                booking.BookingId,
                booking.BookingCode,
                checkedAt = now,
                checkedTicketCount = tickets.Count,
                tickets = tickets.Select(x => new { x.TicketId, x.QrCode, x.IsUsed, x.UsedAt, x.CheckedBy })
            });
        }

        private int? ResolveAuthenticatedUserId()
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (int.TryParse(claimValue, out var authenticatedUserId) && authenticatedUserId > 0)
            {
                return authenticatedUserId;
            }

            return null;
        }

        private async Task<object?> BuildBookingDetail(int id)
        {
            var booking = await _context.CinemaBookings.AsNoTracking().FirstOrDefaultAsync(x => x.BookingId == id);
            if (booking == null)
            {
                return null;
            }

            var user = await _context.CinemaUsers.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == booking.UserId);
            var showtime = await _context.CinemaShowtimes.AsNoTracking().FirstOrDefaultAsync(x => x.ShowtimeId == booking.ShowtimeId);
            var movie = showtime == null
                ? null
                : await _context.CinemaMovies.AsNoTracking().FirstOrDefaultAsync(x => x.MovieId == showtime.MovieId);
            var hall = showtime == null
                ? null
                : await _context.CinemaHalls.AsNoTracking().FirstOrDefaultAsync(x => x.HallId == showtime.HallId);
            var cinema = hall == null
                ? null
                : await _context.Cinemas.AsNoTracking().FirstOrDefaultAsync(x => x.CinemaId == hall.CinemaId);

            var ticketRows = await _context.CinemaTickets.AsNoTracking()
                .Where(x => x.BookingId == id)
                .OrderBy(x => x.TicketId)
                .ToListAsync();
            var seatIds = ticketRows.Select(x => x.SeatId).Distinct().ToList();
            var seatTypeIds = ticketRows.Select(x => x.SeatTypeId).Distinct().ToList();
            var seats = await _context.CinemaSeats.AsNoTracking()
                .Where(x => seatIds.Contains(x.SeatId))
                .ToDictionaryAsync(x => x.SeatId);
            var seatTypes = await _context.CinemaSeatTypes.AsNoTracking()
                .Where(x => seatTypeIds.Contains(x.SeatTypeId))
                .ToDictionaryAsync(x => x.SeatTypeId);
            var tickets = ticketRows
                .Select(ticket =>
                {
                    seats.TryGetValue(ticket.SeatId, out var seat);
                    seatTypes.TryGetValue(ticket.SeatTypeId, out var seatType);
                    return new
                    {
                        ticket.TicketId,
                        ticket.BookingId,
                        ticket.SeatId,
                        SeatCode = seat?.SeatCode,
                        RowLabel = seat?.RowLabel,
                        ColNumber = seat?.ColNumber,
                        ticket.SeatTypeId,
                        SeatTypeName = seatType?.TypeName,
                        ticket.Price,
                        ticket.QrCode,
                        ticket.IsUsed,
                        ticket.UsedAt,
                        ticket.CheckedBy
                    };
                })
                .OrderBy(x => x.RowLabel)
                .ThenBy(x => x.ColNumber)
                .ToList();

            var concessionRows = await _context.CinemaBookingConcessions.AsNoTracking()
                .Where(x => x.BookingId == id)
                .OrderBy(x => x.Id)
                .ToListAsync();
            var concessionItemIds = concessionRows.Select(x => x.ItemId).Distinct().ToList();
            var concessionItems = await _context.CinemaConcessionItems.AsNoTracking()
                .Where(x => concessionItemIds.Contains(x.ItemId))
                .ToDictionaryAsync(x => x.ItemId);
            var concessions = concessionRows
                .Select(concession =>
                {
                    concessionItems.TryGetValue(concession.ItemId, out var item);
                    return new
                    {
                        concession.Id,
                        concession.BookingId,
                        concession.ItemId,
                        ItemName = item?.ItemName,
                        ImageUrl = item?.ImageUrl,
                        concession.Quantity,
                        concession.UnitPrice,
                        concession.Subtotal
                    };
                })
                .ToList();

            var paymentRows = await _context.CinemaPayments.AsNoTracking()
                .Where(x => x.BookingId == id)
                .OrderByDescending(x => x.PaidAt ?? DateTime.MinValue)
                .ToListAsync();
            var methodIds = paymentRows.Select(x => x.MethodId).Distinct().ToList();
            var paymentMethods = await _context.CinemaPaymentMethods.AsNoTracking()
                .Where(x => methodIds.Contains(x.MethodId))
                .ToDictionaryAsync(x => x.MethodId);
            var payments = paymentRows
                .Select(payment =>
                {
                    paymentMethods.TryGetValue(payment.MethodId, out var method);
                    return new
                    {
                        payment.PaymentId,
                        payment.BookingId,
                        payment.MethodId,
                        MethodName = method?.MethodName,
                        payment.TransactionRef,
                        payment.Amount,
                        payment.Currency,
                        payment.Status,
                        payment.GatewayResponse,
                        payment.PaidAt,
                        payment.RefundAmount,
                        payment.RefundedAt
                    };
                })
                .ToList();

            var promoRows = await _context.CinemaPromoUsages.AsNoTracking()
                .Where(x => x.BookingId == id)
                .ToListAsync();
            var promoIds = promoRows.Select(x => x.PromoId).Distinct().ToList();
            var promotions = await _context.CinemaPromotions.AsNoTracking()
                .Where(x => promoIds.Contains(x.PromoId))
                .ToDictionaryAsync(x => x.PromoId);
            var promoUsages = promoRows
                .Select(usage =>
                {
                    promotions.TryGetValue(usage.PromoId, out var promotion);
                    return new
                    {
                        usage.Id,
                        usage.PromoId,
                        PromoCode = promotion?.PromoCode,
                        Description = promotion?.Description,
                        usage.UserId,
                        usage.BookingId,
                        usage.UsedAt
                    };
                })
                .ToList();

            return new
            {
                booking = new
                {
                    booking.BookingId,
                    booking.BookingCode,
                    booking.UserId,
                    FullName = user?.FullName,
                    Email = user?.Email,
                    Phone = user?.Phone,
                    booking.ShowtimeId,
                    MovieId = movie?.MovieId,
                    MovieTitle = movie?.Title,
                    PosterUrl = movie?.PosterUrl,
                    CinemaId = cinema?.CinemaId,
                    CinemaName = cinema?.CinemaName,
                    CinemaAddress = cinema?.Address,
                    HallId = hall?.HallId,
                    HallName = hall?.HallName,
                    StartTime = showtime?.StartTime,
                    EndTime = showtime?.EndTime,
                    LanguageType = showtime?.LanguageType,
                    booking.TotalAmount,
                    booking.DiscountAmount,
                    booking.FinalAmount,
                    booking.Status,
                    booking.BookingChannel,
                    booking.CreatedAt,
                    booking.ExpiresAt,
                    booking.ConfirmedAt,
                    booking.CancelledAt,
                    booking.CancelReason,
                    booking.Notes,
                    TicketCount = tickets.Count,
                    UsedTicketCount = tickets.Count(x => x.IsUsed)
                },
                tickets,
                concessions,
                payments,
                promotions = promoUsages
            };
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
            var promotion = await _context.CinemaPromotions.FirstOrDefaultAsync(x => x.PromoCode == code);
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

            var userUses = await _context.CinemaPromoUsages.CountAsync(x => x.PromoId == promotion.PromoId && x.UserId == userId);
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

        private static decimal CalculateDiscount(Promotion promotion, decimal orderAmount)
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
    }

    public class CreateBookingDto
    {
        public string? BookingCode { get; set; }
        public int UserId { get; set; }
        public int ShowtimeId { get; set; }
        public List<BookingSeatDto> Seats { get; set; } = new();
        public List<BookingConcessionDto> Concessions { get; set; } = new();
        public decimal DiscountAmount { get; set; }
        public string? PromoCode { get; set; }
        public string? BookingChannel { get; set; }
        public string? Notes { get; set; }
        public List<int> SeatIds => Seats.Select(x => x.SeatId).ToList();
    }

    public class BookingSeatDto
    {
        public int SeatId { get; set; }
        public decimal Price { get; set; }
        public string? QrCode { get; set; }
    }

    public class BookingConcessionDto
    {
        public int ItemId { get; set; }
        public byte Quantity { get; set; } = 1;
    }

    public class CancelBookingDto
    {
        public string? Reason { get; set; }
    }

    public class RefundBookingDto
    {
        public string? Reason { get; set; }
    }

    public class TicketCheckInDto
    {
        public int? TicketId { get; set; }
        public string? QrCode { get; set; }
    }

    internal class BookingPromotionValidation
    {
        public bool IsValid { get; private set; }
        public string Message { get; private set; } = "";
        public Promotion? Promotion { get; private set; }
        public decimal DiscountAmount { get; private set; }

        public static BookingPromotionValidation Valid(Promotion? promotion, decimal discountAmount)
        {
            return new BookingPromotionValidation
            {
                IsValid = true,
                Promotion = promotion,
                DiscountAmount = discountAmount
            };
        }

        public static BookingPromotionValidation Invalid(string message)
        {
            return new BookingPromotionValidation
            {
                IsValid = false,
                Message = message
            };
        }
    }
}
