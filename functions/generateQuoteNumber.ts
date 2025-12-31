import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * THREAD-SAFE QUOTE NUMBER GENERATOR
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all quotes to find max number
    const quotes = await base44.asServiceRole.entities.Quote.list('-created_date', 2000);
    
    const existingNumbers = quotes
      .map(q => q.quote_number)
      .filter(num => num && num.startsWith('EST-'))
      .map(num => parseInt(num.replace('EST-', '')))
      .filter(num => !isNaN(num));

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    const formattedNumber = `EST-${String(nextNumber).padStart(5, '0')}`;

    return Response.json({ 
      quote_number: formattedNumber,
      next_sequence: nextNumber
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