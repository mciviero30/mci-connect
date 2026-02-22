import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

Deno.serve(async (req) => {
  try {
    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature || !webhookSecret) {
      console.error('Missing signature or webhook secret');
      return Response.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Verify Stripe signature
    let event;
    try {
      event = stripe.webhooks.constructEventAsync(
        body,
        signature,
        webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Establish Base44 auth AFTER signature verification
    const base44 = createClientFromRequest(req);

    // Handle checkout.session.completed
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      console.log('[Stripe Webhook] Payment completed:', {
        sessionId: session.id,
        invoiceId: session.metadata?.invoice_id,
        amount: session.amount_total,
      });

      const invoiceId = session.metadata?.invoice_id;
      if (!invoiceId) {
        console.error('No invoice_id in metadata');
        return Response.json({ error: 'Missing invoice ID' }, { status: 400 });
      }

      // Fetch invoice
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);
      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }

      // Calculate new amounts
      const amountPaid = (session.amount_total || 0) / 100; // Convert from cents
      const newAmountPaid = (Number(invoice.amount_paid) || 0) + amountPaid;
      const newBalance = Math.max(0, (Number(invoice.total) || 0) - newAmountPaid);
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update invoice
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: session.payment_intent || session.id,
      });

      // Create transaction record
      await base44.asServiceRole.entities.Transaction.create({
        type: 'income',
        amount: amountPaid,
        category: 'sales',
        description: `Stripe Payment - Invoice ${invoice.invoice_number}`,
        date: new Date().toISOString().split('T')[0],
        payment_method: 'stripe',
        matched_invoice_id: invoiceId,
        matched_invoice_number: invoice.invoice_number,
        stripe_payment_intent_id: session.payment_intent,
      });

      // Send confirmation email to customer
      if (invoice.customer_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: invoice.customer_email,
            subject: `Payment Confirmed - Invoice ${invoice.invoice_number}`,
            body: `Dear ${invoice.customer_name},\n\nWe have received your payment of $${amountPaid.toFixed(2)} for Invoice ${invoice.invoice_number}.\n\nNew Balance: $${newBalance.toFixed(2)}\nInvoice Status: ${newStatus.toUpperCase()}\n\nThank you for your payment!`,
          });
        } catch (emailErr) {
          console.error('Failed to send confirmation email:', emailErr);
          // Don't fail the webhook if email fails
        }
      }

      console.log('[Stripe Webhook] Invoice updated successfully:', {
        invoiceId,
        newStatus,
        amountPaid,
        newBalance,
      });
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('[Stripe Webhook] Unhandled error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});