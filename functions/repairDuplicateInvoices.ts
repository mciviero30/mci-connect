import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REPAIR: Duplicate Invoice Numbers
 * 
 * Resolves duplicate invoice numbers (INV-00008, INV-00009, INV-00010)
 * by reassigning unique numbers to duplicates.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all invoices
    const invoices = await base44.asServiceRole.entities.Invoice.list();

    // Find duplicates
    const numberMap = new Map();
    invoices.forEach(inv => {
      if (inv.invoice_number) {
        if (!numberMap.has(inv.invoice_number)) {
          numberMap.set(inv.invoice_number, []);
        }
        numberMap.get(inv.invoice_number).push(inv);
      }
    });

    const duplicates = Array.from(numberMap.entries())
      .filter(([_, invs]) => invs.length > 1);

    const results = {
      duplicates_found: duplicates.length,
      fixed: 0,
      errors: []
    };

    // Get current max invoice number
    let maxNumber = 0;
    invoices.forEach(inv => {
      if (inv.invoice_number) {
        const match = inv.invoice_number.match(/INV-(\d+)/);
        if (match) {
          maxNumber = Math.max(maxNumber, parseInt(match[1]));
        }
      }
    });

    // Fix duplicates (keep oldest, reassign newer ones)
    for (const [dupNumber, dupInvoices] of duplicates) {
      // Sort by created_date, keep first one
      dupInvoices.sort((a, b) => 
        new Date(a.created_date) - new Date(b.created_date)
      );

      // Reassign duplicates (skip first)
      for (let i = 1; i < dupInvoices.length; i++) {
        try {
          maxNumber++;
          const newNumber = `INV-${String(maxNumber).padStart(5, '0')}`;
          
          await base44.asServiceRole.entities.Invoice.update(dupInvoices[i].id, {
            invoice_number: newNumber
          });

          results.fixed++;
        } catch (error) {
          results.errors.push({
            invoice_id: dupInvoices[i].id,
            old_number: dupNumber,
            error: error.message
          });
        }
      }
    }

    return Response.json({
      success: true,
      message: `Fixed ${results.fixed} duplicate invoices`,
      results
    });

  } catch (error) {
    console.error('Repair failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});