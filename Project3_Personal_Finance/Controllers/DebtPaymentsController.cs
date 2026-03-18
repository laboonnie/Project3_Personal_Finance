using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class DebtPaymentsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public DebtPaymentsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET: api/DebtPayments
        [HttpGet]
        public async Task<ActionResult<IEnumerable<DebtPayment>>> GetDebtPayments()
        {
            return await _context.DebtPayments.ToListAsync();
        }

        // GET: api/DebtPayments/5
        [HttpGet("{id}")]
        public async Task<ActionResult<DebtPayment>> GetDebtPayment(int id)
        {
            var debtPayment = await _context.DebtPayments.FindAsync(id);

            if (debtPayment == null)
            {
                return NotFound();
            }

            return debtPayment;
        }

        // PUT: api/DebtPayments/5
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDebtPayment(int id, DebtPayment debtPayment)
        {
            if (id != debtPayment.Id)
            {
                return BadRequest();
            }

            _context.Entry(debtPayment).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!DebtPaymentExists(id))
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

        // POST: api/DebtPayments
        // To protect from overposting attacks, see https://go.microsoft.com/fwlink/?linkid=2123754
        [HttpPost]
        public async Task<ActionResult<DebtPayment>> PostDebtPayment(DebtPayment debtPayment)
        {
            _context.DebtPayments.Add(debtPayment);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetDebtPayment", new { id = debtPayment.Id }, debtPayment);
        }

        // DELETE: api/DebtPayments/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDebtPayment(int id)
        {
            var debtPayment = await _context.DebtPayments.FindAsync(id);
            if (debtPayment == null)
            {
                return NotFound();
            }

            _context.DebtPayments.Remove(debtPayment);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        private bool DebtPaymentExists(int id)
        {
            return _context.DebtPayments.Any(e => e.Id == id);
        }
    }
}
