using DTO.Theater;
using Entities;
using Repository.EFCore.Theater;

namespace Services.Theater
{
    public class CategoriesService(ICategoriesRepository categoriesRepository) : ICategoriesService
    {
        public async Task<List<CategoryDTO.CategoryResponse>> GetAllAsync()
        {
            var categories = await categoriesRepository.GetAllOrderedAsync();
            return categories.Select(ToResponse).ToList();
        }

        public async Task<CategoryDTO.CategoryResponse> GetByIdAsync(int id)
        {
            var categoryId = NormalizeId(id);
            var category = await categoriesRepository.GetByIdReadOnlyAsync(categoryId)
                ?? throw new KeyNotFoundException("Category not found");

            return ToResponse(category);
        }

        public async Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request)
        {
            var name = NormalizeName(request.Name);
            if (await categoriesRepository.NameExistsAsync(name))
            {
                throw new InvalidOperationException("Category already exists");
            }

            var nextId = await categoriesRepository.GetNextIdAsync();
            if (nextId > byte.MaxValue)
            {
                throw new InvalidOperationException("Category id limit reached");
            }

            var category = await categoriesRepository.AddAsync(new ConcessionCategory
            {
                CatId = (byte)nextId,
                CatName = name,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            });

            return ToResponse(category);
        }

        public async Task<CategoryDTO.CategoryResponse> UpdateAsync(int id, CategoryDTO.CategoryRequest request)
        {
            var categoryId = NormalizeId(id);
            var name = NormalizeName(request.Name);
            var category = await categoriesRepository.GetByIdAsync(categoryId)
                ?? throw new KeyNotFoundException("Category not found");

            if (await categoriesRepository.NameExistsAsync(name, categoryId))
            {
                throw new InvalidOperationException("Category already exists");
            }

            category.CatName = name;
            category.UpdatedAt = DateTime.UtcNow;
            await categoriesRepository.UpdateAsync(category);
            return ToResponse(category);
        }

        public async Task DeleteAsync(int id)
        {
            var categoryId = NormalizeId(id);
            var category = await categoriesRepository.GetByIdAsync(categoryId)
                ?? throw new KeyNotFoundException("Category not found");

            if (await categoriesRepository.HasProductsAsync(categoryId))
            {
                throw new InvalidOperationException("Cannot delete category because it has products");
            }

            await categoriesRepository.DeleteAsync(category);
        }

        private static byte NormalizeId(int id)
        {
            if (id < byte.MinValue || id > byte.MaxValue)
            {
                throw new ArgumentOutOfRangeException(nameof(id), "Category id is invalid");
            }

            return (byte)id;
        }

        private static string NormalizeName(string? name)
        {
            if (string.IsNullOrWhiteSpace(name))
            {
                throw new ArgumentException("Category name is required", nameof(name));
            }

            return name.Trim();
        }

        private static CategoryDTO.CategoryResponse ToResponse(ConcessionCategory category)
        {
            return new CategoryDTO.CategoryResponse
            {
                Id = category.CatId,
                Name = category.CatName,
                Description = ""
            };
        }
    }
}
