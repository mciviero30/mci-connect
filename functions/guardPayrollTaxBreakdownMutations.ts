import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GUARD — PayrollTaxBreakdown
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

    const breakdown = data;
    if (!breakdown?.batch_id) {
      console.warn('guardPayrollTaxBreakdownMutations: no batch_id on breakdown', event?.entity_id);
      return Response.json({ success: true, skipped: true });
    }

    const batches = await base44.asServiceRole.entities.PayrollBatch.filter(
      { id: breakdown.batch_id },
      '',
      1
    );
    const batch = batches?.[0];

    if (!batch) {
      console.warn('guardPayrollTaxBreakdownMutations: batch not found for batch_id', breakdown.batch_id);
      return Response.json({ success: true, skipped: true });
    }

    if (batch.status !== 'draft') {
      console.error(
        `IMMUTABILITY VIOLATION: PayrollTaxBreakdown ${event?.entity_id} mutation blocked — batch ${breakdown.batch_id} is "${batch.status}"`
      );
      return Response.json(
        { error: 'PayrollTaxBreakdown cannot be modified after PayrollBatch is locked.' },
        { status: 403 }
      );
    }

    return Response.json({ success: true, allowed: true });

  } catch (error) {
    console.error('guardPayrollTaxBreakdownMutations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});