import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@17.5.0';

/**
 * CREATE STRIPE CHECKOUT SESSION
 * Generates a Stripe payment link for invoices
 * Security: Any authenticated user can pay their own invoices
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('❌ Unauthorized payment attempt');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    if (!invoice_id) {
      console.error('❌ Missing invoice_id');
      return Response.json({ error: 'invoice_id required' }, { status: 400 });
    }

    // Get invoice
    const invoices = await base44.asServiceRole.entities.Invoice.filter({ id: invoice_id });
    if (invoices.length === 0) {
      console.error('❌ Invoice not found:', invoice_id);
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const invoice = invoices[0];

    // Validate invoice can be paid
    if (invoice.status === 'paid') {
      console.error('❌ Invoice already paid:', invoice_id);
      return Response.json({ error: 'Invoice already paid' }, { status: 400 });
    }

    if (!['sent', 'overdue', 'partial'].includes(invoice.status)) {
      console.error('❌ Invalid invoice status:', invoice.status);
      return Response.json({ error: 'Invoice cannot be paid in current status' }, { status: 400 });
    }

    // Calculate amount to charge (balance remaining)
    const amountDue = invoice.balance || (invoice.total - (invoice.amount_paid || 0));
    
    if (amountDue <= 0) {
      console.error('❌ No balance due:', invoice_id);
      return Response.json({ error: 'No balance due' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia',
    });

    // Get app URL for return URLs
    const appUrl = req.headers.get('origin') || Deno.env.get('APP_URL') || 'https://your-app.base44.com';

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice ${invoice.invoice_number}`,
              description: `Payment for ${invoice.job_name} - ${invoice.customer_name}`,
            },
            unit_amount: Math.round(amountDue * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      customer_email: invoice.customer_email || undefined,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        paid_by_user: user.email,
      },
      success_url: `${appUrl}/?payment=success&invoice_id=${invoice.id}`,
      cancel_url: `${appUrl}/?payment=cancelled&invoice_id=${invoice.id}`,
    });

    console.log('✅ Checkout session created:', session.id);

    return Response.json({
      success: true,
      checkout_url: session.url,
      session_id: session.id,
    });

  } catch (error) {
    console.error('❌ Create checkout failed:', error);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});