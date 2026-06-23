using DTO.Administration;
using Entities;

namespace Services.Concessions;

public interface IConcessionService
{
    Task<List<ConcessionItem>> GetItemsAsync(byte? categoryId, bool activeOnly);
    Task<List<ConcessionCategory>> GetCategoriesAsync();
    Task<ConcessionCategory> CreateCategoryAsync(ConcessionDTO.CategoryRequest request);
    Task<ConcessionCategory> UpdateCategoryAsync(byte id, ConcessionDTO.CategoryRequest request);
    Task DeleteCategoryAsync(byte id);
    Task<ConcessionItem> CreateItemAsync(ConcessionDTO.ItemRequest request);
    Task<ConcessionItem> UpdateItemAsync(int id, ConcessionDTO.ItemRequest request);
    Task DeleteItemAsync(int id);
}
