import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await req.json();

    // Fetch invoice
    const invoice = await base44.entities.Invoice.get(invoiceId);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Calculate amount to charge (balance due)
    const amountDue = Math.max(0, (invoice.total || 0) - (invoice.amount_paid || 0));

    if (amountDue <= 0) {
      return Response.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `${invoice.customer_name} - ${invoice.job_name}`,
            },
            unit_amount: Math.round(amountDue * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get("APP_URL") || "https://your-app-url.com"}/VerFactura?id=${invoiceId}&payment=success`,
      cancel_url: `${Deno.env.get("APP_URL") || "https://your-app-url.com"}/VerFactura?id=${invoiceId}&payment=cancelled`,
      customer_email: invoice.customer_email,
      metadata: {
        base44_app_id: Deno.env.get("BASE44_APP_ID"),
        invoice_id: invoiceId,
        invoice_number: invoice.invoice_number,
      },
    });

    return Response.json({ 
      url: session.url,
      sessionId: session.id
    });

  } catch (error) {
    console.error('Stripe checkout error:', error);
    return Response.json({ 
      error: error.message || 'Failed to create checkout session' 
    }, { status: 500 });
  }
});