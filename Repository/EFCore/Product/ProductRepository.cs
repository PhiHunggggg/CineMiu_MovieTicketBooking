using DTO.Product;
using Microsoft.EntityFrameworkCore;

namespace Repository.EFCore.Product
{
    public class ProductRepository(SqlServerDbContext context) : IProductRepository
    {
        public Task<List<ProductDTO.ProductResponse>> GetAvailableAsync() =>
            context.ConcessionItems
                .AsNoTracking()
                .Where(x => x.IsAvailable)
                .OrderBy(x => x.CatId)
                .ThenBy(x => x.ItemName)
                .Select(x => new ProductDTO.ProductResponse
                {
                    ItemId = x.ItemId,
                    CatId = x.CatId,
                    ItemName = x.ItemName,
                    Description = x.Description,
                    Price = x.Price,
                    ImageUrl = x.ImageUrl
                })
                .ToListAsync();
    }
}
