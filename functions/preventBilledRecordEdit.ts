import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * GUARD: Prevent editing of billed TimeEntries and Expenses
 * Called before update operations on TimeEntry/Expense entities
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity_name, entity_id, update_data } = await req.json();

    if (!entity_name || !entity_id) {
      return Response.json({ error: 'Missing entity_name or entity_id' }, { status: 400 });
    }

    // Only guard TimeEntry and Expense
    if (entity_name !== 'TimeEntry' && entity_name !== 'Expense') {
      return Response.json({ 
        allowed: true, 
        message: 'Entity not guarded by billing lock' 
      });
    }

    // Fetch current record
    const records = await base44.asServiceRole.entities[entity_name].filter({ id: entity_id });
    if (records.length === 0) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    const record = records[0];

    // CHECK: Is it billed?
    if (record.billed_at) {
      // Admin override: Allow admins to unbill (remove billed_at/invoice_id)
      if (user.role === 'admin' && update_data.billed_at === null && update_data.invoice_id === null) {
        return Response.json({ 
          allowed: true, 
          message: 'Admin override: Unbilling record' 
        });
      }

      // Otherwise: BLOCK
      return Response.json({ 
        allowed: false, 
        error: 'Cannot edit billed record',
        billed_at: record.billed_at,
        invoice_id: record.invoice_id
      }, { status: 403 });
    }

    // Not billed: Allow
    return Response.json({ allowed: true });

  } catch (error) {
    console.error('[preventBilledRecordEdit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});