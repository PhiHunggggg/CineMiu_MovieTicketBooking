using DTO.Product;
using Repository.EFCore.Product;

namespace Services.Product
{
    public class ProductService(IProductRepository productRepository) : IProductService
    {
        public Task<List<ProductDTO.ProductResponse>> GetAvailableAsync() =>
            productRepository.GetAvailableAsync();
    }
}
