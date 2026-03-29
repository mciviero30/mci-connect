import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const ADMIN_ROLES = ['admin', 'ceo', 'owner', 'super_admin', 'administrator'];
    if (!ADMIN_ROLES.includes(caller.role?.toLowerCase?.())) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { transaction_id, invoice_id } = await req.json().catch(() => ({}));
    if (!transaction_id || !invoice_id) {
      return Response.json({ error: 'transaction_id and invoice_id required' }, { status: 400 });
    }

    // Load transaction and invoice
    const [txList, invList] = await Promise.all([
      base44.asServiceRole.entities.Transaction.filter({ id: transaction_id }, '', 1),
      base44.asServiceRole.entities.Invoice.filter({ id: invoice_id }, '', 1),
    ]);

    if (!txList.length)  return Response.json({ error: 'Transaction not found' },  { status: 404 });
    if (!invList.length) return Response.json({ error: 'Invoice not found' },      { status: 404 });

    const tx      = txList[0];
    const invoice = invList[0];

    // Update transaction — mark as reconciled
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      matched_invoice_id:   invoice_id,
      matched_invoice_number: invoice.invoice_number || '',
      reconciled:           true,
      reconciled_at:        new Date().toISOString(),
      reconciled_by:        caller.email,
    });

    // Update invoice payment status
    const amountPaid = (invoice.amount_paid || 0) + (tx.amount || 0);
    const balance    = (invoice.total || 0) - amountPaid;
    const newStatus  = balance <= 0.01 ? 'paid' : 'partial';

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      amount_paid:    Math.round(amountPaid * 100) / 100,
      balance:        Math.max(0, Math.round(balance * 100) / 100),
      status:         newStatus,
      last_payment_date: new Date().toISOString().split('T')[0],
    });

    console.log(`[reconcile-payments] Reconciled tx ${transaction_id} → invoice ${invoice_id}`);
    return Response.json({
      ok: true,
      invoice_status: newStatus,
      amount_paid:    amountPaid,
      balance:        Math.max(0, balance),
    });

  } catch (err) {
    console.error('[reconcile-payments] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
