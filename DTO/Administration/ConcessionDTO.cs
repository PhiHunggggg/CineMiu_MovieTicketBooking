namespace DTO.Administration;

public static class ConcessionDTO
{
    public class CategoryRequest
    {
        public string CatName { get; set; } = "";
    }

    public class ItemRequest
    {
        public byte CatId { get; set; }
        public string ItemName { get; set; } = "";
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public bool? IsAvailable { get; set; }
    }
}
