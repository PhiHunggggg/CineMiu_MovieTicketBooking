using Entities;
using System.Globalization;
using System.Text;

namespace Repository.Pricing
{
    public static class TicketPriceCalculator
    {
        public const decimal DefaultBasePrice = 75000m;

        public static readonly IReadOnlySet<string> AllowedTimeSlots = new HashSet<string>(
            ["all_day", "morning", "afternoon", "evening", "late_night"],
            StringComparer.OrdinalIgnoreCase);

        public static decimal ResolvePrice(
            ShowTime showtime,
            int cinemaId,
            byte hallTypeId,
            byte seatTypeId,
            decimal seatPriceModifier,
            byte standardSeatTypeId,
            IReadOnlyCollection<DayType> dayTypes,
            IEnumerable<Tickets.TicketPrice> priceRules)
        {
            var directRule = FindRule(
                showtime,
                cinemaId,
                hallTypeId,
                seatTypeId,
                dayTypes,
                priceRules);

            if (directRule != null)
            {
                return Math.Max(0, directRule.BasePrice);
            }

            var standardRule = seatTypeId == standardSeatTypeId
                ? null
                : FindRule(
                    showtime,
                    cinemaId,
                    hallTypeId,
                    standardSeatTypeId,
                    dayTypes,
                    priceRules);

            var basePrice = standardRule?.BasePrice ?? DefaultBasePrice;
            return Math.Max(0, basePrice + seatPriceModifier);
        }

        public static string NormalizeTimeSlot(string? timeSlot)
        {
            var normalized = timeSlot?.Trim().ToLowerInvariant();
            return string.IsNullOrWhiteSpace(normalized) ? "all_day" : normalized;
        }

        public static string ResolveTimeSlot(DateTime startTime)
        {
            var hour = startTime.Hour;
            if (hour < 12)
            {
                return "morning";
            }

            if (hour < 18)
            {
                return "afternoon";
            }

            return hour < 23 ? "evening" : "late_night";
        }

        public static byte? ResolveDayTypeId(ShowTime showtime, IReadOnlyCollection<DayType> dayTypes)
        {
            if (dayTypes.Count == 0)
            {
                return null;
            }

            var candidateNames = showtime.IsSpecial
                ? new[] { "ngày lễ", "le", "special" }
                : showtime.StartTime.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday
                    ? new[] { "weekend", "cuoi tuan" }
                    : new[] { "weekday", "ngay thuong" };

            foreach (var candidateName in candidateNames)
            {
                var dayType = dayTypes.FirstOrDefault(x =>
                    NormalizeLookup(x.TypeName).Contains(candidateName) ||
                    (!string.IsNullOrWhiteSpace(x.Description) &&
                     NormalizeLookup(x.Description).Contains(candidateName)));

                if (dayType != null)
                {
                    return dayType.DayTypeId;
                }
            }

            return dayTypes.OrderBy(x => x.DayTypeId).First().DayTypeId;
        }

        private static Tickets.TicketPrice? FindRule(
            ShowTime showtime,
            int cinemaId,
            byte hallTypeId,
            byte seatTypeId,
            IReadOnlyCollection<DayType> dayTypes,
            IEnumerable<Tickets.TicketPrice> priceRules)
        {
            var dayTypeId = ResolveDayTypeId(showtime, dayTypes);
            if (!dayTypeId.HasValue)
            {
                return null;
            }

            var showDate = showtime.StartTime.Date;
            var timeSlot = ResolveTimeSlot(showtime.StartTime);

            return priceRules
                .Where(x =>
                    x.CinemaId == cinemaId &&
                    x.HallTypeId == hallTypeId &&
                    x.SeatTypeId == seatTypeId &&
                    x.DayTypeId == dayTypeId.Value &&
                    x.EffectiveFrom.Date <= showDate &&
                    (!x.EffectiveTo.HasValue || x.EffectiveTo.Value.Date >= showDate) &&
                    (string.Equals(x.TimeSlot, timeSlot, StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(x.TimeSlot, "all_day", StringComparison.OrdinalIgnoreCase)))
                .OrderByDescending(x => string.Equals(x.TimeSlot, timeSlot, StringComparison.OrdinalIgnoreCase))
                .ThenByDescending(x => x.EffectiveFrom)
                .ThenByDescending(x => x.PriceId)
                .FirstOrDefault();
        }

        private static string NormalizeLookup(string value)
        {
            var formD = value.ToLowerInvariant().Normalize(NormalizationForm.FormD);
            var builder = new StringBuilder(formD.Length);

            foreach (var character in formD)
            {
                if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
                {
                    builder.Append(character);
                }
            }

            return builder.ToString().Normalize(NormalizationForm.FormC);
        }
    }
}
