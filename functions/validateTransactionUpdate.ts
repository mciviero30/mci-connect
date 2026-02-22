import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, old_data, data } = await req.json();

    if (event.type !== 'update' || event.entity_name !== 'Transaction') {
      return Response.json({ status: 'ignored' });
    }

    const newData = data;

    const reject = (message) => {
      console.error('❌ Transaction update rejected:', message);
      return new Response(JSON.stringify({ error: message }), { status: 400 });
    };

    // Rule 1: Financial Fields - NEVER editable
    const immutableFields = [
      'amount',
      'type',
      'date',
      'stripe_payment_intent_id',
      'plaid_transaction_id',
      'bank_account_id'
    ];

    for (const field of immutableFields) {
      if (old_data[field] !== newData[field]) {
        return reject(`Field "${field}" is immutable and cannot be modified.`);
      }
    }

    // Rule 2: Category restriction after reconciliation
    if (
      old_data.reconciliation_status !== 'unreconciled' &&
      old_data.category !== newData.category
    ) {
      return reject('Cannot modify category after reconciliation has started.');
    }

    // Rule 3: Reconciliation status transition rules
    const allowedTransitions = {
      unreconciled: ['matched'],
      matched: ['reviewed'],
      reviewed: []
    };

    if (
      old_data.reconciliation_status !== newData.reconciliation_status
    ) {
      if (
        !allowedTransitions[old_data.reconciliation_status]?.includes(
          newData.reconciliation_status
        )
      ) {
        return reject('Invalid reconciliation status transition.');
      }
    }

    console.log('✅ Transaction update validated successfully:', event.entity_id);
    return Response.json({ status: 'update_allowed' });

  } catch (error) {
    console.error('❌ Update validation error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});