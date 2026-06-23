namespace DTO.Product
{
    public class CategoryDTO
    {
        public class CategoryResponse
        {
            public byte Id { get; set; }
            public string Name { get; set; } = "";
            public string Description { get; set; } = "";
        }

        public class CategoryRequest
        {
            public string Name { get; set; } = "";
            public string? Description { get; set; }
        }
    }
}
