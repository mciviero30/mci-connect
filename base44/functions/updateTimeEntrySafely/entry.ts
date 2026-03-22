import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * SAFE UPDATE GUARD: TimeEntry
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
    const records = await base44.asServiceRole.entities.TimeEntry.filter({ id: entity_id });
    if (records.length === 0) {
      return Response.json({ error: 'TimeEntry not found' }, { status: 404 });
    }

    const existingRecord = records[0];

    // GUARD: Check if payroll-locked
    if (existingRecord.is_locked === true) {
      return Response.json({
        error: `This time entry has been locked by payroll batch ${existingRecord.payroll_batch_id || '(unknown)'}. Paid records cannot be edited or deleted.`,
        is_locked: true,
        payroll_batch_id: existingRecord.payroll_batch_id,
        paid_at: existingRecord.paid_at
      }, { status: 403 });
    }

    // GUARD: Check if billed
    if (existingRecord.billed_at) {
      // Admin override: Allow unbilling
      if (user.role === 'admin' && update_data.billed_at === null) {
        const updated = await base44.asServiceRole.entities.TimeEntry.update(entity_id, update_data);
        return Response.json({ success: true, data: updated });
      }

      // Otherwise: BLOCK (improved messaging)
      const billedDate = new Date(existingRecord.billed_at).toLocaleDateString();
      return Response.json({ 
        error: `This time entry was billed on ${billedDate}${existingRecord.invoice_id ? ` (Invoice #${existingRecord.invoice_id})` : ''}. ` +
               `Billed records are locked to preserve invoice integrity. ` +
               `To make changes, create a new invoice or contact accounting.`,
        billed_at: existingRecord.billed_at,
        invoice_id: existingRecord.invoice_id,
        billed: true
      }, { status: 403 });
    }

    // Not billed: Allow update
    const updated = await base44.entities.TimeEntry.update(entity_id, update_data);
    return Response.json({ success: true, data: updated });

  } catch (error) {
    console.error('[updateTimeEntrySafely] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});