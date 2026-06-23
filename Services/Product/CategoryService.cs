using DTO.Product;
using Repository.EFCore.Product;

namespace Services.Product
{
    public class CategoryService(ICategoryRepository categoryRepository) : ICategoryService
    {
        public Task<List<CategoryDTO.CategoryResponse>> GetAllAsync() => categoryRepository.GetAllAsync();

        public Task<CategoryDTO.CategoryResponse> GetByIdAsync(int categoryId) =>
            categoryRepository.GetByIdAsync(NormalizeId(categoryId));

        public Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request)
        {
            NormalizeRequest(request);
            return categoryRepository.CreateAsync(request);
        }

        public Task<CategoryDTO.CategoryResponse> UpdateAsync(
            int categoryId,
            CategoryDTO.CategoryRequest request)
        {
            NormalizeRequest(request);
            return categoryRepository.UpdateAsync(NormalizeId(categoryId), request);
        }

        public Task DeleteAsync(int categoryId) => categoryRepository.DeleteAsync(NormalizeId(categoryId));

        private static byte NormalizeId(int categoryId)
        {
            if (categoryId < byte.MinValue || categoryId > byte.MaxValue)
            {
                throw new ArgumentException("Category id is invalid");
            }
            return (byte)categoryId;
        }

        private static void NormalizeRequest(CategoryDTO.CategoryRequest request)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                throw new ArgumentException("Category name is required");
            }
            request.Name = request.Name.Trim();
            request.Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim();
        }
    }
}
