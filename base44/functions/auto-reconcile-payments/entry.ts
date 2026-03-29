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

    // Fetch unreconciled transactions and open invoices
    const [allTransactions, openInvoices] = await Promise.all([
      base44.asServiceRole.entities.Transaction.list('-date', 500),
      base44.asServiceRole.entities.Invoice.list('-invoice_date', 500),
    ]);

    const unreconciled = allTransactions.filter(t =>
      !t.reconciled && !t.matched_invoice_id && t.amount > 0
    );

    const payableInvoices = openInvoices.filter(inv =>
      inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'partial'
    );

    let matched = 0;
    const matchedPairs = [];

    for (const tx of unreconciled) {
      // Strategy 1: match by exact amount + client
      const exactMatch = payableInvoices.find(inv =>
        !matchedPairs.find(p => p.invoice_id === inv.id) &&
        Math.abs((inv.balance || inv.total || 0) - (tx.amount || 0)) < 0.02 &&
        (
          (inv.client_name && tx.description?.toLowerCase().includes(inv.client_name.toLowerCase())) ||
          (inv.invoice_number && tx.description?.includes(inv.invoice_number)) ||
          (inv.client_id && tx.client_id && inv.client_id === tx.client_id)
        )
      );

      if (exactMatch) {
        try {
          const amountPaid = (exactMatch.amount_paid || 0) + tx.amount;
          const balance    = (exactMatch.total || 0) - amountPaid;
          const newStatus  = balance <= 0.01 ? 'paid' : 'partial';

          await base44.asServiceRole.entities.Transaction.update(tx.id, {
            matched_invoice_id:     exactMatch.id,
            matched_invoice_number: exactMatch.invoice_number || '',
            reconciled:             true,
            reconciled_at:          new Date().toISOString(),
            reconciled_by:          'auto-reconcile',
          });

          await base44.asServiceRole.entities.Invoice.update(exactMatch.id, {
            amount_paid: Math.round(amountPaid * 100) / 100,
            balance:     Math.max(0, Math.round(balance * 100) / 100),
            status:      newStatus,
            last_payment_date: new Date().toISOString().split('T')[0],
          });

          matchedPairs.push({ transaction_id: tx.id, invoice_id: exactMatch.id });
          matched++;
        } catch (err) {
          console.error('Auto-reconcile pair failed:', err.message);
        }
      }
    }

    console.log(`[auto-reconcile-payments] Matched ${matched}/${unreconciled.length} transactions`);
    return Response.json({
      ok: true,
      matched,
      total_unreconciled: unreconciled.length,
      pairs: matchedPairs,
    });

  } catch (err) {
    console.error('[auto-reconcile-payments] error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});
