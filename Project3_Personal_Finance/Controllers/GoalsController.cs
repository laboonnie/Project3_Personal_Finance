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
    public class GoalsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;

        public GoalsController(PersonalFinanceDbContext context)
        {
            _context = context;
        }

        // GET: api/Goals
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Goal>>> GetGoals()
        {
            return await _context.Goals.ToListAsync();
        }

        // GET: api/Goals/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Goal>> GetGoal(int id)
        {
            var goal = await _context.Goals.FindAsync(id);

            if (goal == null)
            {
                return NotFound();
            }

            return goal;
        }

        // PUT: api/Goals/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutGoal(int id, Goal goal)
        {
            if (id != goal.Id)
            {
                return BadRequest();
            }

            _context.Entry(goal).State = EntityState.Modified;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateConcurrencyException)
            {
                if (!GoalExists(id))
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

        // POST: api/Goals
        [HttpPost]
        public async Task<ActionResult<Goal>> PostGoal(Goal goal)
        {
            goal.User = null;
            goal.CurrentAmount = 0;
            goal.Status = "in-progress";

            _context.Goals.Add(goal);
            await _context.SaveChangesAsync();

            return CreatedAtAction("GetGoal", new { id = goal.Id }, goal);
        }

        // DELETE: api/Goals/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteGoal(int id)
        {
            var goal = await _context.Goals.FindAsync(id);
            if (goal == null)
            {
                return NotFound();
            }

            _context.Goals.Remove(goal);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        [HttpPost("{id}/deposit")]
        public async Task<IActionResult> Deposit(int id, [FromBody] decimal amount)
        {
            var goal = await _context.Goals.FindAsync(id);
            if (goal == null) return NotFound();

            if (amount <= 0)
                return BadRequest(new { message = "Số tiền phải lớn hơn 0!" });

            goal.CurrentAmount = (goal.CurrentAmount ?? 0) + amount;

            if (goal.CurrentAmount >= goal.TargetAmount)
                goal.Status = "completed";

            await _context.SaveChangesAsync();

            return Ok(new
            {
                goalId = goal.Id,
                currentAmount = goal.CurrentAmount,
                targetAmount = goal.TargetAmount,
                progress = Math.Round((goal.CurrentAmount ?? 0) / (goal.TargetAmount ?? 1) * 100, 2),
                status = goal.Status
            });
        }

        private bool GoalExists(int id)
        {
            return _context.Goals.Any(e => e.Id == id);
        }
    }
}