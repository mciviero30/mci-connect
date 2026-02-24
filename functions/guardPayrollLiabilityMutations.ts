import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * IMMUTABILITY GUARD — PayrollBatchLiability
 *
 * Blocks ALL updates and deletes. The liability snapshot is permanently immutable
 * once created. No exceptions.
 */
Deno.serve(async (req) => {
  try {
    const payload = await req.json();
    const { event } = payload;

    if (event?.type !== 'update' && event?.type !== 'delete') {
      return Response.json({ success: true, skipped: true });
    }

    console.error(
      `IMMUTABILITY VIOLATION: PayrollBatchLiability ${event?.entity_id} mutation blocked — snapshot is permanently immutable.`
    );

    return Response.json(
      { error: 'PayrollBatchLiability is permanently immutable and cannot be modified or deleted.' },
      { status: 403 }
    );

  } catch (error) {
    console.error('guardPayrollLiabilityMutations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});