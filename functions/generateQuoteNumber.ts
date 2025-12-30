import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate next quote number in sequence
 * Thread-safe using service role + created_date ordering
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to avoid race conditions
    const quotes = await base44.asServiceRole.entities.Quote.list('-created_date', 1000);
    
    // Extract existing numbers
    const existingNumbers = quotes
      .map(q => q.quote_number)
      .filter(n => n && n.startsWith('EST-'))
      .map(n => {
        const num = n.replace('EST-', '');
        return parseInt(num);
      })
      .filter(n => !isNaN(n));

    // Find highest number
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Generate formatted number
    const quote_number = `EST-${String(nextNumber).padStart(5, '0')}`;

    console.log('Generated quote number:', quote_number, 'from', existingNumbers.length, 'existing quotes');

    return Response.json({ 
      quote_number,
      next_sequence: nextNumber
    });

  } catch (error) {
    console.error('Error generating quote number:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});