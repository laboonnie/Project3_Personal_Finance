using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DebtsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public DebtsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET: api/Debts
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Debt>>> GetDebts()
        {
            return await _context.Debts.ToListAsync();
        }

        // GET: api/Debts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Debt>> GetDebt(int id)
        {
            var debt = await _context.Debts.FindAsync(id);

            if (debt == null)
            {
                return NotFound();
            }

            return debt;
        }

        // PUT: api/Debts/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDebt(int id, Debt debt)
        {
            if (id != debt.Id)
            {
                return BadRequest();
            }

            _context.Entry(debt).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DebtExists(id))
                {
                    return NotFound();
                }
                else
                {
                    throw;
                }
            }

            return NoContent();
        }

        // POST: api/Debts
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<Debt>> PostDebt(Debt debt)
        {
            debt.User = null;
            debt.RemainingAmount ??= debt.TotalAmount;
            _context.Debts.Add(debt);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetDebt", new { id = debt.Id }, debt);
        }

        // DELETE: api/Debts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDebt(int id)
        {
            var debt = await _context.Debts.FindAsync(id);
            if (debt == null)
            {
                return NotFound();
            }

            _context.Debts.Remove(debt);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool DebtExists(int id)
        {
            return _context.Debts.Any(e => e.Id == id);
        }
    }
}
