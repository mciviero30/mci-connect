import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Confirm payroll batch and create allocations
 * This is where financial updates happen
 * 
 * CRITICAL: This function:
 * 1. Creates PayrollBatch record
 * 2. Creates PayrollAllocation records
 * 3. Updates Job.total_cost for each job
 * 4. Triggers financial recalculations
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // SECURITY: Only CEO/Admin/Accountant can confirm
    const isAuthorized = ['admin', 'ceo'].includes(user.role) || 
                        (user.position && ['CEO', 'Accountant'].includes(user.position));
    if (!isAuthorized) {
      return Response.json({ 
        error: 'Only Admin, CEO, or Accountant can confirm payroll batches' 
      }, { status: 403 });
    }

    const body = await req.json();
    const {
      employee_id,
      employee_name,
      period_start,
      period_end,
      total_paid,
      allocations,
      file_hash,
      notes
    } = body;

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

    // Step 1: Create PayrollBatch
    const batch = await base44.entities.PayrollBatch.create({
      employee_id,
      employee_name,
      period_start,
      period_end,
      total_paid,
      source: 'Connecteam Import',
      status: 'confirmed',
      file_hash: file_hash || '',
      confirmed_at: new Date().toISOString(),
      created_by: user.email,
      allocation_count: allocations.length,
      jobs_affected: allocations.map(a => a.job_id),
      notes: notes || ''
    });

    console.log(`✅ Created PayrollBatch ${batch.id} for ${employee_name}`);

    // Step 2: Create PayrollAllocations
    const allocationRecords = [];
    for (const alloc of allocations) {
      const record = await base44.entities.PayrollAllocation.create({
        payroll_batch_id: batch.id,
        job_id: alloc.job_id,
        job_name: alloc.job_name,
        allocated_amount: alloc.allocated_amount,
        allocation_percentage: alloc.allocation_percentage,
        hours_worked: alloc.hours_worked || 0,
        is_rounding_adjustment: alloc.is_rounding_adjustment || false,
        rounding_delta: alloc.rounding_delta || 0,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        financial_recalc_triggered: false
      });
      allocationRecords.push(record);
    }

    console.log(`✅ Created ${allocationRecords.length} PayrollAllocation records`);

    // Step 3: Update Job.total_cost and trigger recalculations
    const jobs = await base44.entities.Job.list();
    for (const alloc of allocations) {
      const job = jobs.find(j => j.id === alloc.job_id);
      if (job) {
        const newTotalCost = (job.total_cost || 0) + alloc.allocated_amount;
        
        // Update job
        await base44.entities.Job.update(alloc.job_id, {
          total_cost: newTotalCost
        });

        console.log(`✅ Updated Job ${alloc.job_id}: total_cost = $${newTotalCost.toFixed(2)}`);

        // Trigger financial recalculations
        try {
          await base44.functions.invoke('recalculateInvoiceFinancials', {
            job_id: alloc.job_id
          });
          console.log(`✅ Triggered recalculateInvoiceFinancials for Job ${alloc.job_id}`);
        } catch (err) {
          console.warn(`⚠️ recalculateInvoiceFinancials failed for Job ${alloc.job_id}:`, err.message);
        }

        // Mark allocation as triggering recalc
        await base44.entities.PayrollAllocation.update(
          allocationRecords.find(r => r.job_id === alloc.job_id)?.id,
          { financial_recalc_triggered: true }
        );
      }
    }

    return Response.json({
      success: true,
      batch_id: batch.id,
      allocation_count: allocationRecords.length,
      total_allocated: allocSum.toFixed(2),
      message: `Confirmed payroll batch for ${employee_name} (${allocations.length} jobs)`
    });
  } catch (error) {
    console.error('❌ confirmPayrollBatch error:', error);
    return Response.json({
      success: false,
      error: error.message || 'Failed to confirm payroll batch'
    }, { status: 500 });
  }
});