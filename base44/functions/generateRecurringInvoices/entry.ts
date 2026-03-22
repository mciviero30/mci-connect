import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Get all active recurring invoices due today or overdue
    const recurringInvoices = await base44.asServiceRole.entities.RecurringInvoice.filter({
      status: 'active'
    });

    const dueTemplates = recurringInvoices.filter(r => 
      r.next_invoice_date && r.next_invoice_date <= today
    );

    const results = {
      generated: [],
      sent: [],
      errors: []
    };

    for (const template of dueTemplates) {
      try {
        // Get next invoice number via SDK
        const counterRes = await base44.functions.invoke('getNextCounter', { counter_key: 'invoice_number' });
        const nextNum = counterRes.next_value;
        const invoiceNumber = `INV-${String(nextNum).padStart(5, '0')}`;

        // Calculate due date based on payment terms
        const invoiceDate = new Date();
        let dueDate = new Date(invoiceDate);
        
        if (template.payment_terms === 'net_15') {
          dueDate.setDate(dueDate.getDate() + 15);
        } else if (template.payment_terms === 'net_30') {
          dueDate.setDate(dueDate.getDate() + 30);
        } else if (template.payment_terms === 'net_45') {
          dueDate.setDate(dueDate.getDate() + 45);
        }

        // Create invoice from template
        const invoice = await base44.asServiceRole.entities.Invoice.create({
          invoice_number: invoiceNumber,
          customer_id: template.customer_id,
          customer_name: template.customer_name,
          customer_email: template.customer_email,
          job_id: template.job_id,
          job_name: template.job_name,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          items: template.items,
          subtotal: template.subtotal,
          tax_rate: template.tax_rate,
          tax_amount: template.tax_amount,
          total: template.total,
          notes: template.notes || `Auto-generated from recurring template: ${template.template_name}`,
          terms: template.terms,
          status: template.auto_send ? 'sent' : 'draft',
          created_by_user_id: user.id,
          balance: template.total,
          amount_paid: 0
        });

        results.generated.push({
          template_id: template.id,
          template_name: template.template_name,
          invoice_id: invoice.id,
          invoice_number: invoiceNumber
        });

        // Calculate next invoice date based on frequency
        const nextDate = new Date(template.next_invoice_date);
        
        if (template.frequency === 'weekly') {
          nextDate.setDate(nextDate.getDate() + 7);
        } else if (template.frequency === 'biweekly') {
          nextDate.setDate(nextDate.getDate() + 14);
        } else if (template.frequency === 'monthly') {
          nextDate.setMonth(nextDate.getMonth() + 1);
        } else if (template.frequency === 'quarterly') {
          nextDate.setMonth(nextDate.getMonth() + 3);
        } else if (template.frequency === 'yearly') {
          nextDate.setFullYear(nextDate.getFullYear() + 1);
        }

        // Check if we should pause (end_date reached)
        const shouldPause = template.end_date && nextDate.toISOString().split('T')[0] > template.end_date;

        // Update recurring invoice
        await base44.asServiceRole.entities.RecurringInvoice.update(template.id, {
          next_invoice_date: nextDate.toISOString().split('T')[0],
          last_generated_date: today,
          invoices_generated: template.invoices_generated + 1,
          last_invoice_id: invoice.id,
          status: shouldPause ? 'completed' : 'active'
        });

        // Auto-send if enabled
        if (template.auto_send && template.customer_email) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: template.customer_email,
              subject: `Invoice ${invoiceNumber} - ${template.template_name}`,
              body: `Dear ${template.customer_name},

Your recurring invoice is ready.

Invoice Number: ${invoiceNumber}
Amount: $${template.total.toFixed(2)}
Due Date: ${dueDate.toLocaleDateString()}

${template.notes || ''}

Thank you for your business!`
            });

            results.sent.push(invoiceNumber);
          } catch (emailError) {
            console.error('Email send failed:', emailError);
          }
        }

      } catch (error) {
        console.error('Template generation error:', error);
        results.errors.push({
          template_id: template.id,
          template_name: template.template_name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results,
      total_processed: dueTemplates.length
    });

  } catch (error) {
    console.error('Recurring invoices error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});