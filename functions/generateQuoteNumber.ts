import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * ATOMIC QUOTE NUMBER GENERATOR - Thread-Safe
 * 
 * PHASE 2 FIX: Replaced gap-finding algorithm with atomic counter
 * Prevents race conditions and duplicate numbers
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use atomic counter for thread-safe number generation
    const { data } = await base44.asServiceRole.functions.invoke('getNextCounter', {
      counter_key: 'quote'
    });
    
    const nextNumber = data.value;
    const formattedNumber = `EST-${String(nextNumber).padStart(5, '0')}`;

    // GUARDRAIL: Validate format before returning
    if (!/^EST-\d{5}$/.test(formattedNumber)) {
      throw new Error(`Format validation failed: ${formattedNumber}`);
    }

    console.log(`✅ Generated quote number: ${formattedNumber} (atomic counter: ${nextNumber})`);
    
    return Response.json({ 
      quote_number: formattedNumber,
      next_sequence: nextNumber,
      formatted: true
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating quote number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});