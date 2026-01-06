import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all unreconciled income transactions
    const unreconciledTransactions = await base44.asServiceRole.entities.Transaction.filter({
      type: 'income',
      reconciliation_status: 'unreconciled'
    });

    // Get all unpaid/partial invoices
    const unpaidInvoices = await base44.asServiceRole.entities.Invoice.filter({});
    const openInvoices = unpaidInvoices.filter(inv => 
      inv.status === 'sent' || inv.status === 'partial'
    );

    let matchedCount = 0;
    let matchedAmount = 0;
    const matches = [];

    // Auto-matching logic
    for (const transaction of unreconciledTransactions) {
      // Skip if already has matched invoice
      if (transaction.matched_invoice_id) continue;

      // Try to find exact match by amount and date (within 7 days)
      const transactionDate = new Date(transaction.date);
      
      for (const invoice of openInvoices) {
        const invoiceDate = new Date(invoice.invoice_date);
        const daysDiff = Math.abs((transactionDate - invoiceDate) / (1000 * 60 * 60 * 24));
        
        // Match criteria:
        // 1. Amount matches balance (within $1)
        // 2. Date within 30 days
        // 3. Customer name in transaction description
        const amountDiff = Math.abs(transaction.amount - (invoice.balance || invoice.total));
        const customerMatch = transaction.description?.toLowerCase().includes(invoice.customer_name?.toLowerCase());
        
        if (amountDiff <= 1 && daysDiff <= 30 && customerMatch) {
          // Auto-reconcile
          await base44.asServiceRole.entities.Transaction.update(transaction.id, {
            reconciliation_status: 'matched',
            matched_invoice_id: invoice.id,
            matched_invoice_number: invoice.invoice_number,
            reconciled_by: 'auto',
            reconciled_at: new Date().toISOString()
          });

          const newAmountPaid = (invoice.amount_paid || 0) + transaction.amount;
          const newBalance = invoice.total - newAmountPaid;
          const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';

          await base44.asServiceRole.entities.Invoice.update(invoice.id, {
            amount_paid: newAmountPaid,
            balance: newBalance,
            status: newStatus,
            payment_date: transaction.date,
            transaction_id: transaction.id
          });

          matchedCount++;
          matchedAmount += transaction.amount;
          matches.push({
            transaction_id: transaction.id,
            transaction_amount: transaction.amount,
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number
          });
          
          // Remove from open invoices to avoid double-matching
          const index = openInvoices.indexOf(invoice);
          if (index > -1) {
            openInvoices.splice(index, 1);
          }
          
          break; // Move to next transaction
        }
      }
    }

    return Response.json({
      success: true,
      matched_count: matchedCount,
      matched_amount: matchedAmount,
      matches,
      message: `Auto-reconciled ${matchedCount} payment(s) totaling $${matchedAmount.toFixed(2)}`
    });
  } catch (error) {
    console.error('Auto-reconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});