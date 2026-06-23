using DTO.Product;

namespace Services.Product
{
    public interface IProductService
    {
        Task<List<ProductDTO.ProductResponse>> GetAvailableAsync();
    }
}
