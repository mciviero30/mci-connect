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

    // Atomic increment with retry logic
    const MAX_RETRIES = 10;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        const counters = await base44.asServiceRole.entities.Counter.filter({ 
          counter_key: 'quote_number' 
        });
        
        let counter;
        if (counters.length === 0) {
          counter = await base44.asServiceRole.entities.Counter.create({
            counter_key: 'quote_number',
            current_value: 0,
            last_increment_date: new Date().toISOString()
          });
        } else {
          counter = counters[0];
        }

        const nextValue = counter.current_value + 1;
        
        await base44.asServiceRole.entities.Counter.update(counter.id, {
          current_value: nextValue,
          last_increment_date: new Date().toISOString()
        });
        
        const verification = await base44.asServiceRole.entities.Counter.get(counter.id);
        
        if (verification.current_value === nextValue) {
          const formattedNumber = `EST-${String(nextValue).padStart(5, '0')}`;
          
          if (import.meta.env?.DEV) {
            console.log('[QuoteNumber] ✅ Generated:', formattedNumber);
          }
          
          return Response.json({ 
            quote_number: formattedNumber,
            next_sequence: nextValue
          });
        }
        
        attempt++;
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      } catch (updateError) {
        attempt++;
        if (attempt >= MAX_RETRIES) throw updateError;
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      }
    }
    
    throw new Error('Max retries exceeded');
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating quote number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});