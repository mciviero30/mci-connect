import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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
    // STEP 1+2 — GLOBAL VALIDATION: fetch all jobs up front,
    // build snapshot map, validate ALL before any mutation begins.
    // originalCosts[job_id] = job.real_cost (snapshot, never derived)
    // ============================================================
    const originalCosts = {}; // snapshot: job_id → original real_cost
    const jobUpdatesToApply = []; // { job_id, newRealCost, allocation, skip }

    for (const alloc of allocations) {
      if (!alloc.job_id) {
        jobUpdatesToApply.push({ job_id: null, newRealCost: 0, allocation: alloc, skip: true });
        continue;
      }

      const job = await base44.asServiceRole.entities.Job.get(alloc.job_id);
      if (!job) {
        console.warn(`[reversePayrollBatch] Job ${alloc.job_id} not found — skipping real_cost decrement`);
        jobUpdatesToApply.push({ job_id: alloc.job_id, newRealCost: 0, allocation: alloc, skip: true });
        continue;
      }

      // Global check: no year-locked jobs
      if (job.financial_year_locked === true) {
        return Response.json({
          error: `Job "${job.name}" (${job.id}) has financial_year_locked = true. Cannot reverse payroll for a locked fiscal year.`
        }, { status: 409 });
      }

      // Snapshot original value (used verbatim for rollback — no arithmetic)
      originalCosts[job.id] = job.real_cost ?? 0;

      // STEP 3 — 2-decimal precision enforced here
      const newRealCost = Number(Math.max(0, originalCosts[job.id] - alloc.allocated_amount).toFixed(2));
      jobUpdatesToApply.push({ job_id: alloc.job_id, newRealCost, allocation: alloc, skip: false });
    }

    console.log(`[reversePayrollBatch] Global validation passed. Snapshot captured for ${Object.keys(originalCosts).length} jobs.`);

    // ============================================================
    // ATOMIC real_cost decrements — snapshot rollback on any failure
    // recalculateJobFinancials is CRITICAL — hard fail + rollback
    // ============================================================
    let jobsAppliedCount = 0;

    for (const update of jobUpdatesToApply) {
      if (update.skip) continue;

      // Decrement real_cost — newRealCost already rounded to 2 decimals during validation
      try {
        await base44.asServiceRole.entities.Job.update(update.job_id, {
          real_cost: update.newRealCost
        });
        jobsAppliedCount++;
        console.log(`[reversePayrollBatch] Job ${update.job_id}: real_cost ${originalCosts[update.job_id]} → ${update.newRealCost}`);
      } catch (err) {
        console.error(`[reversePayrollBatch] Job real_cost decrement FAILED for ${update.job_id}:`, err.message);
        await _rollbackFromSnapshot(base44, originalCosts);
        return Response.json({
          success: false,
          error: `Job real_cost decrement failed for "${update.job_id}": ${err.message}. Entire reversal rolled back.`
        }, { status: 500 });
      }

      // recalculateJobFinancials is CRITICAL — hard fail + rollback
      try {
        await base44.functions.invoke('recalculateJobFinancials', { job_id: update.job_id });
        console.log(`[reversePayrollBatch] recalculateJobFinancials succeeded for Job ${update.job_id}`);
      } catch (err) {
        console.error(`[reversePayrollBatch] recalculateJobFinancials FAILED for ${update.job_id}:`, err.message);
        await _rollbackFromSnapshot(base44, originalCosts);
        return Response.json({
          success: false,
          error: `recalculateJobFinancials failed for job "${update.job_id}": ${err.message}. Entire reversal rolled back.`
        }, { status: 500 });
      }

      // Mark allocation as reversed (non-critical)
      await base44.asServiceRole.entities.PayrollAllocation.update(update.allocation.id, {
        status: 'reversed',
        financial_recalc_triggered: true
      }).catch(err => console.error('[reversePayrollBatch] Allocation status update failed:', err.message));
    }

    console.log(`[reversePayrollBatch] All ${jobsAppliedCount} decrements + recalculations succeeded`);

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
        job_reversal_count: jobsAppliedCount
      }
    }).catch(err => console.warn('[reversePayrollBatch] Audit log failed (non-critical):', err.message));

    return Response.json({
      success: true,
      batch_id,
      allocation_count: allocations.length,
      job_reversals_applied: jobsAppliedCount,
      message: `Reversed payroll batch for ${batch.employee_name}. Batch is now unlocked.`
    });

  } catch (error) {
    console.error('[reversePayrollBatch] Fatal error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to reverse payroll batch' }, { status: 500 });
  }
});

/**
 * STEP 1 — Snapshot-based rollback.
 * originalCosts is the pre-mutation snapshot: { job_id: original_real_cost }
 * We restore directly from the snapshot — no arithmetic reversal.
 */
async function _rollbackFromSnapshot(base44, originalCosts) {
  console.error(`[reversePayrollBatch] ROLLBACK: restoring ${Object.keys(originalCosts).length} jobs from snapshot`);
  for (const [jobId, snapshotCost] of Object.entries(originalCosts)) {
    try {
      await base44.asServiceRole.entities.Job.update(jobId, { real_cost: snapshotCost });
      console.log(`[reversePayrollBatch] Snapshot restored Job ${jobId}: real_cost = ${snapshotCost}`);
    } catch (rbErr) {
      console.error(`[reversePayrollBatch] CRITICAL: snapshot restore failed for Job ${jobId}:`, rbErr.message);
    }
  }
}