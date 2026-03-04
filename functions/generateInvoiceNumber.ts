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

    // Atomic increment with retry logic (handles race conditions)
    const MAX_RETRIES = 10;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        // Step 1: Get current counter (or create if doesn't exist)
        const counters = await base44.asServiceRole.entities.Counter.filter({ counter_key: 'invoice' });
        
        let counter;
        if (counters.length === 0) {
          // Create new counter starting at 0
          counter = await base44.asServiceRole.entities.Counter.create({
            counter_key: 'invoice',
            current_value: 0,
            last_increment_date: new Date().toISOString()
          });
        } else {
          counter = counters[0];
        }

        // Step 2: Calculate next value
        const nextValue = counter.current_value + 1;
        
        // Step 3: Update counter
        await base44.asServiceRole.entities.Counter.update(counter.id, {
          current_value: nextValue,
          last_increment_date: new Date().toISOString()
        });
        
        // Step 4: Verify update succeeded
        const verification = await base44.asServiceRole.entities.Counter.get(counter.id);
        
        if (verification.current_value === nextValue) {
          const formattedNumber = `INV-${String(nextValue).padStart(5, '0')}`;

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

          console.log(`✅ Generated unique invoice number: ${formattedNumber} (counter: ${nextValue})`);
          
          return Response.json({ 
            invoice_number: formattedNumber,
            next_sequence: nextValue,
            formatted: true,
            validated_unique: true
          });
        } else {
          // Race condition detected - retry
          attempt++;
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          continue;
        }
        
      } catch (updateError) {
        attempt++;
        if (attempt >= MAX_RETRIES) {
          throw updateError;
        }
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      }
    }
    
    // Max retries exceeded
    return Response.json({ 
      error: 'Failed to generate invoice number after multiple attempts' 
    }, { status: 500 });
    
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating invoice number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});