using BaseCore.Repository.EFCore;
using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Theater
{
    public class CategoriesRepository : Repository<ConcessionCategory>, ICategoriesRepository
    {
        public CategoriesRepository(SqlServerDbContext context) : base(context)
        {
        }

        public Task<List<ConcessionCategory>> GetAllOrderedAsync()
        {
            return _context.ConcessionCategories
                .AsNoTracking()
                .OrderBy(x => x.CatId)
                .ToListAsync();
        }

        public Task<ConcessionCategory?> GetByIdReadOnlyAsync(byte categoryId)
        {
            return _context.ConcessionCategories
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.CatId == categoryId);
        }

        public Task<bool> NameExistsAsync(string name, byte? excludedCategoryId = null)
        {
            return _context.ConcessionCategories.AnyAsync(x =>
                x.CatName == name && (!excludedCategoryId.HasValue || x.CatId != excludedCategoryId.Value));
        }

        public async Task<int> GetNextIdAsync()
        {
            return await _context.ConcessionCategories.AnyAsync()
                ? await _context.ConcessionCategories.MaxAsync(x => x.CatId) + 1
                : 1;
        }

        public Task<bool> HasProductsAsync(byte categoryId)
        {
            return _context.ConcessionItems.AnyAsync(x => x.CatId == categoryId);
        }
    }
}
