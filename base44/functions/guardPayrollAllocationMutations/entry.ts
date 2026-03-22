import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * IMMUTABILITY GUARD — PayrollAllocation
 *
 * Called by entity automation on update and delete events.
 * Rejects any mutation if the related PayrollBatch is not in "draft" status.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Only enforce on update and delete
    if (event?.type !== 'update' && event?.type !== 'delete') {
      return Response.json({ success: true, skipped: true });
    }

    const alloc = data;
    if (!alloc?.batch_id) {
      console.warn('guardPayrollAllocationMutations: no batch_id on allocation', event?.entity_id);
      return Response.json({ success: true, skipped: true });
    }

    const batches = await base44.asServiceRole.entities.PayrollBatch.filter(
      { id: alloc.batch_id },
      '',
      1
    );
    const batch = batches?.[0];

    if (!batch) {
      console.warn('guardPayrollAllocationMutations: batch not found for batch_id', alloc.batch_id);
      return Response.json({ success: true, skipped: true });
    }

    if (batch.status !== 'draft') {
      console.error(
        `IMMUTABILITY VIOLATION: PayrollAllocation ${event?.entity_id} mutation blocked — batch ${alloc.batch_id} is "${batch.status}"`
      );
      return Response.json(
        { error: 'PayrollAllocation cannot be modified after PayrollBatch is locked.' },
        { status: 403 }
      );
    }

    return Response.json({ success: true, allowed: true });

  } catch (error) {
    console.error('guardPayrollAllocationMutations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});