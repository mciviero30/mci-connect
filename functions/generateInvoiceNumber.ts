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
      counter_key: 'invoice'
    });
    
    const nextNumber = data.value;
    const formattedNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    // GUARDRAIL: Validate format before returning
    if (!/^INV-\d{5}$/.test(formattedNumber)) {
      throw new Error(`Format validation failed: ${formattedNumber}`);
    }

    // B3 FIX: Check for existing invoice with this number (race condition safety)
    const existing = await base44.asServiceRole.entities.Invoice.filter({ 
      invoice_number: formattedNumber 
    });
    
    if (existing.length > 0) {
      console.error(`❌ COLLISION DETECTED: Invoice number ${formattedNumber} already exists (id: ${existing[0].id})`);
      throw new Error(`Invoice number ${formattedNumber} already exists. Retry generation.`);
    }

    console.log(`✅ Generated unique invoice number: ${formattedNumber} (counter: ${nextNumber})`);
    
    return Response.json({ 
      invoice_number: formattedNumber,
      next_sequence: nextNumber,
      formatted: true,
      validated_unique: true
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