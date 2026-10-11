using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Project3_Personal_Finance.DTOs;
using Project3_Personal_Finance.Models;

namespace Project3_Personal_Finance.Controllers
{
    [Authorize]
    [Route("api/[controller]")]
    [ApiController]
    public class DebtsController : ControllerBase
    {
        private readonly PersonalFinanceDbContext _context;
        private readonly IWebHostEnvironment _env;
        private readonly ILogger<DebtsController> _logger;

        public DebtsController(
            PersonalFinanceDbContext context, IWebHostEnvironment env, ILogger<DebtsController> logger)
        {
            _context = context;
            _env = env;
            _logger = logger;
        }

        private int CurrentUserId =>
            int.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "0");

        private IActionResult ServerError(Exception ex, string friendly)
        {
            _logger.LogError(ex, "{Message}", friendly);
            var message = _env.IsDevelopment()
                ? $"{friendly} ({ex.InnerException?.Message ?? ex.Message})"
                : friendly;
            return StatusCode(500, new { message });
        }

        // GET: api/Debts
        [HttpGet]
        public async Task<IActionResult> GetDebts()
        {
            var userId = CurrentUserId;

            var debts = await _context.Debts.AsNoTracking()
                .Where(d => d.UserId == userId)
                .OrderBy(d => d.DueDate)
                .ToListAsync();

            var ids = debts.Select(d => d.Id).ToList();
            var transfers = (await _context.Transactions.AsNoTracking()
                    .Where(t => t.UserId == userId && t.DebtId != null && ids.Contains(t.DebtId.Value))
                    .OrderByDescending(t => t.TransactionDate).ThenByDescending(t => t.Id)
                    .Select(t => new
                    {
                        t.Id,
                        t.Amount,
                        t.TransactionDate,
                        t.Note,
                        t.JarId,
                        JarName = t.Jar != null ? t.Jar.JarName : null,
                        t.DebtId
                    })
                    .ToListAsync())
                .ToLookup(t => t.DebtId);

            var jarNames = await _context.FinancialJars.AsNoTracking()
                .ToDictionaryAsync(j => j.Id, j => j.JarName);

            var result = debts.Select(d =>
            {
                var due = DueDateHelper.Evaluate(d.DueDate, (d.RemainingAmount ?? 0) <= 0);
                return new
                {
                    d.Id,
                    d.UserId,
                    d.DebtName,
                    d.TotalAmount,
                    d.RemainingAmount,
                    d.InterestRate,
                    d.DueDate,
                    d.JarId,
                    JarName = d.JarId != null && jarNames.TryGetValue(d.JarId.Value, out var jn) ? jn : null,
                    due.Status,
                    IsLocked = false,
                    due.DaysUntilDue,
                    due.Warning,
                    Transactions = transfers[d.Id]
                };
            });

            return Ok(result);
        }

        // GET: api/Debts/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Debt>> GetDebt(int id)
        {
            var userId = CurrentUserId;
            var debt = await _context.Debts.AsNoTracking()
                .FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
            if (debt == null) return NotFound();
            return debt;
        }

        // PUT: api/Debts/5
        [HttpPut("{id}")]
        public async Task<IActionResult> PutDebt(int id, Debt debt)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                if (id != debt.Id) return BadRequest();
                if ((debt.TotalAmount ?? 0) <= 0)
                    return BadRequest(new { message = "The total debt must be greater than zero." });

                var existing = await _context.Debts.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
                if (existing == null) return NotFound();

                var paid = (existing.TotalAmount ?? 0) - (existing.RemainingAmount ?? 0);
                if (debt.TotalAmount < paid)
                    return BadRequest(new { message = $"The total debt cannot be lower than the amount already paid ({paid:N0} VND)." });

                // Preserve previous payments when the total amount is edited.
                existing.DebtName = debt.DebtName;
                existing.TotalAmount = debt.TotalAmount;
                existing.RemainingAmount = debt.TotalAmount - paid;
                existing.InterestRate = debt.InterestRate;
                existing.DueDate = debt.DueDate;

                await _context.SaveChangesAsync();
                return NoContent();
            });
        }

        // POST: api/Debts
        [HttpPost]
        public async Task<ActionResult<Debt>> PostDebt(Debt debt)
        {
            if (string.IsNullOrWhiteSpace(debt.DebtName))
                return BadRequest(new { message = "A debt name is required." });
            if ((debt.TotalAmount ?? 0) <= 0)
                return BadRequest(new { message = "The total debt must be greater than zero." });

            debt.Id = 0;
            debt.User = null;
            debt.Jar = null;
            debt.UserId = CurrentUserId;
            debt.RemainingAmount = debt.TotalAmount;
            debt.JarId = null;

            _context.Debts.Add(debt);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetDebt), new { id = debt.Id }, debt);
        }

        // DELETE: api/Debts/5
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteDebt(int id)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                var debt = await _context.Debts.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
                if (debt == null) return NotFound();

                try
                {
                    _context.Debts.Remove(debt);
                    await _context.SaveChangesAsync();
                    return NoContent();
                }
                catch (DbUpdateException)
                {
                    return Conflict(new { message = "This debt has linked transactions and cannot be deleted." });
                }
            });
        }

        // POST: api/Debts/5/pay
        [HttpPost("{id}/pay")]
        public async Task<IActionResult> Pay(int id, [FromBody] FundTransferRequest request)
        {
            var userId = CurrentUserId;
            return await AutoPayHelper.WithPaymentLockAsync<IActionResult>(userId, async () =>
            {
                var debt = await _context.Debts.FirstOrDefaultAsync(d => d.Id == id && d.UserId == userId);
                if (debt == null) return NotFound();

                var remaining = debt.RemainingAmount ?? 0;
                if (remaining <= 0)
                    return BadRequest(new { message = "This debt has already been paid off." });

                if (request.Amount <= 0)
                    return BadRequest(new { message = "The payment amount must be greater than zero." });
                if (request.Amount > remaining)
                    return BadRequest(new { message = $"The payment exceeds the remaining debt ({remaining:N0} VND)." });

                // Validate the source jar and prepare the expense transaction.
                var plan = await JarFundingHelper.PrepareChargeAsync(
                    _context, userId, request.JarId, request.Amount,
                    $"Debt payment: {debt.DebtName}", tx => tx.DebtId = debt.Id, request.CategoryId);
                if (plan.Error != null)
                    return BadRequest(new { message = plan.Error });

                try
                {
                    // Persist the transaction and debt update in one database transaction.
                    _context.Transactions.Add(plan.Tx!);
                    debt.RemainingAmount = remaining - request.Amount;
                    debt.JarId = request.JarId;
                    await _context.SaveChangesAsync();

                    return Ok(new
                    {
                        debtId = debt.Id,
                        remainingAmount = debt.RemainingAmount,
                        paid = request.Amount,
                        transactionId = plan.Tx!.Id,
                        jarRemaining = plan.JarRemainingAfter
                    });
                }
                catch (Exception ex)
                {
                    return ServerError(ex, "An error occurred while making the debt payment.");
                }
            });
        }
    }
}