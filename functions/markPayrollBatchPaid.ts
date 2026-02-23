import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENTERPRISE CORE — Mark Batch Paid
 * 
 * Transitions batch from approved to paid.
 * Links all approved commissions in this batch.
 * Only allowed if status === "approved"
 * 
 * Payload:
 * {
 *   batch_id: string
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ error: 'batch_id required' }, { status: 400 });
    }

    // Validate batch exists
    const batches = await base44.asServiceRole.entities.PayrollBatch.filter(
      { id: batch_id },
      '',
      1
    );

    if (!batches || batches.length === 0) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = batches[0];

    // Only allow if approved
    if (batch.status !== 'approved') {
      return Response.json({
        error: `Cannot mark paid in ${batch.status} status. Only approved batches can be marked paid.`
      }, { status: 400 });
    }

    // 1. Mark batch as paid
    const paid = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'paid',
      paid_at: new Date().toISOString()
    });

    // 2. Update linked commissions
    // Get all allocations for this batch to find employees
    const allocations = await base44.asServiceRole.entities.PayrollAllocation.filter(
      { batch_id: batch_id },
      '',
      1000
    );

    let commissionsUpdated = 0;

    if (allocations && allocations.length > 0) {
      const employeeIds = [...new Set(allocations.map(a => a.employee_profile_id))];

      for (const empId of employeeIds) {
        // Get approved commissions for this employee with no linked batch
        const commissions = await base44.asServiceRole.entities.Commission.filter(
          {
            employee_profile_id: empId,
            status: 'approved',
            linked_batch_id: null
          },
          '',
          1000
        );

        // Update each commission
        if (commissions && commissions.length > 0) {
          for (const comm of commissions) {
            await base44.asServiceRole.entities.Commission.update(comm.id, {
              status: 'paid',
              linked_batch_id: batch_id
            });
            commissionsUpdated++;
          }
        }
      }
    }

    return Response.json({
      success: true,
      message: 'Batch marked as paid',
      batch_id: batch_id,
      status: 'paid',
      paid_at: paid.paid_at,
      commissions_linked: commissionsUpdated
    });

  } catch (error) {
    console.error('Mark paid error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});