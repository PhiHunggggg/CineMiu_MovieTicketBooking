using DTO.Product;

namespace Services.Product
{
    public interface ICategoryService
    {
        Task<List<CategoryDTO.CategoryResponse>> GetAllAsync();
        Task<CategoryDTO.CategoryResponse> GetByIdAsync(int categoryId);
        Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request);
        Task<CategoryDTO.CategoryResponse> UpdateAsync(int categoryId, CategoryDTO.CategoryRequest request);
        Task DeleteAsync(int categoryId);
    }
}
