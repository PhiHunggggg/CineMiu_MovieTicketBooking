using DTO.Product;

namespace Repository.EFCore.Product
{
    public interface ICategoryRepository
    {
        Task<List<CategoryDTO.CategoryResponse>> GetAllAsync();
        Task<CategoryDTO.CategoryResponse> GetByIdAsync(byte categoryId);
        Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request);
        Task<CategoryDTO.CategoryResponse> UpdateAsync(byte categoryId, CategoryDTO.CategoryRequest request);
        Task DeleteAsync(byte categoryId);
    }
}
