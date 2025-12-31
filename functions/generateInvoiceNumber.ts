import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * THREAD-SAFE INVOICE NUMBER GENERATOR
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Call atomic counter service
    const counterResponse = await base44.asServiceRole.functions.invoke('getNextCounter', {
      counter_key: 'invoice_number'
    });

    if (!counterResponse?.value) {
      throw new Error('Failed to get next counter value');
    }

    const nextNumber = counterResponse.value;
    const formattedNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    if (import.meta.env?.DEV) {
      console.log('[InvoiceNumber] ✅ Thread-safe generated:', formattedNumber);
    }

    return Response.json({ invoice_number: formattedNumber });
  } catch (error) {
    if (import.meta.env?.DEV) {
      console.error('❌ Error generating invoice number:', error);
    }
    return Response.json({ error: 'Failed to generate invoice number' }, { status: 500 });
  }
});