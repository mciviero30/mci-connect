import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * LOG AUDIT EVENT (Entity Automation)
 * Triggered on: Invoice, Quote, Employee changes
 * Creates comprehensive audit trail
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { event, data, old_data } = await req.json();

    if (!event || !event.entity_name) {
      return Response.json({ error: 'Invalid event data' }, { status: 400 });
    }

    // Determine who made the change
    let performedBy = 'system';
    try {
      const user = await base44.auth.me();
      if (user) {
        performedBy = user.email;
      }
    } catch {
      // Webhook or system action
      performedBy = 'system';
    }

    // Build change summary
    let changes = '';
    if (event.type === 'update' && old_data && data) {
      const changedFields = [];
      for (const key in data) {
        if (data[key] !== old_data[key]) {
          changedFields.push(`${key}: ${old_data[key]} → ${data[key]}`);
        }
      }
      changes = changedFields.join(', ');
    } else if (event.type === 'create') {
      changes = 'Record created';
    } else if (event.type === 'delete') {
      changes = 'Record deleted';
    }

    // Create audit log
    await base44.asServiceRole.entities.AuditLog.create({
      entity_type: event.entity_name,
      entity_id: event.entity_id,
      action: event.type,
      performed_by: performedBy,
      changes: changes.substring(0, 500), // Limit length
      timestamp: new Date().toISOString(),
      metadata: {
        event_type: event.type,
        entity_name: event.entity_name,
      }
    });

    console.log(`✅ Audit log created: ${event.entity_name} ${event.type} by ${performedBy}`);

    return Response.json({ success: true });

  } catch (error) {
    console.error('❌ Audit logging failed:', error);
    // Don't fail the operation - audit is supplementary
    return Response.json({ success: true, audit_failed: true });
  }
});