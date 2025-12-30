import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Generate next invoice number in sequence
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
    const invoices = await base44.asServiceRole.entities.Invoice.list('-created_date', 1000);
    
    // Extract existing numbers
    const existingNumbers = invoices
      .map(inv => inv.invoice_number)
      .filter(n => n && n.startsWith('INV-'))
      .map(n => {
        const num = n.replace('INV-', '');
        return parseInt(num);
      })
      .filter(n => !isNaN(n));

    // Find highest number
    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = maxNumber + 1;
    
    // Generate formatted number
    const invoice_number = `INV-${String(nextNumber).padStart(5, '0')}`;

    console.log('Generated invoice number:', invoice_number, 'from', existingNumbers.length, 'existing invoices');

    return Response.json({ 
      invoice_number,
      next_sequence: nextNumber
    });

  } catch (error) {
    console.error('Error generating invoice number:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});