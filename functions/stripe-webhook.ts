import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('[Stripe] Missing signature or webhook secret');
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // ✅ CRITICAL FIX — await
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('[Stripe] Signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type !== 'checkout.session.completed') {
      return Response.json({ received: true });
    }

    const session = event.data.object;
    const invoiceId = session.metadata?.invoice_id;
    const paymentIntentId = session.payment_intent;

    console.log('[Stripe] Processing checkout.session.completed', {
      invoiceId,
      paymentIntentId,
      amount_total: session.amount_total
    });

    if (!invoiceId) {
      console.error('[Stripe] Missing invoice_id in metadata');
      return Response.json({ error: 'Missing invoice ID' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Fetch invoice
    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
    if (!invoice) {
      console.error('[Stripe] Invoice not found:', invoiceId);
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // ✅ IDEMPOTENCY CHECK
    const existingTransaction = await base44
      .asServiceRole
      .entities.Transaction
      .filter({
        stripe_payment_intent_id: paymentIntentId
      });

    if (existingTransaction.length > 0) {
      console.log('[Stripe] Duplicate payment ignored:', paymentIntentId);
      return Response.json({ received: true });
    }

    const amountPaid = (session.amount_total || 0) / 100;
    const expectedBalance = Math.max(
      0,
      (Number(invoice.total) || 0) - (Number(invoice.amount_paid) || 0)
    );

    // ✅ VALIDATION — prevent overpayment injection
    if (amountPaid > expectedBalance + 0.01) {
      console.error('[Stripe] Payment exceeds balance', {
        amountPaid,
        expectedBalance
      });
      return Response.json({ error: 'Invalid payment amount' }, { status: 400 });
    }

    const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountPaid;
    const newBalance = Math.max(0, (Number(invoice.total) || 0) - newAmountPaid);
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';

    const today = new Date().toISOString().split('T')[0];

    // ✅ Update invoice
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      amount_paid: newAmountPaid,
      balance: newBalance,
      status: newStatus,
      payment_date: today,
      transaction_id: paymentIntentId,
    });

    // ✅ Create transaction record
    await base44.asServiceRole.entities.Transaction.create({
      type: 'income',
      amount: amountPaid,
      category: 'sales',
      description: `Stripe Payment - Invoice ${invoice.invoice_number}`,
      date: today,
      payment_method: 'stripe',
      matched_invoice_id: invoiceId,
      matched_invoice_number: invoice.invoice_number,
      stripe_payment_intent_id: paymentIntentId,
    });

    // ✅ Recalculate job financials
    if (invoice.job_id) {
      await base44.functions.invoke('recalculateJobFinancials_v2', {
        job_id: invoice.job_id
      });
    }

    // ✅ Optional: Send confirmation email
    if (invoice.customer_email) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: invoice.customer_email,
          subject: `Payment Confirmed - Invoice ${invoice.invoice_number}`,
          body: `Dear ${invoice.customer_name},

We have received your payment of $${amountPaid.toFixed(2)} for Invoice ${invoice.invoice_number}.

New Balance: $${newBalance.toFixed(2)}
Invoice Status: ${newStatus.toUpperCase()}

Thank you for your payment!`,
        });
      } catch (emailErr) {
        console.error('[Stripe] Email send failed:', emailErr.message);
      }
    }

    console.log('[Stripe] Invoice updated successfully', {
      invoiceId,
      newStatus,
      amountPaid,
      newBalance
    });

    return Response.json({ received: true });

  } catch (error) {
    console.error('[Stripe] Unhandled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});