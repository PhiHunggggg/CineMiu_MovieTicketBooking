using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Services.Booking;
using System.Security.Claims;
using static DTO.Booking.BookingDto;

namespace API_Service.Controllers
{
    [Route("api/bookings")]
    [ApiController]
    public class BookingController(IBookingService bookingService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAllBookings([FromQuery] string? keyword, [FromQuery] string? status, [FromQuery] int? cinemaId, [FromQuery] DateTime? date, [FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            var result = await bookingService.GetAllAsync(keyword, status, cinemaId, date, pageNumber, pageSize);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetBookingById(int id)
        {
            var result = await bookingService.GetByIdAsync(id);
            if (result == null)
            {
                return NotFound();
            }
            return Ok(result);
        }

        [HttpGet("code/{bookingCode}")]
        public async Task<IActionResult> GetBookingByCode(string bookingCode)
        {
            var result = await bookingService.GetByBookingCodeAsync(bookingCode);
            if (result == null)
            {
                return NotFound();
            }
            return Ok(result);
        }

        [HttpGet("user/{userId:int}")]
        public async Task<IActionResult> GetBookingByUser(int userId)
        {
            var result = await bookingService.GetByUserAsync(userId);
            if (result == null)
            {
                return NotFound();
            }
            return Ok(result);
        }

        [HttpGet("user-by-email")]
        public async Task<IActionResult> GetBookingByUserEmail([FromQuery] string email)
        {
            var result = await bookingService.GetByUserEmailAsync(email);
            if (result == null)
            {
                return NotFound();
            }
            return Ok(result);
        }
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateBooking([FromBody] DTO.Booking.BookingDto.BookingCreateRequest request)
        {
            try
            {
                var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
                if (!int.TryParse(claimValue, out var userId))
                {
                    return Unauthorized(new { message = "User ID not found in token" });
                }
                request.UserId = userId;
                var bookingId = await bookingService.Create(request);
                return Ok(new { message = "Booking created successfully", bookingId });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("{id:int}/cancel")]
        public async Task<IActionResult> CancelBooking(int id, [FromBody] DTO.Booking.BookingDto.CancelBookingDto cancel)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            var currentUserRole = User.FindFirstValue(ClaimTypes.Role) ?? "User";

            int? currentUserCinemaId = null;
            var cinemaIdClaim = User.FindFirst("CinemaId")?.Value;
            if (int.TryParse(cinemaIdClaim, out var cinemaId))
            {
                currentUserCinemaId = cinemaId;
            }

            try
            {
                await bookingService.Cancel(id, cancel, currentUserId, currentUserRole, currentUserCinemaId);
                return Ok(new { message = "Booking cancelled successfully" });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize]
        [HttpPost("{id:int}/payments")]
        public async Task<IActionResult> AddPayment(int id, [FromBody] BookingPaymentCreateRequest request)
        {
            var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (!int.TryParse(userIdClaim, out var currentUserId))
            {
                return Unauthorized(new { message = "User ID not found in token" });
            }

            try
            {
                var result = await bookingService.AddPaymentAsync(id, request, currentUserId);
                if (result == null)
                {
                    return NotFound(new { message = "Booking not found" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [Authorize(Roles = "admin,ticket_staff,cinema_manager")]
        [HttpPost("{id:int}/check-in")]
        public async Task<IActionResult> CheckIn(
            int id,
            [FromBody] TicketCheckInDto dto)
        {
            var claimValue = User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(claimValue, out var userId))
            {
                return Unauthorized();
            }

            return await bookingService.CheckInAsync(
                id,
                dto,
                userId);
        }
    }
}
