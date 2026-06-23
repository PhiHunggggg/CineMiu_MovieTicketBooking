namespace DTO.Theater
{
    public class CategoryDTO
    {
        public class CategoryRequest
        {
            public string Name { get; set; } = "";
            public string? Description { get; set; }
        }

        public class CategoryResponse
        {
            public byte Id { get; set; }
            public string Name { get; set; } = "";
            public string Description { get; set; } = "";
        }
    }
}
