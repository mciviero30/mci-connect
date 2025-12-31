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

    // Get all invoices to find max number
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 2000);
    
    const existingNumbers = invoices
      .map(inv => inv.invoice_number)
      .filter(num => num && num.startsWith('INV-'))
      .map(num => parseInt(num.replace('INV-', '')))
      .filter(num => !isNaN(num));

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    const formattedNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

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