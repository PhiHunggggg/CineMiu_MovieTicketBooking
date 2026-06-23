namespace DTO.Loyalty
{
    public class LoyaltyDTO
    {
        public class MembershipResponse
        {
            public int UserId { get; set; }
            public int TotalPoints { get; set; }
            public int TierId { get; set; }
            public string TierName { get; set; } = "";
            public decimal DiscountPercent { get; set; }
            public string? Benefits { get; set; }
            public DateTime UpdatedAt { get; set; }
        }

        public class PointTransactionResponse
        {
            public int TransactionId { get; set; }
            public int UserId { get; set; }
            public int? BookingId { get; set; }
            public int Points { get; set; }
            public string TransactionType { get; set; } = "";
            public string? Description { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        public class AddPointsRequest
        {
            public int UserId { get; set; }
            public int Points { get; set; }
            public int? BookingId { get; set; }
            public string? Description { get; set; }
        }

        public class MessageResponse
        {
            public string Message { get; set; } = "";
        }
    }
}
