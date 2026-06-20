namespace DTO.Booking
{
    public class PaymentDto
    {
        public byte MethodId { get; set; }
        public string? TransactionRef { get; set; }
        public decimal Amount { get; set; }
    }
}
