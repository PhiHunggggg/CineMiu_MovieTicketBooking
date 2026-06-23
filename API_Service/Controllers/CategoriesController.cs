using DTO.Product;
using Microsoft.AspNetCore.Mvc;
using Services.Product;

namespace API_Service.Controllers
{
    [Route("api/categories")]
    [ApiController]
    public class CategoriesController(ICategoryService categoryService) : ControllerBase
    {
        [HttpGet]
        public async Task<IActionResult> GetAll() => Ok(await categoryService.GetAllAsync());

        [HttpGet("{id:int}")]
        public Task<IActionResult> GetById(int id) =>
            ExecuteAsync(() => categoryService.GetByIdAsync(id), Ok);

        [HttpPost]
        public Task<IActionResult> Create([FromBody] CategoryDTO.CategoryRequest request) =>
            ExecuteAsync(
                () => categoryService.CreateAsync(request),
                category => CreatedAtAction(nameof(GetById), new { id = category.Id }, category));

        [HttpPut("{id:int}")]
        public Task<IActionResult> Update(int id, [FromBody] CategoryDTO.CategoryRequest request) =>
            ExecuteAsync(() => categoryService.UpdateAsync(id, request), Ok);

        [HttpDelete("{id:int}")]
        public Task<IActionResult> Delete(int id) =>
            ExecuteAsync(() => categoryService.DeleteAsync(id), NoContent);

        private async Task<IActionResult> ExecuteAsync<T>(Func<Task<T>> action, Func<T, IActionResult> onSuccess)
        {
            try
            {
                return onSuccess(await action());
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        private async Task<IActionResult> ExecuteAsync(Func<Task> action, Func<IActionResult> onSuccess)
        {
            try
            {
                await action();
                return onSuccess();
            }
            catch (KeyNotFoundException exception)
            {
                return NotFound(new { message = exception.Message });
            }
            catch (ArgumentException exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }
    }
}
