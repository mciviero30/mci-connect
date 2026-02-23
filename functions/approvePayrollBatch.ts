import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENTERPRISE CORE — Approve Batch
 * 
 * Transitions batch from locked to approved.
 * Only allowed if status === "locked"
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

    // Only allow if locked
    if (batch.status !== 'locked') {
      return Response.json({
        error: `Cannot approve batch in ${batch.status} status. Only locked batches can be approved.`
      }, { status: 400 });
    }

    // Approve batch
    const approved = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'approved',
      approved_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Batch approved successfully',
      batch_id: batch_id,
      status: 'approved',
      approved_at: approved.approved_at
    });

  } catch (error) {
    console.error('Approve batch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});