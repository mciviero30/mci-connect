import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@17.5.0';

/**
 * CREATE STRIPE SUBSCRIPTION FOR RECURRING INVOICES
 * Automates monthly billing for fixed contracts
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      console.error('❌ Unauthorized subscription creation');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recurring_invoice_id } = await req.json();

    if (!recurring_invoice_id) {
      return Response.json({ error: 'recurring_invoice_id required' }, { status: 400 });
    }

    // Get recurring invoice template
    const templates = await base44.asServiceRole.entities.RecurringInvoice.filter({ 
      id: recurring_invoice_id 
    });

    if (templates.length === 0) {
      return Response.json({ error: 'Template not found' }, { status: 404 });
    }

    const template = templates[0];

    // Validate can create subscription
    if (template.status !== 'active') {
      return Response.json({ error: 'Template must be active' }, { status: 400 });
    }

    if (!template.customer_email) {
      return Response.json({ error: 'Customer email required' }, { status: 400 });
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-12-18.acacia',
    });

    // Create or get Stripe customer
    let stripeCustomer;
    const existingCustomers = await stripe.customers.list({
      email: template.customer_email,
      limit: 1
    });

    if (existingCustomers.data.length > 0) {
      stripeCustomer = existingCustomers.data[0];
      console.log('✅ Using existing Stripe customer:', stripeCustomer.id);
    } else {
      stripeCustomer = await stripe.customers.create({
        email: template.customer_email,
        name: template.customer_name,
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          customer_id: template.customer_id || '',
        }
      });
      console.log('✅ Created new Stripe customer:', stripeCustomer.id);
    }

    // Create Stripe product for this recurring service
    const product = await stripe.products.create({
      name: template.template_name,
      description: `${template.job_name || 'Service'} - ${template.customer_name}`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        recurring_invoice_id: template.id,
      }
    });

    // Map frequency to Stripe interval
    const intervalMap = {
      weekly: 'week',
      biweekly: 'week',
      monthly: 'month',
      quarterly: 'month',
      yearly: 'year'
    };

    const intervalCountMap = {
      weekly: 1,
      biweekly: 2,
      monthly: 1,
      quarterly: 3,
      yearly: 1
    };

    const interval = intervalMap[template.frequency];
    const intervalCount = intervalCountMap[template.frequency];

    // Create Stripe price
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: Math.round(template.total * 100), // Convert to cents
      currency: 'usd',
      recurring: {
        interval: interval,
        interval_count: intervalCount,
      },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        recurring_invoice_id: template.id,
      }
    });

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: price.id }],
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        recurring_invoice_id: template.id,
        template_name: template.template_name,
      },
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Update template with Stripe subscription ID
    await base44.asServiceRole.entities.RecurringInvoice.update(template.id, {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: stripeCustomer.id,
      stripe_product_id: product.id,
      stripe_price_id: price.id,
    });

    console.log('✅ Subscription created:', subscription.id);

    // Get checkout URL for initial payment setup
    const invoice = subscription.latest_invoice;
    const paymentIntent = invoice.payment_intent;

    return Response.json({
      success: true,
      subscription_id: subscription.id,
      customer_id: stripeCustomer.id,
      checkout_url: invoice.hosted_invoice_url,
      payment_intent_client_secret: paymentIntent?.client_secret,
    });

  } catch (error) {
    console.error('❌ Subscription creation failed:', error);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});