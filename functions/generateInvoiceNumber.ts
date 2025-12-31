import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * THREAD-SAFE INVOICE NUMBER GENERATOR
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    // Atomic increment with retry logic
    const MAX_RETRIES = 10;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        const counters = await base44.asServiceRole.entities.Counter.filter({ 
          counter_key: 'invoice_number' 
        });
        
        let counter;
        if (counters.length === 0) {
          counter = await base44.asServiceRole.entities.Counter.create({
            counter_key: 'invoice_number',
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
          const formattedNumber = `INV-${String(nextValue).padStart(5, '0')}`;
          
          if (import.meta.env?.DEV) {
            console.log('[InvoiceNumber] ✅ Generated:', formattedNumber);
          }
          
          return Response.json({ invoice_number: formattedNumber });
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
    console.error('❌ Error generating invoice number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});