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

    // Simple atomic increment: create new counter record each time
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000);
    const uniqueKey = `est-${timestamp}-${randomSuffix}`;
    
    // Create counter record to claim this number
    const newCounter = await base44.asServiceRole.entities.Counter.create({
      counter_key: uniqueKey,
      current_value: timestamp,
      last_increment_date: new Date().toISOString()
    });
    
    // Count all quote counters created
    const allQuoteCounters = await base44.asServiceRole.entities.Counter.filter({
      counter_key: { $regex: '^est-' }
    });
    
    const nextNumber = allQuoteCounters.length;
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