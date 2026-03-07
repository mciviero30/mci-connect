import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all overdue invoices
    const today = new Date().toISOString().split('T')[0];
    const invoices = await base44.asServiceRole.entities.Invoice.filter({
      status: 'sent',
      deleted_at: null
    });

    const overdueInvoices = invoices.filter(inv => {
      return inv.due_date && inv.due_date < today;
    });

    if (overdueInvoices.length === 0) {
      return Response.json({ message: 'No overdue invoices', sent: 0 });
    }

    let sentCount = 0;

    // Send SMS to customers with overdue invoices
    for (const invoice of overdueInvoices) {
      if (!invoice.customer_phone) continue;

      const daysOverdue = Math.floor((new Date() - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
      
      const message = `MCI: Invoice #${invoice.invoice_number} is ${daysOverdue} days overdue. Amount: $${invoice.balance?.toFixed(2) || invoice.total?.toFixed(2)}. Please contact us to arrange payment.`;

      try {
        await base44.asServiceRole.functions.invoke('sendSMS', {
          to: invoice.customer_phone,
          message: message
        });
        sentCount++;
      } catch (error) {
        console.error(`Failed to send SMS for invoice ${invoice.invoice_number}:`, error);
      }
    }

    return Response.json({ 
      message: `Sent ${sentCount} overdue invoice reminders`,
      overdueCount: overdueInvoices.length,
      sent: sentCount
    });

  } catch (error) {
    console.error('Overdue invoice reminder error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});