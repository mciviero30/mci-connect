import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PAYROLL ENTERPRISE CORE — Lock Batch
 * 
 * Transitions batch from draft to locked.
 * After locked: batch becomes immutable except for status transitions.
 * generatePayrollBatch will throw error for locked batches.
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

    // Only allow if draft
    if (batch.status !== 'draft') {
      return Response.json({
        error: `Cannot lock batch in ${batch.status} status. Only draft batches can be locked.`
      }, { status: 400 });
    }

    // Lock batch
    const locked = await base44.asServiceRole.entities.PayrollBatch.update(batch_id, {
      status: 'locked',
      locked_at: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Batch locked successfully',
      batch_id: batch_id,
      status: 'locked',
      locked_at: locked.locked_at
    });

  } catch (error) {
    console.error('Lock batch error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});