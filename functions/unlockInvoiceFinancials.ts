import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { unlockInvoiceForEditing } from '../components/domain/financials/invoiceProfitCalculations.js';

/**
 * ============================================================================
 * ADMIN UNLOCK INVOICE FINANCIALS
 * ============================================================================
 * 
 * Allows admin to unlock margin and commission for editing
 * Requires explicit justification and creates audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ADMIN-ONLY: Only admins can unlock
    if (user.role !== 'admin') {
      console.warn(`[Unlock] Non-admin user ${user.email} attempted to unlock invoice`);
      return Response.json({ 
        error: 'Forbidden: Admin access required' 
      }, { status: 403 });
    }

    const { invoice_id, unlock_reason } = await req.json();

    if (!unlock_reason || !unlock_reason.trim()) {
      return Response.json({ 
        error: 'Unlock reason is required' 
      }, { status: 400 });
    }

    // STEP 1: Fetch invoice
    const invoice = await base44.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log(`[Unlock] Admin ${user.email} unlocking invoice ${invoice.invoice_number}`);
    console.log(`[Unlock] Reason: ${unlock_reason}`);

    // STEP 2: Unlock invoice
    const unlockedInvoice = unlockInvoiceForEditing(invoice, user.id, unlock_reason);

    // STEP 3: Update invoice
    await base44.entities.Invoice.update(invoice_id, {
      margin_locked: unlockedInvoice.margin_locked,
      commission_locked: unlockedInvoice.commission_locked,
      unlocked_at: unlockedInvoice.unlocked_at,
      unlocked_by_user_id: unlockedInvoice.unlocked_by_user_id,
      unlock_reason: unlockedInvoice.unlock_reason,
      unlock_audit: unlockedInvoice.unlock_audit
    });

    console.log('[Unlock] Invoice unlocked successfully');

    // STEP 4: Create audit log
    try {
      await base44.asServiceRole.entities.AuditLog?.create?.({
        entity_type: 'Invoice',
        entity_id: invoice_id,
        action: 'financial_unlock',
        old_value: JSON.stringify({
          margin_locked: invoice.margin_locked,
          commission_locked: invoice.commission_locked
        }),
        new_value: JSON.stringify({
          margin_locked: false,
          commission_locked: false
        }),
        change_reason: unlock_reason,
        changed_by: user.id,
        changed_at: new Date().toISOString()
      });
    } catch (err) {
      console.log('[Unlock] AuditLog not available, skipping');
    }

    return Response.json({
      status: 'success',
      message: 'Invoice financial locks removed',
      invoice_id,
      unlocked_by: user.email,
      unlock_reason
    });
  } catch (error) {
    console.error('[Unlock] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});