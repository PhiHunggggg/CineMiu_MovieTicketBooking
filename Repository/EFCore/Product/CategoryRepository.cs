using DTO.Product;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Product
{
    public class CategoryRepository(SqlServerDbContext context) : ICategoryRepository
    {
        public Task<List<CategoryDTO.CategoryResponse>> GetAllAsync() => context.ConcessionCategories
            .AsNoTracking()
            .OrderBy(x => x.CatId)
            .Select(x => new CategoryDTO.CategoryResponse
            {
                Id = x.CatId,
                Name = x.CatName,
                Description = ""
            })
            .ToListAsync();

        public async Task<CategoryDTO.CategoryResponse> GetByIdAsync(byte categoryId)
        {
            var category = await context.ConcessionCategories.AsNoTracking()
                .FirstOrDefaultAsync(x => x.CatId == categoryId)
                ?? throw new KeyNotFoundException("Category not found");
            return ToResponse(category);
        }

        public async Task<CategoryDTO.CategoryResponse> CreateAsync(CategoryDTO.CategoryRequest request)
        {
            if (await context.ConcessionCategories.AnyAsync(x => x.CatName == request.Name))
            {
                throw new ArgumentException("Category already exists");
            }

            var nextId = await context.ConcessionCategories.AnyAsync()
                ? await context.ConcessionCategories.MaxAsync(x => (int)x.CatId) + 1
                : 1;
            if (nextId > byte.MaxValue)
            {
                throw new ArgumentException("Category id limit reached");
            }

            var now = DateTime.UtcNow;
            var category = new ConcessionCategory
            {
                CatId = (byte)nextId,
                CatName = request.Name,
                CreatedAt = now,
                UpdatedAt = now
            };
            context.ConcessionCategories.Add(category);
            await context.SaveChangesAsync();
            return ToResponse(category);
        }

        public async Task<CategoryDTO.CategoryResponse> UpdateAsync(
            byte categoryId,
            CategoryDTO.CategoryRequest request)
        {
            var category = await context.ConcessionCategories.FirstOrDefaultAsync(x => x.CatId == categoryId)
                ?? throw new KeyNotFoundException("Category not found");
            if (await context.ConcessionCategories.AnyAsync(x =>
                    x.CatId != categoryId && x.CatName == request.Name))
            {
                throw new ArgumentException("Category already exists");
            }

            category.CatName = request.Name;
            category.UpdatedAt = DateTime.UtcNow;
            await context.SaveChangesAsync();
            return ToResponse(category);
        }

        public async Task DeleteAsync(byte categoryId)
        {
            var category = await context.ConcessionCategories.FirstOrDefaultAsync(x => x.CatId == categoryId)
                ?? throw new KeyNotFoundException("Category not found");
            if (await context.ConcessionItems.AnyAsync(x => x.CatId == categoryId))
            {
                throw new ArgumentException("Cannot delete category because it has products");
            }

            context.ConcessionCategories.Remove(category);
            await context.SaveChangesAsync();
        }

        private static CategoryDTO.CategoryResponse ToResponse(ConcessionCategory category) => new()
        {
            Id = category.CatId,
            Name = category.CatName,
            Description = ""
        };
    }
}
