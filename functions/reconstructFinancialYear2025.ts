import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * FINANCIAL RECONSTRUCTION — PHASE 2 (Controlled 2025 Rebuild)
 *
 * PURPOSE:
 * Rebuild Job.real_cost for all Jobs closed in 2025 using confirmed
 * PayrollAllocation, approved Expense, and approved DrivingLog records.
 * Then calls recalculateJobFinancials to derive profit_real and commission_amount.
 *
 * INVARIANTS:
 * - Does NOT modify PayrollBatch
 * - Does NOT modify PayrollAllocation
 * - Does NOT modify Invoice
 * - Does NOT modify CommissionResult
 * - Does NOT delete any legacy fields
 * - Skips jobs where financial_year_locked = true
 * - Does NOT set financial_year_locked (Phase 3 responsibility)
 * - Continues on per-job failure — never aborts the full run
 *
 * AGGREGATION SOURCES for real_cost:
 *   1. PayrollAllocation (job_id = job.id, status = "confirmed")
 *   2. Expense           (job_id = job.id, status = "approved")
 *   3. DrivingLog        (job_id = job.id, status = "approved") — uses miles × rate_per_mile
 *
 * NOTE: Job.total_cost (legacy, undeclared field written by confirmPayrollBatch)
 * is intentionally NOT used as an input here.
 *
 * AUTH: Admin or CEO only
 */

const YEAR_START = '2025-01-01';
const YEAR_END   = '2025-12-31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin' && user.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin or CEO access required' }, { status: 403 });
    }

    console.log(`[reconstructFinancialYear2025] Starting 2025 reconstruction by ${user.email}`);

    // ============================================================
    // STEP 1: Fetch all candidate Jobs
    // Criteria: status = "completed" AND completed_date in 2025 AND NOT locked
    // ============================================================
    const allJobs = await base44.asServiceRole.entities.Job.filter({
      status: 'completed'
    });

    // Filter to 2025 completion window and non-locked in-process
    const candidateJobs = allJobs.filter(job => {
      if (job.financial_year_locked === true) return false;
      const d = job.completed_date || job.field_accepted_at;
      if (!d) return false;
      const dateStr = d.substring(0, 10); // normalize to YYYY-MM-DD
      return dateStr >= YEAR_START && dateStr <= YEAR_END;
    });

    console.log(`[reconstructFinancialYear2025] Found ${candidateJobs.length} candidate jobs for 2025`);

    // ============================================================
    // STEP 2: Pre-fetch all source records once to minimize DB calls
    // ============================================================
    const [allAllocations, allExpenses, allDrivingLogs] = await Promise.all([
      base44.asServiceRole.entities.PayrollAllocation.filter({ status: 'confirmed' }),
      base44.asServiceRole.entities.Expense.filter({ status: 'approved' }),
      base44.asServiceRole.entities.DrivingLog.filter({ status: 'approved' })
    ]);

    console.log(`[reconstructFinancialYear2025] Loaded: ${allAllocations.length} allocations, ${allExpenses.length} expenses, ${allDrivingLogs.length} driving logs`);

    // ============================================================
    // STEP 3: Process each job sequentially
    // ============================================================
    let jobs_processed = 0;
    let jobs_updated = 0;
    let jobs_skipped_locked = 0;
    let jobs_failed = 0;
    let total_real_cost_aggregated = 0;
    const errors = [];

    for (const job of candidateJobs) {
      jobs_processed++;

      try {
        // --------------------------------------------------------
        // 3a. Aggregate PayrollAllocation amounts for this job
        // Source: PayrollAllocation.status = "confirmed" AND job_id = job.id
        // Field used: allocated_amount
        // --------------------------------------------------------
        const jobAllocations = allAllocations.filter(a => a.job_id === job.id);
        const payrollCost = jobAllocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);

        // --------------------------------------------------------
        // 3b. Aggregate approved Expenses for this job
        // Source: Expense.status = "approved" AND job_id = job.id
        // Field used: amount
        // --------------------------------------------------------
        const jobExpenses = allExpenses.filter(e => e.job_id === job.id);
        const expenseCost = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

        // --------------------------------------------------------
        // 3c. Aggregate approved DrivingLog records for this job
        // Source: DrivingLog.status = "approved" AND job_id = job.id
        // Field used: miles × rate_per_mile (fallback 0.70 if not set)
        // Note: DrivingLog.total_amount is also stored but we recompute from
        //       source fields for determinism
        // --------------------------------------------------------
        const jobDrivingLogs = allDrivingLogs.filter(d => d.job_id === job.id);
        const drivingCost = jobDrivingLogs.reduce((sum, d) => {
          const miles = d.miles || 0;
          const rate  = d.rate_per_mile || 0.70;
          return sum + (miles * rate);
        }, 0);

        // --------------------------------------------------------
        // 3d. Compute new_real_cost — do NOT use legacy Job.total_cost
        // --------------------------------------------------------
        const new_real_cost = Number((payrollCost + expenseCost + drivingCost).toFixed(2));
        total_real_cost_aggregated += new_real_cost;

        console.log(`[reconstructFinancialYear2025] Job "${job.name}" (${job.id}): payroll=$${payrollCost.toFixed(2)}, expenses=$${expenseCost.toFixed(2)}, driving=$${drivingCost.toFixed(2)}, real_cost=$${new_real_cost}`);

        // --------------------------------------------------------
        // 3e. Update Job.real_cost
        // --------------------------------------------------------
        await base44.asServiceRole.entities.Job.update(job.id, {
          real_cost: new_real_cost
        });

        // --------------------------------------------------------
        // 3f. Call recalculateJobFinancials to derive profit_real
        //     and commission_amount from updated real_cost
        // --------------------------------------------------------
        try {
          await base44.functions.invoke('recalculateJobFinancials', { job_id: job.id });
          console.log(`[reconstructFinancialYear2025] recalculateJobFinancials succeeded for Job ${job.id}`);
        } catch (recalcErr) {
          // Non-critical — real_cost was written; derived fields can be recalculated later
          console.warn(`[reconstructFinancialYear2025] recalculateJobFinancials failed for Job ${job.id} (non-critical):`, recalcErr.message);
        }

        // --------------------------------------------------------
        // 3g. Write AuditLog for this job
        // --------------------------------------------------------
        try {
          await base44.asServiceRole.entities.AuditLog.create({
            event_type: 'financial_reconstruction_2025',
            entity_type: 'Job',
            entity_id: job.id,
            performed_by: user.email,
            performed_by_name: user.full_name || user.email,
            action_description: `2025 financial reconstruction: real_cost set to $${new_real_cost} for job "${job.name}"`,
            before_state: {
              real_cost: job.real_cost,
              profit_real: job.profit_real,
              commission_amount: job.commission_amount
            },
            after_state: {
              real_cost: new_real_cost
            },
            metadata: {
              job_id: job.id,
              payroll_allocations_count: jobAllocations.length,
              expenses_count: jobExpenses.length,
              driving_logs_count: jobDrivingLogs.length,
              payroll_cost: payrollCost,
              expense_cost: expenseCost,
              driving_cost: drivingCost,
              completed_date: job.completed_date
            }
          });
        } catch (auditErr) {
          // Non-critical
          console.warn(`[reconstructFinancialYear2025] AuditLog failed for Job ${job.id}:`, auditErr.message);
        }

        jobs_updated++;

      } catch (jobErr) {
        // Per-job failure: log and continue
        jobs_failed++;
        errors.push({ job_id: job.id, job_name: job.name, error: jobErr.message });
        console.error(`[reconstructFinancialYear2025] FAILED for Job ${job.id} "${job.name}":`, jobErr.message);
      }
    }

    total_real_cost_aggregated = Number(total_real_cost_aggregated.toFixed(2));

    console.log(`[reconstructFinancialYear2025] Complete. processed=${jobs_processed}, updated=${jobs_updated}, failed=${jobs_failed}`);

    return Response.json({
      success: true,
      year: '2025',
      financial_year_locked: false,
      summary: {
        jobs_processed,
        jobs_updated,
        jobs_failed,
        jobs_skipped_locked,
        total_real_cost_aggregated
      },
      errors: errors.length > 0 ? errors : undefined,
      message: `2025 financial reconstruction complete. ${jobs_updated}/${jobs_processed} jobs updated.`
    });

  } catch (error) {
    console.error('[reconstructFinancialYear2025] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});