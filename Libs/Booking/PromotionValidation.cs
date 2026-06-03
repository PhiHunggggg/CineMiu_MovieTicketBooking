using System;
using System.Collections.Generic;
using System.Text;
using Entities;

namespace Libs.Booking
{
    public class PromotionValidation
    {
        public class BookingPromotionValidation
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
}
