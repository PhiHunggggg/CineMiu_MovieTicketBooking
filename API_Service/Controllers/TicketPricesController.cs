using DTO.Pricing;
using Microsoft.AspNetCore.Mvc;
using Services.Pricing;

namespace API_Service.Controllers;

[Route("api/ticket-prices")]
[ApiController]
public class TicketPricesController(ITicketPriceService service) : ApiControllerBase
{
    [HttpGet]
    public Task<IActionResult> GetAll([FromQuery] TicketPriceDTO.Query query) =>
        ExecuteAsync(async () => Ok(await service.GetAllAsync(query)));

    [HttpGet("{id:int}")]
    public Task<IActionResult> GetById(int id) =>
        ExecuteAsync(async () => Ok(await service.GetByIdAsync(id)));

    [HttpPost]
    public Task<IActionResult> Create([FromBody] TicketPriceDTO.Request request) => ExecuteAsync(async () =>
    {
        var result = await service.CreateAsync(request);
        return result.Created
            ? CreatedAtAction(nameof(GetById), new { id = result.Price.PriceId }, result.Price)
            : Ok(result.Price);
    });

    [HttpPut("{id:int}")]
    public Task<IActionResult> Update(int id, [FromBody] TicketPriceDTO.Request request) =>
        ExecuteAsync(async () => Ok(await service.UpdateAsync(id, request)));

    [HttpDelete("{id:int}")]
    public Task<IActionResult> Delete(int id) => ExecuteAsync(async () =>
    {
        await service.DeleteAsync(id);
        return NoContent();
    });
}
