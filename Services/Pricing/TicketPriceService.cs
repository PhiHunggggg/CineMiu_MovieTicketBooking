using DTO.Pricing;
using Entities;
using Repository.EFCore.Pricing;
using Repository.Pricing;

namespace Services.Pricing;

public class TicketPriceService(ITicketPriceRepository repository) : ITicketPriceService
{
    public Task<object> GetAllAsync(TicketPriceDTO.Query query)
    {
        query.Page = Math.Max(query.Page, 1);
        query.PageSize = query.PageSize is 10 or 20 or 50 ? query.PageSize : 10;
        if (query.MinPrice < 0 || query.MaxPrice < 0)
            throw new ArgumentException("Price range must be greater than or equal to 0");
        if (query.MinPrice.HasValue && query.MaxPrice.HasValue && query.MinPrice > query.MaxPrice)
            throw new ArgumentException("Minimum price must be less than or equal to maximum price");
        if (!string.IsNullOrWhiteSpace(query.TimeSlot))
        {
            query.TimeSlot = TicketPriceCalculator.NormalizeTimeSlot(query.TimeSlot);
            if (!TicketPriceCalculator.AllowedTimeSlots.Contains(query.TimeSlot))
                throw new ArgumentException("Time slot is invalid");
        }
        if (!string.IsNullOrWhiteSpace(query.Status))
        {
            query.Status = query.Status.Trim().ToLowerInvariant();
            if (query.Status is not ("active" or "upcoming" or "expired"))
                throw new ArgumentException("Price status is invalid");
        }
        return repository.GetAllAsync(query);
    }

    public async Task<Tickets.TicketPrice> GetByIdAsync(int id) =>
        await repository.GetByIdAsync(id) ?? throw new KeyNotFoundException("Ticket price not found");

    public async Task<(Tickets.TicketPrice Price, bool Created)> CreateAsync(TicketPriceDTO.Request request)
    {
        var from = (request.EffectiveFrom ?? DateTime.UtcNow).Date;
        var to = request.EffectiveTo?.Date;
        var slot = TicketPriceCalculator.NormalizeTimeSlot(request.TimeSlot);
        await ValidateAsync(request, slot, from, to);

        var exact = await repository.FindExactAsync(request, slot, from, to);
        if (exact != null)
        {
            exact.TimeSlot = slot;
            exact.BasePrice = request.BasePrice;
            await repository.SaveAsync(exact);
            return (exact, false);
        }

        var price = new Tickets.TicketPrice
        {
            CinemaId = request.CinemaId,
            HallTypeId = request.HallTypeId,
            SeatTypeId = request.SeatTypeId,
            DayTypeId = request.DayTypeId,
            TimeSlot = slot,
            BasePrice = request.BasePrice,
            EffectiveFrom = from,
            EffectiveTo = to
        };
        return (await repository.CreateAsync(price), true);
    }

    public async Task<Tickets.TicketPrice> UpdateAsync(int id, TicketPriceDTO.Request request)
    {
        var price = await repository.GetByIdAsync(id, tracked: true)
            ?? throw new KeyNotFoundException("Ticket price not found");
        var from = (request.EffectiveFrom ?? price.EffectiveFrom).Date;
        var to = request.EffectiveTo?.Date;
        var slot = TicketPriceCalculator.NormalizeTimeSlot(request.TimeSlot ?? price.TimeSlot);
        await ValidateAsync(request, slot, from, to);
        price.CinemaId = request.CinemaId;
        price.HallTypeId = request.HallTypeId;
        price.SeatTypeId = request.SeatTypeId;
        price.DayTypeId = request.DayTypeId;
        price.TimeSlot = slot;
        price.BasePrice = request.BasePrice;
        price.EffectiveFrom = from;
        price.EffectiveTo = to;
        await repository.SaveAsync(price);
        return price;
    }

    public async Task DeleteAsync(int id)
    {
        var price = await repository.GetByIdAsync(id, tracked: true)
            ?? throw new KeyNotFoundException("Ticket price not found");
        await repository.DeleteAsync(price);
    }

    private async Task ValidateAsync(TicketPriceDTO.Request request, string slot, DateTime from, DateTime? to)
    {
        if (!await repository.CinemaExistsAsync(request.CinemaId)) throw new ArgumentException("Cinema not found");
        if (!await repository.HallTypeExistsAsync(request.HallTypeId)) throw new ArgumentException("Hall type not found");
        if (!await repository.SeatTypeExistsAsync(request.SeatTypeId)) throw new ArgumentException("Seat type not found");
        if (!await repository.DayTypeExistsAsync(request.DayTypeId)) throw new ArgumentException("Day type not found");
        if (!await repository.CinemaHasHallTypeAsync(request.CinemaId, request.HallTypeId))
            throw new ArgumentException("The selected cinema does not have this hall type");
        if (!TicketPriceCalculator.AllowedTimeSlots.Contains(slot)) throw new ArgumentException("Time slot is invalid");
        if (request.BasePrice < 0) throw new ArgumentException("Base price must be greater than or equal to 0");
        if (to.HasValue && to.Value < from)
            throw new ArgumentException("Effective end date must be on or after the start date");
    }
}
