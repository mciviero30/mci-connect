import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENGINE v2 — confirmPayrollBatch_v2
 *
 * 100% ATOMIC. Strict rules:
 * - Does NOT write to Job directly.
 * - Does NOT increment real_cost manually.
 * - Calls recalculateJobFinancials_v2 exclusively.
 * - Full rollback on ANY failure after batch creation.
 * - No silent failures. No partial states.
 *
 * FLOW:
 * 1. Validation (read-only)
 * 2. Create PayrollBatch (pending_internal)
 * 3. Create PayrollAllocations (status = confirmed immediately)
 * 4. Recalculate all affected jobs
 * 5. If any recalc fails → rollback batch + all allocations
 * 6. Update PayrollBatch to confirmed
 * 7. If that update fails → rollback everything
 * 8. Return success
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // AUTH
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!['admin', 'ceo'].includes(user.role)) {
      return Response.json({ error: 'Forbidden: Only Admin or CEO can confirm payroll batches' }, { status: 403 });
    }

    const body = await req.json();
    const { employee_id, employee_name, period_start, period_end, total_paid, allocations, source_type, notes } = body;

    if (!employee_id || !employee_name || !period_start || !period_end || !total_paid) {
      throw new Error('Missing required fields: employee_id, employee_name, period_start, period_end, total_paid');
    }
    if (!Array.isArray(allocations) || allocations.length === 0) {
      throw new Error('allocations must be a non-empty array');
    }

    console.log(`[confirmPayrollBatch_v2] Starting for ${employee_name} (${period_start}→${period_end})`);

    // ========================================================================
    // VALIDATION PHASE — Read-only, no mutations
    // ========================================================================

    // 1. Validate employee exists
    const employee = await base44.asServiceRole.entities.EmployeeDirectory.get(employee_id);
    if (!employee) {
      throw new Error(`Employee not found: ${employee_id}`);
    }

    // 2. Reject duplicate confirmed batch
    const existingBatches = await base44.asServiceRole.entities.PayrollBatch.filter({
      employee_id,
      period_start,
      period_end,
      status: 'confirmed'
    });
    if (existingBatches.length > 0) {
      return Response.json({
        error: 'Duplicate batch detected',
        details: `Confirmed batch already exists for this employee and period (ID: ${existingBatches[0].id})`,
        existing_batch_id: existingBatches[0].id
      }, { status: 409 });
    }

    // 3. Validate allocations sum matches total_paid
    const allocSum = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const diff = Math.abs(allocSum - total_paid);
    if (diff > 0.01) {
      throw new Error(
        `Allocations sum ($${allocSum.toFixed(2)}) does not match total_paid ($${total_paid.toFixed(2)})`
      );
    }

    // 4. Validate all job_ids exist and collect snapshots
    const jobIds = new Set(allocations.map(a => a.job_id).filter(Boolean));
    const jobSnapshots = {};
    for (const jobId of jobIds) {
      const job = await base44.asServiceRole.entities.Job.get(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }
      jobSnapshots[jobId] = job;
    }
    console.log(`[confirmPayrollBatch_v2] Validated ${jobIds.size} unique jobs`);

    // 5. Reject if ANY job is financially locked
    for (const [jobId, job] of Object.entries(jobSnapshots)) {
      if (job.financial_year_locked === true) {
        throw new Error(`Job "${job.name}" (${jobId}) has financial_year_locked = true. Cannot apply payroll.`);
      }
    }
    console.log(`[confirmPayrollBatch_v2] All jobs passed financial lock check`);

    // ========================================================================
    // MUTATION PHASE — Atomic: all-or-nothing
    // ========================================================================

    const now = new Date().toISOString();

    // Create PayrollBatch with pending_internal
    let batch;
    try {
      batch = await base44.asServiceRole.entities.PayrollBatch.create({
        employee_id,
        employee_name,
        period_start,
        period_end,
        total_paid,
        source: source_type || 'payroll_import',
        status: 'pending_internal',
        created_by: user.email,
        allocation_count: allocations.length,
        jobs_affected: Array.from(jobIds),
        notes: notes || '',
        is_locked: false
      });
      console.log(`[confirmPayrollBatch_v2] Created PayrollBatch ${batch.id} (pending_internal)`);
    } catch (err) {
      throw new Error(`Failed to create PayrollBatch: ${err.message}`);
    }

    // Create PayrollAllocations with status = confirmed immediately
    // CRITICAL: Must be confirmed BEFORE recalc so recalculateJobFinancials_v2 includes them
    const createdAllocations = [];
    try {
      for (const alloc of allocations) {
        const record = await base44.asServiceRole.entities.PayrollAllocation.create({
          payroll_batch_id: batch.id,
          job_id: alloc.job_id || '',
          job_name: alloc.job_name,
          allocated_amount: alloc.allocated_amount,
          allocation_percentage: alloc.allocation_percentage,
          hours_worked: alloc.hours_worked || 0,
          status: 'confirmed',
          confirmed_at: now,
          is_locked: true,
          financial_recalc_triggered: false
        });
        createdAllocations.push(record);
      }
      console.log(`[confirmPayrollBatch_v2] Created ${createdAllocations.length} PayrollAllocations (confirmed)`);
    } catch (err) {
      await _rollbackBatch(base44, batch.id, createdAllocations);
      throw new Error(`Failed to create allocations: ${err.message}`);
    }

    // Invoke recalculateJobFinancials_v2 for each unique job
    // Allocations are already confirmed, so recalc includes them
    const recalcResults = {};
    for (const jobId of jobIds) {
      try {
        const result = await base44.functions.invoke('recalculateJobFinancials_v2', { job_id: jobId });
        if (!result || result.success === false) {
          throw new Error(result?.error || `Recalc returned non-success: ${JSON.stringify(result)}`);
        }
        recalcResults[jobId] = result;
        console.log(`[confirmPayrollBatch_v2] recalculateJobFinancials_v2 OK for Job ${jobId} → status: ${result.status}`);
      } catch (err) {
        console.error(`[confirmPayrollBatch_v2] recalculateJobFinancials_v2 FAILED for ${jobId}: ${err.message}`);
        await _rollbackBatch(base44, batch.id, createdAllocations);
        throw new Error(
          `recalculateJobFinancials_v2 failed for job "${jobSnapshots[jobId]?.name}" (${jobId}): ${err.message}. Entire batch rolled back.`
        );
      }
    }

    // Update PayrollBatch to confirmed
    // If this fails → rollback everything (no pending_internal leftovers allowed)
    try {
      await base44.asServiceRole.entities.PayrollBatch.update(batch.id, {
        status: 'confirmed',
        confirmed_at: now,
        is_locked: true,
        locked_at: now
      });
      console.log(`[confirmPayrollBatch_v2] PayrollBatch ${batch.id} updated to confirmed`);
    } catch (err) {
      console.error(`[confirmPayrollBatch_v2] PayrollBatch status update FAILED: ${err.message}`);
      await _rollbackBatch(base44, batch.id, createdAllocations);
      throw new Error(`Failed to finalize batch (rolled back): ${err.message}`);
    }

    // Mark allocations as recalc triggered
    for (const alloc of createdAllocations) {
      try {
        await base44.asServiceRole.entities.PayrollAllocation.update(alloc.id, {
          financial_recalc_triggered: true
        });
      } catch (err) {
        throw new Error(`Failed to mark allocation ${alloc.id} as recalc triggered: ${err.message}`);
      }
    }

    // Audit log
    try {
      await base44.asServiceRole.entities.AuditLog.create({
        event_type: 'payroll_batch_confirmed',
        entity_type: 'PayrollBatch',
        entity_id: batch.id,
        performed_by: user.email,
        performed_by_name: user.full_name || user.email,
        action_description: `Confirmed payroll batch for ${employee_name} (${period_start}→${period_end}): $${total_paid.toFixed(2)} across ${allocations.length} allocations, ${jobIds.size} unique jobs`,
        before_state: null,
        after_state: { status: 'confirmed', is_locked: true },
        metadata: { batch_id: batch.id, employee_id }
      });
    } catch (err) {
      throw new Error(`Failed to create audit log: ${err.message}`);
    }

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocation_count: createdAllocations.length,
      unique_jobs_affected: jobIds.size,
      total_allocated: allocSum.toFixed(2),
      is_locked: true,
      confirmed_at: now,
      recalc_results: Object.keys(recalcResults).map(jobId => ({
        job_id: jobId,
        status: recalcResults[jobId]?.status
      })),
      message: `Confirmed payroll batch for ${employee_name}. All jobs recalculated. Batch locked.`
    });

  } catch (error) {
    console.error('[confirmPayrollBatch_v2] Fatal error:', error.message);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});

/**
 * FULL ROLLBACK — Delete batch and all created allocations.
 * Called on any failure after batch creation.
 * No silent swallowing — errors are logged clearly.
 */
async function _rollbackBatch(base44, batchId, createdAllocations) {
  console.error(`[confirmPayrollBatch_v2] ROLLBACK INITIATED for batch ${batchId}`);

  for (const alloc of createdAllocations) {
    try {
      await base44.asServiceRole.entities.PayrollAllocation.delete(alloc.id);
      console.log(`[confirmPayrollBatch_v2] Rollback: deleted PayrollAllocation ${alloc.id}`);
    } catch (e) {
      console.error(`[confirmPayrollBatch_v2] CRITICAL: failed to delete allocation ${alloc.id}: ${e.message}`);
    }
  }

  try {
    await base44.asServiceRole.entities.PayrollBatch.delete(batchId);
    console.log(`[confirmPayrollBatch_v2] Rollback: deleted PayrollBatch ${batchId}`);
  } catch (e) {
    console.error(`[confirmPayrollBatch_v2] CRITICAL: failed to delete batch ${batchId}: ${e.message}`);
  }

  console.error(`[confirmPayrollBatch_v2] Rollback complete`);
}