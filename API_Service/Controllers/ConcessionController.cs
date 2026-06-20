using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_Service.Controllers
{
    [Route("api/concessions")]
    [ApiController]
    public class ConcessionsController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public ConcessionsController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] byte? catId, [FromQuery] byte? categoryId, [FromQuery] bool activeOnly = true)
        {
            var query = _context.CinemaConcessionItems.AsNoTracking();
            if (activeOnly)
            {
                query = query.Where(x => x.IsAvailable);
            }

            var requestedCategoryId = catId ?? categoryId;
            if (requestedCategoryId.HasValue)
            {
                query = query.Where(x => x.CatId == requestedCategoryId.Value);
            }

            return Ok(await query.OrderBy(x => x.CatId).ThenBy(x => x.ItemName).ToListAsync());
        }

        [HttpGet("categories")]
        public async Task<IActionResult> GetCategories()
        {
            return Ok(await _context.CinemaConcessionCategories.AsNoTracking()
                .OrderBy(x => x.CatId)
                .ToListAsync());
        }

        [HttpPost("categories")]
        public async Task<IActionResult> CreateCategory([FromBody] ConcessionCategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.CatName))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            if (await _context.CinemaConcessionCategories.AnyAsync(x => x.CatName == dto.CatName.Trim()))
            {
                return BadRequest(new { message = "Category already exists" });
            }

            var nextId = await _context.CinemaConcessionCategories.AnyAsync()
                ? (byte)(await _context.CinemaConcessionCategories.MaxAsync(x => x.CatId) + 1)
                : (byte)1;
            var category = new CinemaConcessionCategory { CatId = nextId, CatName = dto.CatName.Trim() };
            _context.CinemaConcessionCategories.Add(category);
            await _context.SaveChangesAsync();
            return Ok(category);
        }

        [HttpPut("categories/{id:int}")]
        public async Task<IActionResult> UpdateCategory(byte id, [FromBody] ConcessionCategoryDto dto)
        {
            var category = await _context.CinemaConcessionCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            if (string.IsNullOrWhiteSpace(dto.CatName))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            category.CatName = dto.CatName.Trim();
            await _context.SaveChangesAsync();
            return Ok(category);
        }

        [HttpDelete("categories/{id:int}")]
        public async Task<IActionResult> DeleteCategory(byte id)
        {
            var category = await _context.CinemaConcessionCategories.FindAsync(id);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            if (await _context.CinemaConcessionItems.AnyAsync(x => x.CatId == id))
            {
                return BadRequest(new { message = "Cannot delete category because it has concession items" });
            }

            _context.CinemaConcessionCategories.Remove(category);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] ConcessionItemDto dto)
        {
            var validation = await ValidateItem(dto);
            if (validation != null)
            {
                return validation;
            }

            var item = new CinemaConcessionItem
            {
                CatId = dto.CatId,
                ItemName = dto.ItemName.Trim(),
                Description = dto.Description,
                Price = dto.Price,
                ImageUrl = dto.ImageUrl,
                IsAvailable = dto.IsAvailable ?? true
            };

            _context.CinemaConcessionItems.Add(item);
            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] ConcessionItemDto dto)
        {
            var item = await _context.CinemaConcessionItems.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { message = "Concession item not found" });
            }

            var validation = await ValidateItem(dto);
            if (validation != null)
            {
                return validation;
            }

            item.CatId = dto.CatId;
            item.ItemName = dto.ItemName.Trim();
            item.Description = dto.Description;
            item.Price = dto.Price;
            item.ImageUrl = dto.ImageUrl;
            item.IsAvailable = dto.IsAvailable ?? item.IsAvailable;

            await _context.SaveChangesAsync();
            return Ok(item);
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var item = await _context.CinemaConcessionItems.FindAsync(id);
            if (item == null)
            {
                return NotFound(new { message = "Concession item not found" });
            }

            item.IsAvailable = false;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        private async Task<IActionResult?> ValidateItem(ConcessionItemDto dto)
        {
            if (!await _context.CinemaConcessionCategories.AnyAsync(x => x.CatId == dto.CatId))
            {
                return BadRequest(new { message = "Category not found" });
            }

            if (string.IsNullOrWhiteSpace(dto.ItemName))
            {
                return BadRequest(new { message = "Item name is required" });
            }

            if (dto.Price < 0)
            {
                return BadRequest(new { message = "Price must be greater than or equal to 0" });
            }

            return null;
        }
    }

    public class ConcessionCategoryDto
    {
        public string CatName { get; set; } = "";
    }

    public class ConcessionItemDto
    {
        public byte CatId { get; set; }
        public string ItemName { get; set; } = "";
        public string? Description { get; set; }
        public decimal Price { get; set; }
        public string? ImageUrl { get; set; }
        public bool? IsAvailable { get; set; }
    }
}
