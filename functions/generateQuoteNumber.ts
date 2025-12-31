import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

/**
 * THREAD-SAFE QUOTE NUMBER GENERATOR
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    // Call atomic counter service
    const counterResponse = await base44.asServiceRole.functions.invoke('getNextCounter', {
      counter_key: 'quote_number'
    });

    if (!counterResponse?.value) {
      throw new Error('Failed to get next counter value');
    }

    const nextNumber = counterResponse.value;
    const formattedNumber = `EST-${String(nextNumber).padStart(5, '0')}`;

    if (import.meta.env?.DEV) {
      console.log('[QuoteNumber] ✅ Thread-safe generated:', formattedNumber);
    }

    return Response.json({ 
      quote_number: formattedNumber,
      next_sequence: nextNumber
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('❌ Error generating quote number:', error);
    }
    return safeJsonError('Number generation failed', 500, error.message);
  }
});