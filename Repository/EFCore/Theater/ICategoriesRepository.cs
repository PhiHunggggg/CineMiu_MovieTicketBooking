using BaseCore.Repository.EFCore;
using Entities;

namespace Repository.EFCore.Theater
{
    public interface ICategoriesRepository : IRepository<ConcessionCategory>
    {
        Task<List<ConcessionCategory>> GetAllOrderedAsync();
        Task<ConcessionCategory?> GetByIdReadOnlyAsync(byte categoryId);
        Task<bool> NameExistsAsync(string name, byte? excludedCategoryId = null);
        Task<int> GetNextIdAsync();
        Task<bool> HasProductsAsync(byte categoryId);
    }
}
