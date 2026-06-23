using DTO.Product;

namespace Repository.EFCore.Product
{
    public interface IProductRepository
    {
        Task<List<ProductDTO.ProductResponse>> GetAvailableAsync();
    }
}
