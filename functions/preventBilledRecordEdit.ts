import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ENTITY AUTOMATION: Prevent editing of billed TimeEntries and Expenses
 * Triggered on update/delete events
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    
    // Entity automation payload format
    const { event, data, old_data } = payload;
    const entity_name = event?.entity_name;
    const entity_id = event?.entity_id;
    const event_type = event?.type;

    if (!entity_name || !entity_id || !event_type) {
      return Response.json({ error: 'Missing event data' }, { status: 400 });
    }

    // Only guard TimeEntry and Expense
    if (entity_name !== 'TimeEntry' && entity_name !== 'Expense') {
      return Response.json({ success: true, message: 'Entity not guarded' });
    }

    // Only guard update and delete operations
    if (event_type !== 'update' && event_type !== 'delete') {
      return Response.json({ success: true, message: 'Event type not guarded' });
    }

    // Use old_data for update events, or fetch for delete events
    let record = old_data;
    if (!record || event_type === 'delete') {
      const records = await base44.asServiceRole.entities[entity_name].filter({ id: entity_id });
      if (records.length === 0) {
        return Response.json({ error: 'Record not found' }, { status: 404 });
      }
      record = records[0];
    }

    // CHECK: Is it billed?
    if (record.billed_at) {
      // Admin override: Allow admins to unbill (remove billed_at/invoice_id)
      if (user.role === 'admin' && event_type === 'update' && data?.billed_at === null) {
        return Response.json({ success: true, message: 'Admin override: Unbilling record' });
      }

      // Otherwise: BLOCK
      throw new Error(`Billed records are immutable. This ${entity_name} was billed on ${new Date(record.billed_at).toLocaleDateString()}.`);
    }

    // Not billed: Allow
    return Response.json({ success: true });

  } catch (error) {
    console.error('[preventBilledRecordEdit] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});