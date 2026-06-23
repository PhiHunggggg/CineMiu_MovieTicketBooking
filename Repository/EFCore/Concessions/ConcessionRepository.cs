using Entities;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Concessions;

public class ConcessionRepository(SqlServerDbContext context) : IConcessionRepository
{
    public async Task<List<ConcessionItem>> GetItemsAsync(byte? categoryId, bool activeOnly)
    {
        var query = context.ConcessionItems.AsNoTracking();
        if (activeOnly) query = query.Where(x => x.IsAvailable);
        if (categoryId.HasValue) query = query.Where(x => x.CatId == categoryId.Value);
        return await query.OrderBy(x => x.CatId).ThenBy(x => x.ItemName).ToListAsync();
    }

    public Task<List<ConcessionCategory>> GetCategoriesAsync() =>
        context.ConcessionCategories.AsNoTracking().OrderBy(x => x.CatId).ToListAsync();

    public Task<ConcessionCategory?> GetCategoryAsync(byte id) =>
        context.ConcessionCategories.FirstOrDefaultAsync(x => x.CatId == id);

    public Task<bool> CategoryExistsAsync(byte id) =>
        context.ConcessionCategories.AnyAsync(x => x.CatId == id);

    public Task<bool> CategoryNameExistsAsync(string name, byte? excludeId = null) =>
        context.ConcessionCategories.AnyAsync(x =>
            x.CatName == name && (!excludeId.HasValue || x.CatId != excludeId.Value));

    public Task<bool> CategoryHasItemsAsync(byte id) =>
        context.ConcessionItems.AnyAsync(x => x.CatId == id);

    public async Task<ConcessionCategory> CreateCategoryAsync(string name)
    {
        var nextId = await context.ConcessionCategories.AnyAsync()
            ? (byte)(await context.ConcessionCategories.MaxAsync(x => x.CatId) + 1)
            : (byte)1;
        var category = new ConcessionCategory
        {
            CatId = nextId,
            CatName = name,
            CreatedAt = DateTime.UtcNow
        };
        context.ConcessionCategories.Add(category);
        await context.SaveChangesAsync();
        return category;
    }

    public async Task SaveCategoryAsync(ConcessionCategory category)
    {
        category.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }

    public async Task DeleteCategoryAsync(ConcessionCategory category)
    {
        context.ConcessionCategories.Remove(category);
        await context.SaveChangesAsync();
    }

    public Task<ConcessionItem?> GetItemAsync(int id) =>
        context.ConcessionItems.FirstOrDefaultAsync(x => x.ItemId == id);

    public async Task<ConcessionItem> CreateItemAsync(ConcessionItem item)
    {
        item.CreatedAt = DateTime.UtcNow;
        context.ConcessionItems.Add(item);
        await context.SaveChangesAsync();
        return item;
    }

    public async Task SaveItemAsync(ConcessionItem item)
    {
        item.UpdatedAt = DateTime.UtcNow;
        await context.SaveChangesAsync();
    }
}
