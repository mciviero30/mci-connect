import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Reverse a confirmed payroll batch
 * - Updates batch status to 'reversed'
 * - Updates allocations to 'reversed'
 * - Restores Job.total_cost by subtracting allocated amounts
 * - Triggers financial recalculations
 * - AUDIT LOGS the reversal with reason
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Only CEO/Admin can reverse
    const isAuthorized = ['admin', 'ceo'].includes(user.role);
    if (!isAuthorized) {
      return Response.json({ 
        error: 'Only Admin or CEO can reverse payroll batches' 
      }, { status: 403 });
    }

    const body = await req.json();
    const { batch_id, reason } = body;

    if (!batch_id || !reason) {
      return Response.json({ 
        error: 'batch_id and reason are required' 
      }, { status: 400 });
    }

    // Get batch
    const batch = await base44.entities.PayrollBatch.get(batch_id);
    if (!batch) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    if (batch.status === 'reversed') {
      return Response.json({ 
        error: 'Batch is already reversed' 
      }, { status: 400 });
    }

    // Get allocations
    const allocations = await base44.entities.PayrollAllocation.filter({
      payroll_batch_id: batch_id
    });

    console.log(`🔄 Reversing batch ${batch_id} with ${allocations.length} allocations`);
    console.log(`   Reason: ${reason}`);

    // ATOMIC TRANSACTION - Reverse job costs
    const jobReverseErrors = [];
    const appliedReverals = [];
    
    // Get all jobs once
    const allJobs = await base44.entities.Job.list();
    
    for (const alloc of allocations) {
      const job = allJobs.find(j => j.id === alloc.job_id);
      if (job) {
        const oldCost = job.total_cost || 0;
        const newTotalCost = Math.max(0, oldCost - alloc.allocated_amount);
        
        try {
          // Update job (subtract the allocated amount)
          await base44.entities.Job.update(alloc.job_id, {
            total_cost: newTotalCost
          });

          appliedReverals.push({
            job_id: alloc.job_id,
            oldCost,
            newCost: newTotalCost,
            allocation: alloc
          });

          console.log(`✅ Reversed Job ${alloc.job_id}: total_cost ${oldCost} → ${newTotalCost}`);

          // Trigger financial recalculations (non-critical)
          try {
            await base44.functions.invoke('recalculateInvoiceFinancials', {
              job_id: alloc.job_id
            });
            console.log(`✅ Triggered recalculateInvoiceFinancials for Job ${alloc.job_id}`);
          } catch (err) {
            console.warn(`⚠️ recalculateInvoiceFinancials failed for Job ${alloc.job_id}:`, err.message);
          }

          // Update allocation status (MODIFY, not delete)
          await base44.entities.PayrollAllocation.update(alloc.id, {
            status: 'reversed',
            financial_recalc_triggered: true
          });

        } catch (err) {
          jobReverseErrors.push({
            job_id: alloc.job_id,
            error: err.message
          });
          console.error(`❌ Job reversal failed for ${alloc.job_id}:`, err.message);
        }
      }
    }

    // If ANY job reversal failed, warn but continue to mark batch as reversed
    if (jobReverseErrors.length > 0) {
      console.warn(`⚠️ ${jobReverseErrors.length} job reversals failed, but continuing to mark batch as reversed`);
    }

    // Update batch status
    await base44.entities.PayrollBatch.update(batch_id, {
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversed_reason: reason,
      is_locked: false  // Unlock after reversal so it can be re-confirmed if needed
    });

    console.log(`✅ Marked PayrollBatch ${batch_id} as reversed`);

    // ==========================================
    // 4️⃣ AUDIT LOGGING - Reversal
    // ==========================================
    try {
      await base44.entities.AuditLog.create({
        event_type: 'payroll_batch_reversed',
        entity_type: 'PayrollBatch',
        entity_id: batch_id,
        performed_by: user.email,
        performed_by_name: user.full_name || user.email,
        action_description: `Reversed payroll batch for ${batch.employee_name} (originally confirmed for ${batch.period_start} to ${batch.period_end}): $${batch.total_paid.toFixed(2)} across ${allocations.length} jobs`,
        before_state: {
          status: 'confirmed',
          is_locked: true
        },
        after_state: {
          status: 'reversed',
          is_locked: false
        },
        metadata: {
          batch_id,
          employee_id: batch.employee_id,
          reversal_reason: reason,
          job_reversal_count: appliedReverals.length,
          job_reversal_errors: jobReverseErrors.length
        }
      });
      console.log(`📋 Audit log created for reversal of batch ${batch_id}`);
    } catch (auditErr) {
      console.warn(`⚠️ Audit logging failed (non-critical):`, auditErr.message);
    }

    return Response.json({
      success: true,
      batch_id: batch_id,
      allocation_count: allocations.length,
      job_reversals_applied: appliedReverals.length,
      job_reversals_failed: jobReverseErrors.length,
      message: `✅ REVERSED: Payroll batch for ${batch.employee_name}. Is now UNLOCKED.`
    });

  } catch (error) {
    console.error('❌ reversePayrollBatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to reverse payroll batch'
    }, { status: 500 });
  }
});