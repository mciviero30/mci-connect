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

    // 2. Mark linked commissions as paid
    // Only update commissions that are already linked to THIS batch
    const linkedCommissions = await base44.asServiceRole.entities.Commission.filter(
      {
        linked_batch_id: batch_id,
        status: 'approved'
      },
      '',
      1000
    );

    let commissionsUpdated = 0;

    if (linkedCommissions && linkedCommissions.length > 0) {
      for (const comm of linkedCommissions) {
        await base44.asServiceRole.entities.Commission.update(comm.id, {
          status: 'paid'
        });
        commissionsUpdated++;
      }
    }

    // Audit log
    const user = await base44.auth.me();
    if (user) {
      await base44.asServiceRole.entities.PayrollAuditLog.create({
        batch_id: batch_id,
        action: 'pay',
        performed_by_user_id: user.id,
        timestamp: new Date().toISOString(),
        metadata: { commissions_linked: commissionsUpdated }
      });
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