import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admin can do this
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all invoices
    const allInvoices = await base44.asServiceRole.entities.Invoice.list();

    // Find invoices with bad long numbers (not 5-digit format)
    const badInvoices = allInvoices.filter(inv => 
      inv.invoice_number && 
      inv.invoice_number.startsWith('INV-') && 
      !/^INV-\d{5}$/.test(inv.invoice_number)
    );

    console.log(`Found ${badInvoices.length} invoices with bad numbers`);

    // Find the max existing good INV- number (5-digit format)
    const goodNumbers = allInvoices
      .map(inv => inv.invoice_number)
      .filter(n => n && /^INV-\d{5}$/.test(n))
      .map(n => parseInt(n.replace('INV-', ''), 10))
      .filter(n => !isNaN(n));

    const maxNumber = goodNumbers.length > 0 ? Math.max(...goodNumbers) : 3;
    
    console.log(`Max good number: ${maxNumber}`);

    // Fix bad invoices
    const updates = [];
    for (let i = 0; i < badInvoices.length; i++) {
      const newNumber = `INV-${String(maxNumber + i + 1).padStart(5, '0')}`;
      const invoice = badInvoices[i];
      
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        invoice_number: newNumber
      });
      
      updates.push({
        id: invoice.id,
        old_number: invoice.invoice_number,
        new_number: newNumber
      });
    }

    console.log('Fixed invoices:', updates);

    return Response.json({
      success: true,
      fixed_count: updates.length,
      updates
    });
  } catch (error) {
    console.error('Error fixing invoice numbers:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});