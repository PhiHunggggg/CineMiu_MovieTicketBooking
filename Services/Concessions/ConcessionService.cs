using DTO.Administration;
using Entities;
using Repository.EFCore.Concessions;

namespace Services.Concessions;

public class ConcessionService(IConcessionRepository repository) : IConcessionService
{
    public Task<List<ConcessionItem>> GetItemsAsync(byte? categoryId, bool activeOnly) =>
        repository.GetItemsAsync(categoryId, activeOnly);

    public Task<List<ConcessionCategory>> GetCategoriesAsync() => repository.GetCategoriesAsync();

    public async Task<ConcessionCategory> CreateCategoryAsync(ConcessionDTO.CategoryRequest request)
    {
        var name = RequireCategoryName(request.CatName);
        if (await repository.CategoryNameExistsAsync(name))
            throw new ArgumentException("Category already exists");
        return await repository.CreateCategoryAsync(name);
    }

    public async Task<ConcessionCategory> UpdateCategoryAsync(byte id, ConcessionDTO.CategoryRequest request)
    {
        var category = await repository.GetCategoryAsync(id)
            ?? throw new KeyNotFoundException("Category not found");
        var name = RequireCategoryName(request.CatName);
        if (await repository.CategoryNameExistsAsync(name, id))
            throw new ArgumentException("Category already exists");
        category.CatName = name;
        await repository.SaveCategoryAsync(category);
        return category;
    }

    public async Task DeleteCategoryAsync(byte id)
    {
        var category = await repository.GetCategoryAsync(id)
            ?? throw new KeyNotFoundException("Category not found");
        if (await repository.CategoryHasItemsAsync(id))
            throw new InvalidOperationException("Cannot delete category because it has concession items");
        await repository.DeleteCategoryAsync(category);
    }

    public async Task<ConcessionItem> CreateItemAsync(ConcessionDTO.ItemRequest request)
    {
        await ValidateItemAsync(request);
        return await repository.CreateItemAsync(ToEntity(request));
    }

    public async Task<ConcessionItem> UpdateItemAsync(int id, ConcessionDTO.ItemRequest request)
    {
        var item = await repository.GetItemAsync(id)
            ?? throw new KeyNotFoundException("Concession item not found");
        await ValidateItemAsync(request);
        item.CatId = request.CatId;
        item.ItemName = request.ItemName.Trim();
        item.Description = request.Description;
        item.Price = request.Price;
        item.ImageUrl = request.ImageUrl;
        item.IsAvailable = request.IsAvailable ?? item.IsAvailable;
        await repository.SaveItemAsync(item);
        return item;
    }

    public async Task DeleteItemAsync(int id)
    {
        var item = await repository.GetItemAsync(id)
            ?? throw new KeyNotFoundException("Concession item not found");
        item.IsAvailable = false;
        await repository.SaveItemAsync(item);
    }

    private async Task ValidateItemAsync(ConcessionDTO.ItemRequest request)
    {
        if (!await repository.CategoryExistsAsync(request.CatId))
            throw new ArgumentException("Category not found");
        if (string.IsNullOrWhiteSpace(request.ItemName))
            throw new ArgumentException("Item name is required");
        if (request.Price < 0)
            throw new ArgumentException("Price must be greater than or equal to 0");
    }

    private static string RequireCategoryName(string? name)
    {
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Category name is required");
        return name.Trim();
    }

    private static ConcessionItem ToEntity(ConcessionDTO.ItemRequest request) => new()
    {
        CatId = request.CatId,
        ItemName = request.ItemName.Trim(),
        Description = request.Description,
        Price = request.Price,
        ImageUrl = request.ImageUrl,
        IsAvailable = request.IsAvailable ?? true
    };
}
