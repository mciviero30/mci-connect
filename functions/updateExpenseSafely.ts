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

      // Otherwise: BLOCK (improved messaging)
      const billedDate = new Date(existingRecord.billed_at).toLocaleDateString();
      return Response.json({ 
        error: `This expense was billed on ${billedDate}${existingRecord.invoice_id ? ` (Invoice #${existingRecord.invoice_id})` : ''}. ` +
               `Billed records are locked to preserve invoice integrity. ` +
               `To make changes, create a credit note or contact accounting.`,
        billed_at: existingRecord.billed_at,
        invoice_id: existingRecord.invoice_id,
        billed: true
      }, { status: 403 });
    }

    // OWNERSHIP CHECK: employees can only edit their own records
    if (user.role !== 'admin') {
      const isOwner = existingRecord.user_id === user.id || existingRecord.employee_email === user.email;
      if (!isOwner) {
        return Response.json({ error: 'Forbidden: You can only edit your own expenses' }, { status: 403 });
      }
    }

    // Not billed: Allow update
    const updated = await base44.entities.Expense.update(entity_id, update_data);
    return Response.json({ success: true, data: updated });

  } catch (error) {
    console.error('[updateExpenseSafely] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});