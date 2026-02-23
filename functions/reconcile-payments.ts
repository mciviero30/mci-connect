import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { transaction_id, invoice_id } = await req.json();

    if (!transaction_id || !invoice_id) {
      return Response.json({ error: 'transaction_id and invoice_id required' }, { status: 400 });
    }

    // Get transaction and invoice
    const transactions = await base44.asServiceRole.entities.Transaction.filter({ id: transaction_id });
    const transaction = transactions[0];

    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    const invoice = invoices[0];

    if (!transaction || !invoice) {
      return Response.json({ error: 'Transaction or invoice not found' }, { status: 404 });
    }

    // Validate amounts match against remaining balance (within $1 tolerance)
    const invoiceBalance = invoice.balance ?? (invoice.total - (invoice.amount_paid || 0));
    const amountDiff = Math.abs(transaction.amount - invoiceBalance);
    if (amountDiff > 1) {
      return Response.json({ 
        error: `Amount mismatch: Transaction $${transaction.amount} vs Invoice balance $${invoiceBalance.toFixed(2)}`,
        warning: true
      }, { status: 400 });
    }

    // Update transaction with reconciliation
    await base44.asServiceRole.entities.Transaction.update(transaction_id, {
      reconciliation_status: 'matched',
      matched_invoice_id: invoice_id,
      matched_invoice_number: invoice.invoice_number,
      reconciled_by: user.email,
      reconciled_at: new Date().toISOString()
    });

    // Update invoice payment status
    const newAmountPaid = (invoice.amount_paid || 0) + transaction.amount;
    const newBalance = invoice.total - newAmountPaid;
    const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';

    await base44.asServiceRole.entities.Invoice.update(invoice_id, {
      amount_paid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      payment_date: transaction.date,
      transaction_id: transaction_id
    });

    return Response.json({
      success: true,
      message: `Payment reconciled: $${transaction.amount} applied to ${invoice.invoice_number}`,
      invoice: {
        id: invoice_id,
        number: invoice.invoice_number,
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus
      }
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});