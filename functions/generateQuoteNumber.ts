import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INTELLIGENT QUOTE NUMBER GENERATOR
 * Finds the smallest available number (reuses deleted numbers)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all existing quotes (including deleted ones)
    const allQuotes = await base44.asServiceRole.entities.Quote.list();
    
    // Extract numbers from quote_number field (EST-00001, EST-00002, etc.)
    const usedNumbers = new Set();
    allQuotes.forEach(quote => {
      if (quote.quote_number) {
        const match = quote.quote_number.match(/EST-(\d+)/);
        if (match) {
          usedNumbers.add(parseInt(match[1], 10));
        }
      }
    });

    // Find the smallest available number
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    const formattedNumber = `EST-${String(nextNumber).padStart(5, '0')}`;

    // GUARDRAIL: Validate format before returning
    if (!/^EST-\d{5}$/.test(formattedNumber)) {
      throw new Error(`Format validation failed: ${formattedNumber}`);
    }

    console.log(`✅ Generated quote number: ${formattedNumber}`);
    
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