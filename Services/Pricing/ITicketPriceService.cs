using DTO.Pricing;
using Entities;

namespace Services.Pricing;

public interface ITicketPriceService
{
    Task<object> GetAllAsync(TicketPriceDTO.Query query);
    Task<Tickets.TicketPrice> GetByIdAsync(int id);
    Task<(Tickets.TicketPrice Price, bool Created)> CreateAsync(TicketPriceDTO.Request request);
    Task<Tickets.TicketPrice> UpdateAsync(int id, TicketPriceDTO.Request request);
    Task DeleteAsync(int id);
}
