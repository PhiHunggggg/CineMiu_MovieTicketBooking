using System.Globalization;
using System.Text;

namespace Repository.Pricing
{
    public static class DayTypeLocalizer
    {
        public static string ToVietnamese(string? typeName, string? description = null)
        {
            var normalized = Normalize($"{typeName} {description}");

            if (normalized.Contains("weekday") || normalized.Contains("ngay thuong"))
            {
                return "Ngày thường";
            }

            if (normalized.Contains("weekend") || normalized.Contains("cuoi tuan"))
            {
                return "Cuối tuần";
            }

            if (normalized.Contains("holiday") ||
                normalized.Contains("special") ||
                normalized.Contains("ngay le") ||
                normalized.Contains("ngay dac biet"))
            {
                return "Ngày lễ";
            }

            return string.IsNullOrWhiteSpace(typeName) ? "Loại ngày khác" : typeName.Trim();
        }

        private static string Normalize(string value)
        {
            var formD = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
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
