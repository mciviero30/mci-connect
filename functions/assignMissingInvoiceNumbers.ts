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

    // Find the max existing INV- number
    const existingNumbers = allInvoices
      .map(inv => inv.invoice_number)
      .filter(n => n && n.startsWith('INV-'))
      .map(n => parseInt(n.replace('INV-', ''), 10))
      .filter(n => !isNaN(n));

    const maxNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;

    // Find invoices with no number (DRAFT or empty)
    const invoicesNeedingNumbers = allInvoices.filter(inv => 
      !inv.invoice_number || inv.invoice_number === 'DRAFT'
    );

    console.log(`Found ${invoicesNeedingNumbers.length} invoices needing numbers, max current: ${maxNumber}`);

    // Assign numbers sequentially
    const updates = [];
    for (let i = 0; i < invoicesNeedingNumbers.length; i++) {
      const newNumber = `INV-${String(maxNumber + i + 1).padStart(5, '0')}`;
      const invoice = invoicesNeedingNumbers[i];
      
      await base44.asServiceRole.entities.Invoice.update(invoice.id, {
        invoice_number: newNumber
      });
      
      updates.push({
        id: invoice.id,
        old_number: invoice.invoice_number,
        new_number: newNumber
      });
    }

    console.log('Updated invoices:', updates);

    return Response.json({
      success: true,
      updated_count: updates.length,
      updates
    });
  } catch (error) {
    console.error('Error assigning invoice numbers:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});