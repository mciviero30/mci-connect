import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * W1 FIX: Auto-calculate Invoice balance field
 * 
 * Triggered on Invoice create/update
 * Ensures balance = total - amount_paid (always consistent)
 * Prevents manual calculation errors
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const invoice = data;
    
    // Skip if invoice is cancelled or deleted
    if (invoice.status === 'cancelled' || invoice.deleted_at) {
      return Response.json({ 
        success: true, 
        message: 'Cancelled/deleted invoice - skipping balance calculation' 
      });
    }

    // Calculate balance
    const total = invoice.total || 0;
    const amountPaid = invoice.amount_paid || 0;
    const calculatedBalance = total - amountPaid;

    // Update if different (avoid unnecessary writes)
    if (invoice.balance !== calculatedBalance) {
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        balance: calculatedBalance
      });

      console.log(`✅ Auto-calculated balance for ${invoice.invoice_number}: ${calculatedBalance} (total: ${total}, paid: ${amountPaid})`);
    }

    return Response.json({ 
      success: true,
      invoice_number: invoice.invoice_number,
      balance: calculatedBalance,
      total,
      amount_paid: amountPaid
    });

  } catch (error) {
    console.error('[Balance Calculation Error]', error.message);
    
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 });
  }
});