import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COUNTER-BASED INVOICE NUMBER GENERATOR
 * Uses atomic counter for guaranteed sequential numbers
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use getNextCounter for atomic, thread-safe number generation
    const { data } = await base44.asServiceRole.functions.invoke('getNextCounter', {
      counter_name: 'invoice'
    });
    
    const nextNumber = data.next_value;
    const formattedNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    console.log(`✅ Generated invoice number: ${formattedNumber} (counter: ${nextNumber})`);
    
    return Response.json({ 
      invoice_number: formattedNumber,
      next_sequence: nextNumber
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating invoice number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});