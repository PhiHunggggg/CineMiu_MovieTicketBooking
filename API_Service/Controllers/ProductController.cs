using Microsoft.AspNetCore.Mvc;
using Services.Product;

namespace API_Service.Controllers
{
    [Route("api/products")]
    [ApiController]
    public class ProductController(IProductService productService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await productService.GetAvailableAsync());
    }
}
