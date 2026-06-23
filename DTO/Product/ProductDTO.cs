namespace DTO.Product
{
    public class ProductDTO
    {
        public class ProductResponse
        {
            public int ItemId { get; set; }
            public int Id => ItemId;
            public byte CatId { get; set; }
            public string ItemName { get; set; } = "";
            public string Name => ItemName;
            public string? Description { get; set; }
            public decimal Price { get; set; }
            public string? ImageUrl { get; set; }
        }
    }
}
