import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // SECTION 1: Role enforcement — MUST be first
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

    // Only allow if locked
    if (batch.status !== 'locked') {
      return Response.json({
        error: `Cannot approve batch in ${batch.status} status. Only locked batches can be approved.`
      }, { status: 400 });
    }

    const approved = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });

    // SECTION 6: Audit log always written
    await base44.asServiceRole.entities.PayrollAuditLog.create({
      batch_id,
      action: 'approve',
      performed_by_user_id: user.id,
      timestamp: new Date().toISOString(),
      metadata: {
        previous_status: 'locked',
        period_start: batch.period_start,
        period_end: batch.period_end
      }
    });

    return Response.json({
      success: true,
      message: 'Batch approved successfully',
      batch_id,
      status: 'approved',
      approved_at: approved.approved_at
    });

  } catch (error) {
    console.error('Approve batch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});