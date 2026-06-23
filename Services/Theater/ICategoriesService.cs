using DTO.Theater;

namespace Services.Theater
{
    public interface ICategoriesService
    {
        Task<List<CategoryDTO.CategoryResponse>> GetAllAsync();
        Task<CategoryDTO.CategoryResponse> GetByIdAsync(int id);
        Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request);
        Task<CategoryDTO.CategoryResponse> UpdateAsync(int id, CategoryDTO.CategoryRequest request);
        Task DeleteAsync(int id);
    }
}
