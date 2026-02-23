import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

/**
 * STRIPE WEBHOOK HANDLER
 * Idempotency: ALL events guarded via IdempotencyRecord using Stripe event.id as mutation_id.
 * This prevents double-processing on Stripe retries regardless of Transaction state.
 */

async function claimIdempotency(base44, stripeEventId, mutationType) {
  try {
    const record = await base44.asServiceRole.entities.IdempotencyRecord.create({
      request_id: stripeEventId,
      mutation_id: stripeEventId,
      mutation_type: mutationType,
      user_id: 'stripe-webhook',
      entity_type: 'Payment',
      entity_id: stripeEventId,
      created_at: new Date().toISOString(),
      is_permanent: true,
      status: 'pending',
    });

    console.log(`🔐 Idempotency claimed: ${stripeEventId}`);
    return { isDuplicate: false, record };

  } catch (err) {
    // Unique constraint violation = already processed
    if (
      err.message?.toLowerCase().includes('unique') ||
      err.message?.toLowerCase().includes('duplicate')
    ) {
      console.log(`⚠️ Duplicate Stripe event (atomic guard): ${stripeEventId}`);
      return { isDuplicate: true };
    }

    throw err;
  }
}

async function markIdempotencyComplete(base44, recordId, entityId) {
  await base44.asServiceRole.entities.IdempotencyRecord.update(recordId, {
    status: 'completed',
    entity_id: entityId,
  });
}

async function markIdempotencyFailed(base44, recordId, errorMessage) {
  await base44.asServiceRole.entities.IdempotencyRecord.update(recordId, {
    status: 'failed',
    error_message: errorMessage,
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get raw body for signature verification
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('❌ No Stripe signature');
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia',
    });

    // CRITICAL: Use async webhook verification for Deno
    const event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    console.log('✅ Webhook verified:', event.type, event.id);

    // ─────────────────────────────────────────────────────────────
    // EVENT: invoice.paid (Recurring subscriptions)
    // ─────────────────────────────────────────────────────────────
    if (event.type === 'invoice.paid') {
      const stripeInvoice = event.data.object;
      const subscriptionId = stripeInvoice.subscription;

      if (!subscriptionId) {
        return Response.json({ received: true });
      }

      console.log('💰 Subscription payment received:', stripeInvoice.id);

      // IDEMPOTENCY: use Stripe event.id as the canonical key
      const { isDuplicate, record } = await claimIdempotency(
        base44, event.id, 'create_payment'
      );
      if (isDuplicate) return Response.json({ success: true, idempotent: true });

      try {
        const templates = await base44.asServiceRole.entities.RecurringInvoice.filter({
          stripe_subscription_id: subscriptionId
        });

        if (templates.length > 0) {
          const template = templates[0];

          const counterRes = await base44.asServiceRole.functions.invoke('getNextCounter', {
            counter_key: 'invoice_number'
          });
          const invoiceNumber = `INV-${String(counterRes.next_value).padStart(5, '0')}`;

          const newInvoice = await base44.asServiceRole.entities.Invoice.create({
            invoice_number: invoiceNumber,
            customer_id: template.customer_id,
            customer_name: template.customer_name,
            customer_email: template.customer_email,
            job_id: template.job_id,
            job_name: template.job_name,
            invoice_date: new Date().toISOString().split('T')[0],
            due_date: new Date().toISOString().split('T')[0],
            items: template.items,
            subtotal: template.subtotal,
            tax_rate: template.tax_rate,
            tax_amount: template.tax_amount,
            total: template.total,
            notes: template.notes,
            terms: template.terms,
            status: 'paid',
            amount_paid: template.total,
            balance: 0,
            payment_date: new Date().toISOString().split('T')[0],
            transaction_id: stripeInvoice.payment_intent,
          });

          const transaction = await base44.asServiceRole.entities.Transaction.create({
            type: 'income',
            amount: template.total,
            category: 'sales',
            description: `Recurring payment: ${template.template_name} - ${invoiceNumber}`,
            date: new Date().toISOString().split('T')[0],
            payment_method: 'stripe',
            reconciliation_status: 'matched',
            matched_invoice_id: newInvoice.id,
            matched_invoice_number: invoiceNumber,
            stripe_payment_intent_id: stripeInvoice.payment_intent,
          });

          await base44.asServiceRole.entities.RecurringInvoice.update(template.id, {
            invoices_generated: (template.invoices_generated || 0) + 1,
            last_invoice_id: newInvoice.id,
            last_generated_date: new Date().toISOString().split('T')[0],
          });

          await markIdempotencyComplete(base44, record.id, transaction.id);
          console.log('✅ Recurring invoice created:', invoiceNumber);
        } else {
          await markIdempotencyComplete(base44, record.id, 'no-template');
        }
      } catch (err) {
        await markIdempotencyFailed(base44, record.id, err.message);
        throw err;
      }

      return Response.json({ success: true });
    }

    // ─────────────────────────────────────────────────────────────
    // EVENT: checkout.session.completed (One-time invoice payments)
    // ─────────────────────────────────────────────────────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const metadata = session.metadata;

      console.log('💳 Payment completed:', session.id);

      const invoiceId = metadata?.invoice_id;
      const invoiceNumber = metadata?.invoice_number;

      if (!invoiceId) {
        console.error('❌ No invoice_id in metadata');
        return Response.json({ error: 'No invoice_id' }, { status: 400 });
      }

      // IDEMPOTENCY: use Stripe event.id as the canonical key
      const { isDuplicate, record } = await claimIdempotency(
        base44, event.id, 'create_payment'
      );
      if (isDuplicate) return Response.json({ success: true, idempotent: true });

      try {
        const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoiceId });
        if (invoices.length === 0) {
          await markIdempotencyFailed(base44, record.id, `Invoice not found: ${invoiceId}`);
          console.error('❌ Invoice not found:', invoiceId);
          return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const invoice = invoices[0];
        const amountPaid = Math.round(session.amount_total) / 100; // cents → dollars, precision safe
        const newTotalPaid = Math.round(((invoice.amount_paid || 0) + amountPaid) * 100) / 100;
        const newBalance = Math.round((invoice.total - newTotalPaid) * 100) / 100;
        const newStatus = newBalance <= 0.01 ? 'paid' : 'partial';

        await base44.asServiceRole.entities.Invoice.update(invoiceId, {
          amount_paid: newTotalPaid,
          balance: Math.max(0, newBalance),
          status: newStatus,
          payment_date: newStatus === 'paid' ? new Date().toISOString().split('T')[0] : invoice.payment_date,
          transaction_id: session.payment_intent,
        });

        console.log('✅ Invoice updated:', invoiceId, 'Status:', newStatus);

        const transaction = await base44.asServiceRole.entities.Transaction.create({
          type: 'income',
          amount: amountPaid,
          category: 'sales',
          description: `Payment for Invoice ${invoiceNumber} - ${invoice.customer_name}`,
          date: new Date().toISOString().split('T')[0],
          payment_method: 'stripe',
          reconciliation_status: 'matched',
          matched_invoice_id: invoiceId,
          matched_invoice_number: invoiceNumber,
          stripe_payment_intent_id: session.payment_intent,
        });

        await markIdempotencyComplete(base44, record.id, transaction.id);
        console.log('✅ Transaction created:', transaction.id);

        // Send receipt email
        let language = 'en';
        if (invoice.customer_id) {
          try {
            const customers = await base44.asServiceRole.entities.Customer.filter({ id: invoice.customer_id });
            if (customers.length > 0 && customers[0].preferred_language) {
              language = customers[0].preferred_language;
            }
          } catch (e) {
            console.warn('Could not fetch customer language:', e.message);
          }
        }

        if (invoice.customer_email) {
          const emailBody = language === 'es'
            ? `Estimado(a) ${invoice.customer_name},\n\nHemos recibido tu pago de $${amountPaid.toFixed(2)} para la factura ${invoiceNumber}.\n\nGracias por tu pago.\n\nMCI Team`
            : `Dear ${invoice.customer_name},\n\nWe have received your payment of $${amountPaid.toFixed(2)} for invoice ${invoiceNumber}.\n\nThank you for your payment.\n\nMCI Team`;

          await base44.asServiceRole.integrations.Core.SendEmail({
            to: invoice.customer_email,
            subject: language === 'es' ? `Recibo de Pago - ${invoiceNumber}` : `Payment Receipt - ${invoiceNumber}`,
            body: emailBody,
            from_name: 'MCI Connect',
          });
          console.log('✅ Receipt email sent to:', invoice.customer_email);
        }

      } catch (err) {
        await markIdempotencyFailed(base44, record.id, err.message);
        throw err;
      }

      return Response.json({ success: true, message: 'Payment processed successfully' });
    }

    console.log('ℹ️ Unhandled event type:', event.type);
    return Response.json({ received: true });

  } catch (error) {
    console.error('❌ Webhook processing failed:', error);
    return Response.json({ error: error.message, success: false }, { status: 500 });
  }
});