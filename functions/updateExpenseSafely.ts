import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SAFE UPDATE GUARD: Expense
 * Prevents editing of billed records at backend level
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_id, update_data } = await req.json();

    if (!entity_id || !update_data) {
      return Response.json({ error: 'Missing entity_id or update_data' }, { status: 400 });
    }

    // Fetch existing record
    const records = await base44.asServiceRole.entities.Expense.filter({ id: entity_id });
    if (records.length === 0) {
      return Response.json({ error: 'Expense not found' }, { status: 404 });
    }

    const existingRecord = records[0];

    // GUARD: Check if billed
    if (existingRecord.billed_at) {
      // Admin override: Allow unbilling
      if (user.role === 'admin' && update_data.billed_at === null) {
        const updated = await base44.asServiceRole.entities.Expense.update(entity_id, update_data);
        return Response.json({ success: true, data: updated });
      }

      // Otherwise: BLOCK
      const billedDate = new Date(existingRecord.billed_at).toLocaleDateString();
      return Response.json({ 
        error: `Billed records are immutable. This expense was billed on ${billedDate}.`,
        billed_at: existingRecord.billed_at,
        invoice_id: existingRecord.invoice_id
      }, { status: 403 });
    }

    // Not billed: Allow update
    const updated = await base44.entities.Expense.update(entity_id, update_data);
    return Response.json({ success: true, data: updated });

  } catch (error) {
    console.error('[updateExpenseSafely] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});