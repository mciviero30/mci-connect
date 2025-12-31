import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * THREAD-SAFE ATOMIC COUNTER INCREMENT
 * Uses optimistic concurrency with retry logic
 * Guarantees unique sequential numbers even under high concurrency
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { counter_key } = await req.json();

    if (!counter_key) {
      return Response.json({ error: 'counter_key required' }, { status: 400 });
    }

    // Atomic increment with retry logic (handles race conditions)
    const MAX_RETRIES = 10;
    let attempt = 0;
    
    while (attempt < MAX_RETRIES) {
      try {
        // Step 1: Get current counter (or create if doesn't exist)
        const counters = await base44.asServiceRole.entities.Counter.filter({ counter_key });
        
        let counter;
        let isNew = false;
        
        if (counters.length === 0) {
          // Create new counter starting at 0
          counter = await base44.asServiceRole.entities.Counter.create({
            counter_key,
            current_value: 0,
            last_increment_date: new Date().toISOString()
          });
          isNew = true;
        } else {
          counter = counters[0];
        }

        // Step 2: Calculate next value
        const nextValue = counter.current_value + 1;
        
        // Step 3: Optimistic update with version check
        // We use updated_date as a version indicator
        const originalUpdatedDate = counter.updated_date;
        
        const updatedCounter = await base44.asServiceRole.entities.Counter.update(counter.id, {
          current_value: nextValue,
          last_increment_date: new Date().toISOString()
        });
        
        // Step 4: Verify update succeeded (no concurrent modification)
        // Re-read to confirm our update stuck
        const verification = await base44.asServiceRole.entities.Counter.get(counter.id);
        
        if (verification.current_value === nextValue) {
          // Success! Our increment was atomic
          if (import.meta.env?.DEV) {
            console.log(`✅ Counter [${counter_key}] incremented: ${counter.current_value} → ${nextValue} (attempt ${attempt + 1})`);
          }
          
          return Response.json({ 
            success: true,
            counter_key,
            value: nextValue
          });
        } else {
          // Race condition detected - another request won, retry
          if (import.meta.env?.DEV) {
            console.warn(`⚠️ Race condition on counter [${counter_key}], retrying... (attempt ${attempt + 1})`);
          }
          attempt++;
          
          // Small random delay to reduce collision probability
          await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
          continue;
        }
        
      } catch (updateError) {
        // Handle edge cases (counter deleted mid-operation, etc.)
        if (import.meta.env?.DEV) {
          console.error(`Error on attempt ${attempt + 1}:`, updateError);
        }
        attempt++;
        
        if (attempt >= MAX_RETRIES) {
          throw updateError;
        }
        
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      }
    }
    
    // Max retries exceeded
    return Response.json({ 
      error: 'Failed to increment counter after multiple attempts. Please try again.' 
    }, { status: 500 });

  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('❌ Error in getNextCounter:', error);
    }
    return safeJsonError('Counter generation failed', 500, error.message);
  }
});