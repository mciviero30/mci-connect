import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Reverse a confirmed payroll batch
 * - Updates batch status to 'reversed'
 * - Updates allocations to 'reversed'
 * - Restores Job.total_cost by subtracting allocated amounts
 * - Triggers financial recalculations
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

    // Reverse job costs and trigger recalculations
    const jobs = await base44.entities.Job.list();
    for (const alloc of allocations) {
      const job = jobs.find(j => j.id === alloc.job_id);
      if (job) {
        const newTotalCost = Math.max(0, (job.total_cost || 0) - alloc.allocated_amount);
        
        // Update job (subtract the allocated amount)
        await base44.entities.Job.update(alloc.job_id, {
          total_cost: newTotalCost
        });

        console.log(`✅ Reversed Job ${alloc.job_id}: total_cost = $${newTotalCost.toFixed(2)}`);

        // Trigger financial recalculations
        try {
          await base44.functions.invoke('recalculateInvoiceFinancials', {
            job_id: alloc.job_id
          });
          console.log(`✅ Triggered recalculateInvoiceFinancials for Job ${alloc.job_id}`);
        } catch (err) {
          console.warn(`⚠️ recalculateInvoiceFinancials failed for Job ${alloc.job_id}:`, err.message);
        }

        // Update allocation status
        await base44.entities.PayrollAllocation.update(alloc.id, {
          status: 'reversed',
          financial_recalc_triggered: true
        });
      }
    }

    // Update batch status
    await base44.entities.PayrollBatch.update(batch_id, {
      status: 'reversed',
      reversed_at: new Date().toISOString(),
      reversed_reason: reason
    });

    console.log(`✅ Reversed PayrollBatch ${batch_id}`);

    return Response.json({
      success: true,
      batch_id: batch_id,
      allocation_count: allocations.length,
      message: `Reversed payroll batch for ${batch.employee_name}`
    });
  } catch (error) {
    console.error('❌ reversePayrollBatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to reverse payroll batch'
    }, { status: 500 });
  }
});