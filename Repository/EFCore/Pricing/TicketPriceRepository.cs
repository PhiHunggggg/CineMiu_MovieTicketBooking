using DTO.Pricing;
using Entities;
using Microsoft.EntityFrameworkCore;
using Repository.Pricing;
using System.Globalization;

namespace Repository.EFCore.Pricing;

public class TicketPriceRepository(SqlServerDbContext context) : ITicketPriceRepository
{
    public async Task<object> GetAllAsync(TicketPriceDTO.Query filter)
    {
        var query =
            from price in context.TicketPrices.AsNoTracking()
            join cinema in context.Cinemas.AsNoTracking() on price.CinemaId equals cinema.CinemaId
            join hallType in context.HallTypes.AsNoTracking() on price.HallTypeId equals hallType.HallTypeId
            join seatType in context.SeatTypes.AsNoTracking() on price.SeatTypeId equals seatType.SeatTypeId
            join dayType in context.DayTypes.AsNoTracking() on price.DayTypeId equals dayType.DayTypeId
            select new { price, cinema, hallType, seatType, dayType };

        if (filter.CinemaId.HasValue) query = query.Where(x => x.price.CinemaId == filter.CinemaId.Value);
        if (filter.HallTypeId.HasValue) query = query.Where(x => x.price.HallTypeId == filter.HallTypeId.Value);
        if (filter.SeatTypeId.HasValue) query = query.Where(x => x.price.SeatTypeId == filter.SeatTypeId.Value);
        if (filter.DayTypeId.HasValue) query = query.Where(x => x.price.DayTypeId == filter.DayTypeId.Value);
        if (!string.IsNullOrWhiteSpace(filter.TimeSlot)) query = query.Where(x => x.price.TimeSlot == filter.TimeSlot);
        if (filter.MinPrice.HasValue) query = query.Where(x => x.price.BasePrice >= filter.MinPrice.Value);
        if (filter.MaxPrice.HasValue) query = query.Where(x => x.price.BasePrice <= filter.MaxPrice.Value);

        var today = DateTime.Today;
        query = filter.Status switch
        {
            "active" => query.Where(x => x.price.EffectiveFrom.Date <= today &&
                (!x.price.EffectiveTo.HasValue || x.price.EffectiveTo.Value.Date >= today)),
            "upcoming" => query.Where(x => x.price.EffectiveFrom.Date > today),
            "expired" => query.Where(x => x.price.EffectiveTo.HasValue && x.price.EffectiveTo.Value.Date < today),
            _ => query
        };

        if (!string.IsNullOrWhiteSpace(filter.Keyword))
        {
            var search = filter.Keyword.Trim();
            var priceKeyword = ParsePriceKeyword(search);
            var matchingDayTypeIds = (await context.DayTypes.AsNoTracking().ToListAsync())
                .Where(x => DayTypeLocalizer.ToVietnamese(x.TypeName, x.Description)
                    .Contains(search, StringComparison.OrdinalIgnoreCase))
                .Select(x => x.DayTypeId).ToList();
            query = query.Where(x =>
                x.cinema.CinemaName.Contains(search) ||
                x.cinema.City.Contains(search) ||
                (x.cinema.District != null && x.cinema.District.Contains(search)) ||
                x.hallType.TypeName.Contains(search) ||
                x.seatType.TypeName.Contains(search) ||
                x.dayType.TypeName.Contains(search) ||
                matchingDayTypeIds.Contains(x.price.DayTypeId) ||
                x.price.TimeSlot.Contains(search) ||
                (priceKeyword.HasValue && x.price.BasePrice == priceKeyword.Value));
        }

        var totalCount = await query.CountAsync();
        var totalPages = Math.Max((int)Math.Ceiling(totalCount / (double)filter.PageSize), 1);
        var page = Math.Min(filter.Page, totalPages);
        var summary = await query.GroupBy(_ => 1).Select(group => new
        {
            minPrice = group.Min(x => x.price.BasePrice),
            maxPrice = group.Max(x => x.price.BasePrice),
            cinemaCount = group.Select(x => x.price.CinemaId).Distinct().Count()
        }).FirstOrDefaultAsync();

        var rows = await query.OrderBy(x => x.cinema.CinemaName)
            .ThenBy(x => x.hallType.HallTypeId)
            .ThenBy(x => x.seatType.SeatTypeId)
            .ThenBy(x => x.dayType.DayTypeId)
            .ThenBy(x => x.price.TimeSlot)
            .ThenBy(x => x.price.PriceId)
            .Skip((page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(x => new
            {
                x.price, x.cinema, x.hallType, x.seatType, x.dayType,
                status = x.price.EffectiveFrom.Date > today ? "upcoming" :
                    x.price.EffectiveTo.HasValue && x.price.EffectiveTo.Value.Date < today ? "expired" : "active"
            }).ToListAsync();

        var items = rows.Select(x => new
        {
            x.price,
            x.cinema,
            x.hallType,
            x.seatType,
            dayType = new
            {
                x.dayType.DayTypeId,
                TypeName = DayTypeLocalizer.ToVietnamese(x.dayType.TypeName, x.dayType.Description),
                x.dayType.Description
            },
            x.status
        });

        return new
        {
            items,
            totalCount,
            page,
            pageSize = filter.PageSize,
            totalPages,
            summary = new
            {
                total = totalCount,
                minPrice = summary?.minPrice ?? 0,
                maxPrice = summary?.maxPrice ?? 0,
                cinemaCount = summary?.cinemaCount ?? 0
            }
        };
    }

    public Task<Tickets.TicketPrice?> GetByIdAsync(int id, bool tracked = false) => tracked
        ? context.TicketPrices.FirstOrDefaultAsync(x => x.PriceId == id)
        : context.TicketPrices.AsNoTracking().FirstOrDefaultAsync(x => x.PriceId == id);

    public async Task<Tickets.TicketPrice?> FindExactAsync(
        TicketPriceDTO.Request request, string timeSlot, DateTime from, DateTime? to)
    {
        var candidates = await context.TicketPrices.Where(x =>
            x.CinemaId == request.CinemaId && x.HallTypeId == request.HallTypeId &&
            x.SeatTypeId == request.SeatTypeId && x.DayTypeId == request.DayTypeId).ToListAsync();
        return candidates.FirstOrDefault(x =>
            string.Equals(TicketPriceCalculator.NormalizeTimeSlot(x.TimeSlot), timeSlot, StringComparison.OrdinalIgnoreCase) &&
            x.EffectiveFrom.Date == from && NullableDateEquals(x.EffectiveTo, to));
    }

    public Task<bool> CinemaExistsAsync(int id) => context.Cinemas.AnyAsync(x => x.CinemaId == id);
    public Task<bool> HallTypeExistsAsync(byte id) => context.HallTypes.AnyAsync(x => x.HallTypeId == id);
    public Task<bool> SeatTypeExistsAsync(byte id) => context.SeatTypes.AnyAsync(x => x.SeatTypeId == id);
    public Task<bool> DayTypeExistsAsync(byte id) => context.DayTypes.AnyAsync(x => x.DayTypeId == id);
    public Task<bool> CinemaHasHallTypeAsync(int cinemaId, byte hallTypeId) =>
        context.Halls.AnyAsync(x => x.CinemaId == cinemaId && x.HallTypeId == hallTypeId);

    public async Task<Tickets.TicketPrice> CreateAsync(Tickets.TicketPrice price)
    {
        context.TicketPrices.Add(price);
        await context.SaveChangesAsync();
        return price;
    }

    public Task SaveAsync(Tickets.TicketPrice price) => context.SaveChangesAsync();

    public async Task DeleteAsync(Tickets.TicketPrice price)
    {
        context.TicketPrices.Remove(price);
        await context.SaveChangesAsync();
    }

    private static bool NullableDateEquals(DateTime? left, DateTime? right) =>
        !left.HasValue || !right.HasValue ? left.HasValue == right.HasValue : left.Value.Date == right.Value.Date;

    private static decimal? ParsePriceKeyword(string keyword)
    {
        var digits = new string(keyword.Where(char.IsDigit).ToArray());
        return decimal.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture, out var value) ? value : null;
    }
}
