using Entities;

namespace Repository.EFCore.Concessions;

public interface IConcessionRepository
{
    Task<List<ConcessionItem>> GetItemsAsync(byte? categoryId, bool activeOnly);
    Task<List<ConcessionCategory>> GetCategoriesAsync();
    Task<ConcessionCategory?> GetCategoryAsync(byte id);
    Task<bool> CategoryExistsAsync(byte id);
    Task<bool> CategoryNameExistsAsync(string name, byte? excludeId = null);
    Task<bool> CategoryHasItemsAsync(byte id);
    Task<ConcessionCategory> CreateCategoryAsync(string name);
    Task SaveCategoryAsync(ConcessionCategory category);
    Task DeleteCategoryAsync(ConcessionCategory category);
    Task<ConcessionItem?> GetItemAsync(int id);
    Task<ConcessionItem> CreateItemAsync(ConcessionItem item);
    Task SaveItemAsync(ConcessionItem item);
}
