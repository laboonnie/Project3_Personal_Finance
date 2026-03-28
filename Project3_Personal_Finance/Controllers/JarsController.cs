using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class JarsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public JarsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET ALL JARS
        [HttpGet]
        public async Task<IActionResult> GetJars()
        {
            var jars = await _context.FinancialJars
                .Select(j => new
                {
                    j.Id,
                    j.JarName,
                    j.JarCode,
                    j.DefaultPercentage
                }).ToListAsync();

            return Ok(jars);
        }

        // GET BY ID
        [HttpGet("{id}")]
        public async Task<IActionResult> GetJar(int id)
        {
            var jar = await _context.FinancialJars.FindAsync(id);

            if (jar == null)
                return NotFound();

            return Ok(jar);
        }
    }
}
