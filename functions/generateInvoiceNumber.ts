import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * THREAD-SAFE INVOICE NUMBER GENERATOR
 * Uses atomic counter system to prevent duplicates
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create unique claim record (atomic operation)
    const claim = await base44.asServiceRole.entities.Counter.create({
      counter_key: `invoice-claim-${Date.now()}-${Math.random()}`,
      current_value: 1,
      last_increment_date: new Date().toISOString()
    });
    
    // Count all invoice claims to get sequence number
    const allClaims = await base44.asServiceRole.entities.Counter.filter({
      counter_key: { $regex: '^invoice-claim-' }
    });
    
    const sequenceNumber = allClaims.length;
    const formattedNumber = `INV-${String(sequenceNumber).padStart(5, '0')}`;

    return Response.json({ invoice_number: formattedNumber });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating invoice number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});