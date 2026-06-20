using Entities;
using Repository;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace API_Service.Controllers
{
    [Route("api/categories")]
    [ApiController]
    public class CategoriesController : ControllerBase
    {
        private readonly SqlServerDbContext _context;

        public CategoriesController(SqlServerDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var categories = await _context.CinemaConcessionCategories.AsNoTracking()
                .OrderBy(x => x.CatId)
                .Select(x => ToResponse(x))
                .ToListAsync();

            return Ok(categories);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            if (!TryNormalizeCategoryId(id, out var categoryId, out var error))
            {
                return BadRequest(new { message = error });
            }

            var category = await _context.CinemaConcessionCategories.AsNoTracking()
                .FirstOrDefaultAsync(x => x.CatId == categoryId);

            return category == null
                ? NotFound(new { message = "Category not found" })
                : Ok(ToResponse(category));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CategoryDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            var name = dto.Name.Trim();
            if (await _context.CinemaConcessionCategories.AnyAsync(x => x.CatName == name))
            {
                return BadRequest(new { message = "Category already exists" });
            }

            var nextId = await _context.CinemaConcessionCategories.AnyAsync()
                ? await _context.CinemaConcessionCategories.MaxAsync(x => x.CatId) + 1
                : 1;

            if (nextId > byte.MaxValue)
            {
                return BadRequest(new { message = "Category id limit reached" });
            }

            var category = new CinemaConcessionCategory
            {
                CatId = (byte)nextId,
                CatName = name
            };

            _context.CinemaConcessionCategories.Add(category);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetById), new { id = category.CatId }, ToResponse(category));
        }

        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] CategoryDto dto)
        {
            if (!TryNormalizeCategoryId(id, out var categoryId, out var error))
            {
                return BadRequest(new { message = error });
            }

            if (string.IsNullOrWhiteSpace(dto.Name))
            {
                return BadRequest(new { message = "Category name is required" });
            }

            var category = await _context.CinemaConcessionCategories.FindAsync(categoryId);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            var name = dto.Name.Trim();
            if (await _context.CinemaConcessionCategories.AnyAsync(x => x.CatId != categoryId && x.CatName == name))
            {
                return BadRequest(new { message = "Category already exists" });
            }

            category.CatName = name;
            await _context.SaveChangesAsync();

            return Ok(ToResponse(category));
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            if (!TryNormalizeCategoryId(id, out var categoryId, out var error))
            {
                return BadRequest(new { message = error });
            }

            var category = await _context.CinemaConcessionCategories.FindAsync(categoryId);
            if (category == null)
            {
                return NotFound(new { message = "Category not found" });
            }

            if (await _context.CinemaConcessionItems.AnyAsync(x => x.CatId == categoryId))
            {
                return BadRequest(new { message = "Cannot delete category because it has products" });
            }

            _context.CinemaConcessionCategories.Remove(category);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private static object ToResponse(ConcessionCategory category)
        {
            return new
            {
                id = category.CatId,
                name = category.CatName,
                description = ""
            };
        }

        private static bool TryNormalizeCategoryId(int id, out byte categoryId, out string? error)
        {
            if (id < byte.MinValue || id > byte.MaxValue)
            {
                categoryId = 0;
                error = "Category id is invalid";
                return false;
            }

            categoryId = (byte)id;
            error = null;
            return true;
        }
    }

    public class CategoryDto
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
    }
}
