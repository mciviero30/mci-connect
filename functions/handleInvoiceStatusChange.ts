import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function lockInvoiceOnSent(invoice) {
  return {
    ...invoice,
    margin_locked: true,
    commission_locked: true,
    locked_at: new Date().toISOString(),
    locked_reason: 'Invoice sent to customer - financial data frozen'
  };
}

/**
 * ============================================================================
 * INVOICE STATUS CHANGE HANDLER (AUTOMATION)
 * ============================================================================
 * 
 * Triggered when invoice.status changes to "sent"
 * Auto-locks margin and commission to prevent recalculation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data, old_data } = await req.json();

    // Only handle status changes TO "sent"
    if (data?.status !== 'sent' || old_data?.status === 'sent') {
      return Response.json({ status: 'skipped', reason: 'Not a status→sent change' });
    }

    const invoice_id = event.entity_id;
    const invoice = await base44.entities.Invoice.get(invoice_id);

    console.log(`[StatusChange] Invoice ${invoice.invoice_number}: status changed to "sent"`);

    // LOCK: Apply margin_locked and commission_locked
    const lockedInvoice = lockInvoiceOnSent(invoice);

    await base44.entities.Invoice.update(invoice_id, {
      margin_locked: lockedInvoice.margin_locked,
      commission_locked: lockedInvoice.commission_locked,
      locked_at: lockedInvoice.locked_at,
      locked_reason: lockedInvoice.locked_reason
    });

    console.log(`[StatusChange] Invoice locked:`, {
      invoice_id,
      margin_locked: true,
      commission_locked: true
    });

    // Create audit entry
    await base44.asServiceRole.entities.AuditLog?.create?.({
      entity_type: 'Invoice',
      entity_id: invoice_id,
      action: 'status_change_lock',
      old_value: old_data?.status,
      new_value: data?.status,
      change_reason: 'Invoice sent - financial data frozen',
      changed_by: user.id,
      changed_at: new Date().toISOString()
    }).catch(() => {
      // AuditLog might not exist, that's OK
      console.log('[StatusChange] AuditLog not available, skipping');
    });

    return Response.json({
      status: 'success',
      message: 'Invoice locked on status→sent',
      invoice_id,
      locks: {
        margin_locked: true,
        commission_locked: true
      }
    });
  } catch (error) {
    console.error('[StatusChange] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});