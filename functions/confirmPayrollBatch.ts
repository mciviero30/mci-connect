import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import crypto from 'node:crypto';

/**
 * PAYROLL ENGINE STABILIZATION — confirmPayrollBatch
 *
 * SSOT: Job.real_cost is the single source of truth for job cost.
 * Job.total_cost is NOT read or written here.
 * recalculateInvoiceFinancials is NOT called here.
 *
 * Rules:
 * - Deduplication: blocks if confirmed batch exists for same employee+period
 * - file_hash is always computed (from file_url OR canonical fields)
 * - atomic: if ANY job real_cost update fails → full rollback, hard failure
 * - recalculateJobFinancials failure is HARD failure (no silent swallow)
 * - financial_year_locked = true on any affected Job → hard reject
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isAuthorized = ['admin', 'ceo'].includes(user.role) ||
      (user.position && ['CEO', 'Accountant'].includes(user.position));
    if (!isAuthorized) {
      return Response.json({
        error: 'Only Admin, CEO, or Accountant can confirm payroll batches'
      }, { status: 403 });
    }

    const body = await req.json();
    const { employee_id, employee_name, period_start, period_end, total_paid, allocations, file_url, notes } = body;

    if (!employee_id || !employee_name || !period_start || !period_end || !total_paid || !allocations?.length) {
      return Response.json({
        error: 'Missing required fields: employee_id, employee_name, period_start, period_end, total_paid, allocations'
      }, { status: 400 });
    }

    // Validate allocations sum to total_paid (within 1 cent)
    const allocSum = allocations.reduce((sum, a) => sum + (a.allocated_amount || 0), 0);
    const diff = Math.abs(allocSum - total_paid);
    if (diff > 0.01) {
      return Response.json({
        error: `Allocations don't sum to total_paid. Got: $${allocSum.toFixed(2)}, Expected: $${total_paid.toFixed(2)}`
      }, { status: 400 });
    }

    // ============================================================
    // STEP 4 — DEDUPLICATION: Always compute file_hash
    // If file_url provided: hash(file_url + period + employee)
    // If no file_url: hash(employee_id + period_start + period_end + total_paid)
    // ============================================================
    const hashInput = file_url
      ? `${file_url}:${period_start}:${period_end}:${employee_id}`
      : `${employee_id}:${period_start}:${period_end}:${total_paid}`;

    const file_hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // Block on file_hash duplicate
    const existingByHash = await base44.asServiceRole.entities.PayrollBatch.filter({
      file_hash,
      status: 'confirmed'
    });
    if (existingByHash.length > 0) {
      return Response.json({
        error: 'Duplicate payroll batch detected',
        details: `A confirmed batch with the same file/period already exists (ID: ${existingByHash[0].id})`,
        existing_batch_id: existingByHash[0].id
      }, { status: 409 });
    }

    // Block on employee+period duplicate (belt-and-suspenders)
    const existingByPeriod = await base44.asServiceRole.entities.PayrollBatch.filter({
      employee_id,
      period_start,
      period_end,
      status: 'confirmed'
    });
    if (existingByPeriod.length > 0) {
      return Response.json({
        error: 'Duplicate payroll batch detected',
        details: `A confirmed batch already exists for this employee and period (ID: ${existingByPeriod[0].id})`,
        existing_batch_id: existingByPeriod[0].id
      }, { status: 409 });
    }

    console.log(`[confirmPayrollBatch] Starting for ${employee_name} (${period_start} → ${period_end})`);

    // ============================================================
    // STEP 2 — Pre-validate jobs before touching any data
    // Fetch Job for each allocation and check financial_year_locked
    // ============================================================
    const jobUpdatesToApply = []; // { job_id, job_name, oldRealCost, newRealCost }

    for (const alloc of allocations) {
      if (!alloc.job_id) {
        // Placeholder job with no ID — skip real_cost update
        jobUpdatesToApply.push({ job_id: null, job_name: alloc.job_name, oldRealCost: 0, newRealCost: 0, allocation: alloc, skip: true });
        continue;
      }

      const job = await base44.asServiceRole.entities.Job.get(alloc.job_id);
      if (!job) {
        return Response.json({
          error: `Job not found: ${alloc.job_id} (${alloc.job_name}). Cannot confirm batch.`
        }, { status: 400 });
      }

      // STEP 3 hard gate: reject if year is locked
      if (job.financial_year_locked === true) {
        return Response.json({
          error: `Job "${job.name}" (${job.id}) has financial_year_locked = true. Cannot apply payroll.`
        }, { status: 409 });
      }

      const oldRealCost = job.real_cost || 0;
      const newRealCost = Number((oldRealCost + alloc.allocated_amount).toFixed(2));
      jobUpdatesToApply.push({ job_id: alloc.job_id, job_name: alloc.job_name, oldRealCost, newRealCost, allocation: alloc, skip: false });
    }

    console.log(`[confirmPayrollBatch] Pre-validated ${jobUpdatesToApply.filter(u => !u.skip).length} job real_cost updates`);

    // ============================================================
    // Create PayrollBatch (not yet locked)
    // ============================================================
    const batch = await base44.asServiceRole.entities.PayrollBatch.create({
      employee_id,
      employee_name,
      period_start,
      period_end,
      total_paid,
      source: 'Connecteam Import',
      status: 'confirmed',
      file_hash,
      confirmed_at: new Date().toISOString(),
      created_by: user.email,
      allocation_count: allocations.length,
      jobs_affected: allocations.map(a => a.job_id).filter(Boolean),
      notes: notes || '',
      is_locked: false
    });

    console.log(`[confirmPayrollBatch] Created PayrollBatch ${batch.id}`);

    // ============================================================
    // Create PayrollAllocation records
    // ============================================================
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
          is_rounding_adjustment: alloc.is_rounding_adjustment || false,
          rounding_delta: alloc.rounding_delta || 0,
          status: 'confirmed',
          confirmed_at: new Date().toISOString(),
          financial_recalc_triggered: false,
          is_locked: false
        });
        createdAllocations.push(record);
      }
      console.log(`[confirmPayrollBatch] Created ${createdAllocations.length} PayrollAllocation records`);
    } catch (err) {
      // Rollback batch
      await base44.asServiceRole.entities.PayrollBatch.delete(batch.id).catch(e => console.error('[confirmPayrollBatch] Batch delete rollback failed:', e.message));
      throw new Error(`Failed to create allocations: ${err.message}`);
    }

    // ============================================================
    // STEP 2 + STEP 5 + STEP 6 — ATOMIC job.real_cost updates
    // recalculateJobFinancials is CRITICAL — failure = hard fail + full rollback
    // ============================================================
    const appliedJobUpdates = [];

    for (const update of jobUpdatesToApply) {
      if (update.skip) continue;

      // Update real_cost
      try {
        await base44.asServiceRole.entities.Job.update(update.job_id, {
          real_cost: update.newRealCost
        });
        appliedJobUpdates.push(update);
        console.log(`[confirmPayrollBatch] Job ${update.job_id}: real_cost ${update.oldRealCost} → ${update.newRealCost}`);
      } catch (err) {
        // HARD FAILURE — rollback everything applied so far
        console.error(`[confirmPayrollBatch] Job real_cost update FAILED for ${update.job_id}:`, err.message);
        await _rollback(base44, batch.id, createdAllocations, appliedJobUpdates);
        return Response.json({
          success: false,
          error: `Job real_cost update failed for "${update.job_name}" (${update.job_id}): ${err.message}. Entire batch rolled back.`,
          failed_job_id: update.job_id
        }, { status: 500 });
      }

      // STEP 5 — recalculateJobFinancials is CRITICAL, not optional
      try {
        await base44.functions.invoke('recalculateJobFinancials', { job_id: update.job_id });
        console.log(`[confirmPayrollBatch] recalculateJobFinancials succeeded for Job ${update.job_id}`);
      } catch (err) {
        // HARD FAILURE — rollback everything (including the update we just applied)
        console.error(`[confirmPayrollBatch] recalculateJobFinancials FAILED for ${update.job_id}:`, err.message);
        await _rollback(base44, batch.id, createdAllocations, appliedJobUpdates);
        return Response.json({
          success: false,
          error: `recalculateJobFinancials failed for job "${update.job_name}" (${update.job_id}): ${err.message}. Entire batch rolled back.`,
          failed_job_id: update.job_id
        }, { status: 500 });
      }

      // Mark allocation as recalc triggered
      const allocRecord = createdAllocations.find(r => r.job_id === update.job_id);
      if (allocRecord) {
        await base44.asServiceRole.entities.PayrollAllocation.update(allocRecord.id, {
          financial_recalc_triggered: true
        }).catch(() => {}); // non-critical flag update
      }
    }

    console.log(`[confirmPayrollBatch] All ${appliedJobUpdates.length} job real_cost updates + recalculations succeeded`);

    // ============================================================
    // Create draft invoices for placeholder jobs (non-critical, does NOT block)
    // ============================================================
    const placeholderAllocations = allocations.filter(a => a.is_placeholder && a.job_id);
    for (const alloc of placeholderAllocations) {
      try {
        let invoiceNumber = `PAYROLL-DRAFT-${Date.now()}`;
        try {
          const res = await base44.functions.invoke('generateInvoiceNumber', {});
          invoiceNumber = res?.invoice_number || invoiceNumber;
        } catch (_) {}

        await base44.asServiceRole.entities.Invoice.create({
          invoice_number: invoiceNumber,
          job_id: alloc.job_id,
          job_name: alloc.job_name,
          customer_name: 'Pending - Import from Payroll',
          invoice_date: period_start,
          items: [{
            item_name: 'Payroll Labor Cost (Pending)',
            description: `Auto-created from payroll import. Hours: ${alloc.hours_worked}`,
            quantity: 1,
            unit_price: 0,
            total: 0
          }],
          subtotal: 0,
          tax_amount: 0,
          total: 0,
          status: 'draft',
          notes: `PAYROLL DRAFT: Auto-created for placeholder job "${alloc.job_name}". Payroll Batch: ${batch.id}`
        });
        console.log(`[confirmPayrollBatch] Created draft invoice for placeholder job "${alloc.job_name}"`);
      } catch (err) {
        console.warn(`[confirmPayrollBatch] Draft invoice creation failed for "${alloc.job_name}" (non-critical):`, err.message);
      }
    }

    // ============================================================
    // Lock batch and allocations
    // ============================================================
    await base44.asServiceRole.entities.PayrollBatch.update(batch.id, {
      is_locked: true,
      locked_at: new Date().toISOString()
    }).catch(err => console.error('[confirmPayrollBatch] Lock batch failed (non-critical):', err.message));

    for (const alloc of createdAllocations) {
      await base44.asServiceRole.entities.PayrollAllocation.update(alloc.id, {
        is_locked: true
      }).catch(() => {});
    }

    console.log(`[confirmPayrollBatch] Locked batch ${batch.id}`);

    // ============================================================
    // Audit log
    // ============================================================
    await base44.asServiceRole.entities.AuditLog.create({
      event_type: 'payroll_batch_confirmed',
      entity_type: 'PayrollBatch',
      entity_id: batch.id,
      performed_by: user.email,
      performed_by_name: user.full_name || user.email,
      action_description: `Confirmed payroll batch for ${employee_name} (${period_start} to ${period_end}): $${total_paid.toFixed(2)} across ${allocations.length} jobs`,
      before_state: null,
      after_state: { batch_id: batch.id, status: 'confirmed', total_paid, allocation_count: allocations.length, is_locked: true },
      metadata: { employee_id, period_start, period_end, file_hash: file_hash.substring(0, 16) + '...', job_update_count: appliedJobUpdates.length }
    }).catch(err => console.warn('[confirmPayrollBatch] Audit log failed (non-critical):', err.message));

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocation_count: createdAllocations.length,
      total_allocated: allocSum.toFixed(2),
      is_locked: true,
      message: `Confirmed payroll batch for ${employee_name} (${allocations.length} jobs). Locked.`
    });

  } catch (error) {
    console.error('[confirmPayrollBatch] Fatal error:', error);
    return Response.json({ success: false, error: error.message || 'Failed to confirm payroll batch' }, { status: 500 });
  }
});

/**
 * Rollback helper — restores real_cost for all appliedJobUpdates, then deletes batch + allocations.
 */
async function _rollback(base44, batchId, createdAllocations, appliedJobUpdates) {
  console.error(`[confirmPayrollBatch] ROLLBACK INITIATED for batch ${batchId}`);

  for (const applied of appliedJobUpdates) {
    try {
      await base44.asServiceRole.entities.Job.update(applied.job_id, {
        real_cost: applied.oldRealCost
      });
      console.log(`[confirmPayrollBatch] Rolled back Job ${applied.job_id}: real_cost restored to ${applied.oldRealCost}`);
    } catch (rbErr) {
      console.error(`[confirmPayrollBatch] CRITICAL: real_cost rollback failed for Job ${applied.job_id}:`, rbErr.message);
    }
  }

  for (const alloc of createdAllocations) {
    await base44.asServiceRole.entities.PayrollAllocation.delete(alloc.id).catch(e => console.error('[confirmPayrollBatch] Alloc delete failed:', e.message));
  }
  await base44.asServiceRole.entities.PayrollBatch.delete(batchId).catch(e => console.error('[confirmPayrollBatch] Batch delete failed:', e.message));

  console.error(`[confirmPayrollBatch] Rollback complete for batch ${batchId}`);
}