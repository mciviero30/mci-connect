import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INTELLIGENT INVOICE NUMBER GENERATOR
 * Finds the smallest available number (reuses deleted numbers)
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all existing invoices (including deleted ones)
    const allInvoices = await base44.asServiceRole.entities.Invoice.list();
    
    // Extract numbers from invoice_number field (INV-00001, INV-00002, etc.)
    const usedNumbers = new Set();
    allInvoices.forEach(invoice => {
      if (invoice.invoice_number) {
        const match = invoice.invoice_number.match(/INV-(\d+)/);
        if (match) {
          usedNumbers.add(parseInt(match[1], 10));
        }
      }
    });

    // Find the smallest available number
    let nextNumber = 1;
    while (usedNumbers.has(nextNumber)) {
      nextNumber++;
    }

    const formattedNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

    console.log(`✅ Generated invoice number: ${formattedNumber}`);
    
    return Response.json({ 
      invoice_number: formattedNumber,
      next_sequence: nextNumber
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('❌ Error generating invoice number:', error);
    return Response.json({ 
      error: 'Number generation failed',
      details: error.message 
    }, { status: 500 });
  }
});