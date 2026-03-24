import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create' || event.entity_name !== 'Transaction') {
      return Response.json({ status: 'ignored' });
    }

    const reject = (message) => {
      console.error('❌ Transaction create rejected:', message);
      return new Response(JSON.stringify({ error: message }), { status: 400 });
    };

    // Rule 1: Amount validation
    if (
      data.amount === undefined ||
      data.amount === null ||
      typeof data.amount !== 'number' ||
      data.amount <= 0 ||
      !Number.isFinite(data.amount) ||
      Math.round(data.amount * 100) !== data.amount * 100
    ) {
      return reject('Invalid amount. Must be greater than 0 and have max 2 decimals.');
    }

    // Rule 2: Type validation
    if (!['income', 'expense'].includes(data.type)) {
      return reject('Invalid transaction type.');
    }

    // Rule 3: Category consistency
    const incomeCategories = ['sales', 'services', 'other_income'];
    const expenseCategories = [
      'salaries', 'rent', 'utilities', 'supplies',
      'marketing', 'taxes', 'insurance', 'maintenance', 'other_expense'
    ];

    if (
      (data.type === 'income' && !incomeCategories.includes(data.category)) ||
      (data.type === 'expense' && !expenseCategories.includes(data.category))
    ) {
      return reject('Category does not match transaction type.');
    }

    // Rule 4: Stripe uniqueness
    if (data.stripe_payment_intent_id) {
      const existing = await base44.asServiceRole.entities.Transaction.filter({
        stripe_payment_intent_id: data.stripe_payment_intent_id
      });

      if (existing.length > 0) {
        return reject('Duplicate Stripe payment detected.');
      }
    }

    // Rule 5: Plaid uniqueness
    if (data.plaid_transaction_id) {
      const existing = await base44.asServiceRole.entities.Transaction.filter({
        plaid_transaction_id: data.plaid_transaction_id
      });

      if (existing.length > 0) {
        return reject('Duplicate Plaid transaction detected.');
      }
    }

    // Rule 6: Date validation
    if (!data.date) {
      return reject('Date is required.');
    }

    const parsedDate = new Date(data.date);
    if (isNaN(parsedDate.getTime())) {
      return reject('Invalid date format.');
    }

    const oneYearAhead = new Date();
    oneYearAhead.setFullYear(oneYearAhead.getFullYear() + 1);

    if (parsedDate > oneYearAhead) {
      return reject('Date is too far in the future.');
    }

    console.log('✅ Transaction create validated successfully');
    return Response.json({ status: 'create_allowed' });

  } catch (error) {
    console.error('❌ Create validation error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});