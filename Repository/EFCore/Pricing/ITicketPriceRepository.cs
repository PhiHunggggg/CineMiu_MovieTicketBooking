using DTO.Pricing;
using Entities;

namespace Repository.EFCore.Pricing;

public interface ITicketPriceRepository
{
    Task<object> GetAllAsync(TicketPriceDTO.Query query);
    Task<Tickets.TicketPrice?> GetByIdAsync(int id, bool tracked = false);
    Task<Tickets.TicketPrice?> FindExactAsync(TicketPriceDTO.Request request, string timeSlot, DateTime from, DateTime? to);
    Task<bool> CinemaExistsAsync(int id);
    Task<bool> HallTypeExistsAsync(byte id);
    Task<bool> SeatTypeExistsAsync(byte id);
    Task<bool> DayTypeExistsAsync(byte id);
    Task<bool> CinemaHasHallTypeAsync(int cinemaId, byte hallTypeId);
    Task<Tickets.TicketPrice> CreateAsync(Tickets.TicketPrice price);
    Task SaveAsync(Tickets.TicketPrice price);
    Task DeleteAsync(Tickets.TicketPrice price);
}
