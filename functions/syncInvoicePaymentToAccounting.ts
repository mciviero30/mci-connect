import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * AUTO-SYNC INVOICE PAYMENTS TO ACCOUNTING
 * Entity automation triggered on Invoice update
 * When status changes to 'paid' or 'partial', creates Transaction record
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process update events
    if (event.type !== 'update') {
      return Response.json({ skipped: true, reason: 'Not an update event' });
    }

    const invoice = data;
    const oldInvoice = old_data;

    // Only process when payment status changes to paid/partial
    const isPaid = invoice.status === 'paid' || invoice.status === 'partial';
    const wasNotPaid = oldInvoice?.status !== 'paid' && oldInvoice?.status !== 'partial';

    if (!isPaid || !wasNotPaid) {
      return Response.json({ skipped: true, reason: 'Payment status did not change to paid/partial' });
    }

    // Check if transaction already exists for this invoice
    const existingTransactions = await base44.asServiceRole.entities.Transaction.filter({
      matched_invoice_id: invoice.id
    });

    if (existingTransactions.length > 0) {
      return Response.json({ 
        skipped: true, 
        reason: 'Transaction already exists for this invoice',
        transaction_id: existingTransactions[0].id
      });
    }

    // Determine amount paid (for partial payments, use amount_paid, otherwise use total)
    const amountPaid = invoice.status === 'partial' 
      ? (invoice.amount_paid || 0)
      : invoice.total;

    if (amountPaid <= 0) {
      return Response.json({ skipped: true, reason: 'No payment amount recorded' });
    }

    // Create Transaction record
    const transaction = await base44.asServiceRole.entities.Transaction.create({
      type: 'income',
      amount: amountPaid,
      category: 'sales', // Revenue from invoices
      description: `Payment for Invoice ${invoice.invoice_number || invoice.id} - ${invoice.customer_name}`,
      date: invoice.payment_date || new Date().toISOString().split('T')[0],
      payment_method: invoice.transaction_id ? 'stripe' : 'other',
      reconciliation_status: 'matched',
      matched_invoice_id: invoice.id,
      matched_invoice_number: invoice.invoice_number,
      stripe_payment_intent_id: invoice.transaction_id || null,
      notes: `Auto-generated from Invoice #${invoice.invoice_number} - ${invoice.job_name || 'N/A'}`
    });

    console.log(`✅ Created Transaction ${transaction.id} for Invoice ${invoice.invoice_number} ($${amountPaid})`);

    return Response.json({ 
      success: true,
      transaction_id: transaction.id,
      invoice_id: invoice.id,
      amount: amountPaid
    });
  } catch (error) {
    console.error('❌ Sync invoice payment to accounting failed:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});