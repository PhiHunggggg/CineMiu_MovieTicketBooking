using DTO.Administration;
using Microsoft.AspNetCore.Mvc;
using Services.Concessions;

namespace API_Service.Controllers;

[Route("api/concessions")]
[ApiController]
public class ConcessionsController(IConcessionService service) : ApiControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] byte? catId,
        [FromQuery] byte? categoryId,
        [FromQuery] bool activeOnly = true) =>
        Ok(await service.GetItemsAsync(catId ?? categoryId, activeOnly));

    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories() => Ok(await service.GetCategoriesAsync());

    [HttpPost("categories")]
    public Task<IActionResult> CreateCategory([FromBody] ConcessionDTO.CategoryRequest request) =>
        ExecuteAsync(async () => Ok(await service.CreateCategoryAsync(request)));

    [HttpPut("categories/{id:int}")]
    public Task<IActionResult> UpdateCategory(byte id, [FromBody] ConcessionDTO.CategoryRequest request) =>
        ExecuteAsync(async () => Ok(await service.UpdateCategoryAsync(id, request)));

    [HttpDelete("categories/{id:int}")]
    public Task<IActionResult> DeleteCategory(byte id) => ExecuteAsync(async () =>
    {
        await service.DeleteCategoryAsync(id);
        return NoContent();
    });

    [HttpPost]
    public Task<IActionResult> Create([FromBody] ConcessionDTO.ItemRequest request) =>
        ExecuteAsync(async () => Ok(await service.CreateItemAsync(request)));

    [HttpPut("{id:int}")]
    public Task<IActionResult> Update(int id, [FromBody] ConcessionDTO.ItemRequest request) =>
        ExecuteAsync(async () => Ok(await service.UpdateItemAsync(id, request)));

    [HttpDelete("{id:int}")]
    public Task<IActionResult> Delete(int id) => ExecuteAsync(async () =>
    {
        await service.DeleteItemAsync(id);
        return NoContent();
    });
}
