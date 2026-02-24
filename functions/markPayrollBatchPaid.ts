import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SEC-01 FIX: Authenticate and check role at entry
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { batch_id } = await req.json();

    if (!batch_id) {
      return Response.json({ error: 'batch_id required' }, { status: 400 });
    }

    const batches = await base44.asServiceRole.entities.PayrollBatch.filter({ id: batch_id }, '', 1);
    if (!batches || batches.length === 0) {
      return Response.json({ error: 'Batch not found' }, { status: 404 });
    }

    const batch = batches[0];

    if (batch.status !== 'approved') {
      return Response.json({
        error: `Cannot mark paid in ${batch.status} status. Only approved batches can be marked paid.`
      }, { status: 400 });
    }

    const now = new Date().toISOString();

    const paid = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'paid',
      paid_at: now
    });

    const linkedCommissions = await base44.asServiceRole.entities.Commission.filter(
      { linked_batch_id: batch_id, status: 'approved' }, '', 1000
    );

    let commissionsUpdated = 0;
    if (linkedCommissions && linkedCommissions.length > 0) {
      await Promise.all(linkedCommissions.map(comm =>
        base44.asServiceRole.entities.Commission.update(comm.id, { status: 'paid' })
      ));
      commissionsUpdated = linkedCommissions.length;
    }

    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'pay',
      performed_by_user_id: user.id,
      timestamp: now,
      metadata: {
        commissions_linked: commissionsUpdated,
        period_start: batch.period_start,
        period_end: batch.period_end,
        total_gross: batch.total_gross
      }
    });

    return Response.json({
      success: true,
      message: 'Batch marked as paid',
      batch_id,
      status: 'paid',
      paid_at: paid.paid_at,
      commissions_linked: commissionsUpdated
    });

  } catch (error) {
    console.error('Mark paid error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});