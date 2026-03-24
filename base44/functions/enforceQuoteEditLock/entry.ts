import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * QUOTE EDIT LOCK ENFORCEMENT
 * 
 * PHASE 5: Prevent editing quotes after sent/approved
 * 
 * Triggered on Quote.update()
 * Blocks changes to critical fields if quote is locked
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    if (event.type !== 'update' || event.entity_name !== 'Quote') {
      return Response.json({ success: true, message: 'Not a quote update' });
    }

    const quote = data;
    const oldQuote = old_data;

    // Check if quote is locked (sent or approved status)
    const isLocked = oldQuote?.status === 'sent' || 
                     oldQuote?.status === 'approved' ||
                     oldQuote?.status === 'converted_to_invoice';

    if (!isLocked) {
      return Response.json({ success: true, message: 'Quote not locked' });
    }

    // Define protected fields (cannot change when locked)
    const protectedFields = ['items', 'subtotal', 'tax_rate', 'tax_amount', 'total'];
    
    // Check if any protected field changed
    const changedProtectedFields = protectedFields.filter(field => {
      const oldValue = JSON.stringify(oldQuote[field]);
      const newValue = JSON.stringify(quote[field]);
      return oldValue !== newValue;
    });

    if (changedProtectedFields.length > 0) {
      console.error('[QUOTE EDIT LOCK] 🚫 Blocked edit to locked quote', {
        quote_id: quote.id,
        quote_number: quote.quote_number,
        status: oldQuote.status,
        changed_fields: changedProtectedFields
      });

      return Response.json({
        success: false,
        error: 'QUOTE_LOCKED',
        message: `Cannot edit ${changedProtectedFields.join(', ')} - quote is ${oldQuote.status}`,
        locked_fields: protectedFields,
        changed_fields: changedProtectedFields,
        resolution: 'Create a new version of the quote instead'
      }, { status: 400 });
    }

    // Allow non-financial changes (notes, internal fields)
    return Response.json({
      success: true,
      message: 'Non-financial changes allowed'
    });

  } catch (error) {
    console.error('[QUOTE EDIT LOCK] Error:', error.message);
    return Response.json({ error: error.message }, { status: 200 });
  }
});