import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENGINE STABILIZATION — reversePayrollBatch
 *
 * SSOT: Job.real_cost is the single source of truth for job cost.
 * Job.total_cost is NOT read or written here.
 * recalculateInvoiceFinancials is NOT called here.
 *
 * Rules:
 * - financial_year_locked = true on any affected Job → hard reject entire reversal
 * - Each job: real_cost -= allocated_amount (floor 0)
 * - recalculateJobFinancials is CRITICAL — failure aborts and re-applies the decrement
 * - Atomic: if ANY job fails, ALL prior decrements are re-incremented back
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAuthorized = ['admin', 'ceo'].includes(user.role);
    if (!isAuthorized) {
      return Response.json({ error: 'Only Admin or CEO can reverse payroll batches' }, { status: 403 });
    }

    const body = await req.json();
    const { batch_id, reason } = body;

    if (!batch_id || !reason) {
      return Response.json({ error: 'batch_id and reason are required' }, { status: 400 });
    }

    const batch = await base44.asServiceRole.entities.PayrollBatch.get(batch_id);
    if (!batch) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'reversed') {
      return Response.json({ error: 'Batch is already reversed' }, { status: 400 });
    }

    if (batch.status !== 'confirmed') {
      return Response.json({ error: `Cannot reverse a batch with status "${batch.status}"` }, { status: 400 });
    }

    // Fetch confirmed allocations for this batch
    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter({
      payroll_batch_id: batch_id,
      status: 'confirmed'
    });

    if (allocations.length === 0) {
      return Response.json({ error: 'No confirmed allocations found for this batch' }, { status: 400 });
    }

    console.log(`[reversePayrollBatch] Reversing batch ${batch_id} (${allocations.length} allocations). Reason: ${reason}`);

    // ============================================================
    // STEP 3 — Pre-validate all jobs before touching any data
    // Abort entire reversal if any job is year-locked
    // ============================================================
    const jobUpdatesToApply = []; // { job_id, oldRealCost, newRealCost, allocation }

    for (const alloc of allocations) {
      if (!alloc.job_id) {
        jobUpdatesToApply.push({ job_id: null, oldRealCost: 0, newRealCost: 0, allocation: alloc, skip: true });
        continue;
      }

      const job = await base44.asServiceRole.entities.Job.get(alloc.job_id);
      if (!job) {
        console.warn(`[reversePayrollBatch] Job ${alloc.job_id} not found — skipping real_cost decrement`);
        jobUpdatesToApply.push({ job_id: alloc.job_id, oldRealCost: 0, newRealCost: 0, allocation: alloc, skip: true });
        continue;
      }

      // HARD GATE: reject entire reversal if any job is year-locked
      if (job.financial_year_locked === true) {
        return Response.json({
          error: `Job "${job.name}" (${job.id}) has financial_year_locked = true. Cannot reverse payroll for a locked fiscal year.`
        }, { status: 409 });
      }

      const oldRealCost = job.real_cost || 0;
      const newRealCost = Number(Math.max(0, oldRealCost - alloc.allocated_amount).toFixed(2));
      jobUpdatesToApply.push({ job_id: alloc.job_id, oldRealCost, newRealCost, allocation: alloc, skip: false });
    }

    console.log(`[reversePayrollBatch] Pre-validated ${jobUpdatesToApply.filter(u => !u.skip).length} job real_cost decrements`);

    // ============================================================
    // STEP 3 + STEP 5 + STEP 6 — ATOMIC real_cost decrements
    // recalculateJobFinancials is CRITICAL — failure = rollback + hard fail
    // ============================================================
    const appliedDecrements = []; // track for rollback

    for (const update of jobUpdatesToApply) {
      if (update.skip) continue;

      // Decrement real_cost
      try {
        await base44.asServiceRole.entities.Job.update(update.job_id, {
          real_cost: update.newRealCost
        });
        appliedDecrements.push(update);
        console.log(`[reversePayrollBatch] Job ${update.job_id}: real_cost ${update.oldRealCost} → ${update.newRealCost}`);
      } catch (err) {
        console.error(`[reversePayrollBatch] Job real_cost decrement FAILED for ${update.job_id}:`, err.message);
        await _rollbackDecrements(base44, appliedDecrements);
        return Response.json({
          success: false,
          error: `Job real_cost decrement failed for "${update.job_id}": ${err.message}. Entire reversal rolled back.`
        }, { status: 500 });
      }

      // STEP 5 — recalculateJobFinancials is CRITICAL
      try {
        await base44.functions.invoke('recalculateJobFinancials', { job_id: update.job_id });
        console.log(`[reversePayrollBatch] recalculateJobFinancials succeeded for Job ${update.job_id}`);
      } catch (err) {
        console.error(`[reversePayrollBatch] recalculateJobFinancials FAILED for ${update.job_id}:`, err.message);
        await _rollbackDecrements(base44, appliedDecrements);
        return Response.json({
          success: false,
          error: `recalculateJobFinancials failed for job "${update.job_id}": ${err.message}. Entire reversal rolled back.`
        }, { status: 500 });
      }

      // Mark allocation as reversed
      await base44.asServiceRole.entities.PayrollAllocation.update(update.allocation.id, {
        status: 'reversed',
        financial_recalc_triggered: true
      }).catch(err => console.error('[reversePayrollBatch] Allocation status update failed:', err.message));
    }

    console.log(`[reversePayrollBatch] All ${appliedDecrements.length} decrements + recalculations succeeded`);

    // ============================================================
    // Update batch status
    // ============================================================
    await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversed_reason: reason,
      is_locked: false
    });

    console.log(`[reversePayrollBatch] Marked PayrollBatch ${batch_id} as reversed`);

    // ============================================================
    // Audit log
    // ============================================================
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'payroll_batch_reversed',
      entity_type: 'PayrollBatch',
      entity_id: batch_id,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      action_description: `Reversed payroll batch for ${batch.employee_name} (${batch.period_start} to ${batch.period_end}): $${batch.total_paid.toFixed(2)} across ${allocations.length} jobs`,
      before_state: { status: 'confirmed', is_locked: true },
      after_state: { status: 'reversed', is_locked: false },
      metadata: {
        batch_id,
        employee_id: batch.employee_id,
        reversal_reason: reason,
        job_reversal_count: appliedDecrements.length
      }
    }).catch(err => console.warn('[reversePayrollBatch] Audit log failed (non-critical):', err.message));

    return Response.json({
      success: true,
      batch_id,
      allocation_count: allocations.length,
      job_reversals_applied: appliedDecrements.length,
      message: `Reversed payroll batch for ${batch.employee_name}. Batch is now unlocked.`
    });

  } catch (error) {
    console.error('[reversePayrollBatch] Fatal error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to reverse payroll batch' }, { status: 500 });
  }
});

/**
 * Rollback helper — re-increments real_cost for all applied decrements.
 * Called when any subsequent step fails mid-loop.
 */
async function _rollbackDecrements(base44, appliedDecrements) {
  console.error(`[reversePayrollBatch] ROLLBACK: re-incrementing ${appliedDecrements.length} real_cost values`);
  for (const applied of appliedDecrements) {
    try {
      await base44.asServiceRole.entities.Job.update(applied.job_id, {
        real_cost: applied.oldRealCost
      });
      console.log(`[reversePayrollBatch] Rollback: Job ${applied.job_id} real_cost restored to ${applied.oldRealCost}`);
    } catch (rbErr) {
      console.error(`[reversePayrollBatch] CRITICAL: rollback re-increment failed for Job ${applied.job_id}:`, rbErr.message);
    }
  }
}