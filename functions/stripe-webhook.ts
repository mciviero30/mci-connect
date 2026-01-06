import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    // CRITICAL: Initialize base44 first BEFORE webhook validation
    const base44 = createClientFromRequest(req);
    
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();

    if (!signature) {
      console.error('Missing stripe-signature header');
      return Response.json({ error: 'Missing signature' }, { status: 400 });
    }

    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return Response.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    // CRITICAL: Use async version for Deno
    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook event:', event.type, event.id);

    // Handle successful payment
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      
      const invoiceId = session.metadata?.invoice_id;
      
      if (!invoiceId) {
        console.error('No invoice_id in metadata');
        return Response.json({ error: 'Missing invoice_id' }, { status: 400 });
      }

      // Fetch invoice using service role (webhook has no user context)
      const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);

      if (!invoice) {
        console.error('Invoice not found:', invoiceId);
        return Response.json({ error: 'Invoice not found' }, { status: 404 });
      }

      const paymentAmount = session.amount_total / 100; // Convert from cents
      const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;
      const newBalance = (invoice.total || 0) - newAmountPaid;
      const newStatus = newBalance <= 0 ? 'paid' : 'partial';

      // Update invoice
      await base44.asServiceRole.entities.Invoice.update(invoiceId, {
        amount_paid: newAmountPaid,
        balance: newBalance,
        status: newStatus,
        payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.payment_date,
        transaction_id: transaction.id
      });

      // Record transaction
      const transaction = await base44.asServiceRole.entities.Transaction.create({
        type: 'income',
        amount: paymentAmount,
        category: 'sales',
        description: `Stripe payment for Invoice ${invoice.invoice_number} - ${invoice.customer_name}`,
        date: new Date().toISOString().split('T')[0],
        payment_method: 'stripe',
        stripe_payment_intent_id: session.payment_intent,
        reconciliation_status: 'matched',
        matched_invoice_id: invoiceId,
        matched_invoice_number: invoice.invoice_number,
        reconciled_by: 'auto',
        reconciled_at: new Date().toISOString()
      });

      // Send confirmation email
      if (invoice.customer_email) {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: invoice.customer_email,
            subject: `Payment Received - Invoice ${invoice.invoice_number}`,
            body: `Dear ${invoice.customer_name},\n\nWe have received your payment of $${paymentAmount.toFixed(2)} for invoice ${invoice.invoice_number}.\n\nNew balance: $${newBalance.toFixed(2)}\n\nThank you for your payment!\n\nMODERN COMPONENTS INSTALLATION`
          });
        } catch (emailErr) {
          console.error('Email send failed (non-critical):', emailErr);
        }
      }

      console.log(`✅ Payment processed for Invoice ${invoice.invoice_number}: $${paymentAmount}`);
    }

    return Response.json({ received: true });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return Response.json({ 
      error: error.message || 'Webhook processing failed' 
    }, { status: 500 });
  }
});