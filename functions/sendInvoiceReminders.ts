import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SEND INVOICE REMINDERS (Scheduled Automation)
 * Runs daily at 9am
 * Sends friendly reminders for overdue invoices
 * Logic: Only if overdue > 7 days AND no reminder sent in last 7 days
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ADMIN CHECK: Only admins should trigger this automation
    const user = await base44.auth.me();
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // Get overdue invoices
    const allInvoices = await base44.asServiceRole.entities.Invoice.filter({
      status: { $in: ['sent', 'overdue', 'partial'] }
    });

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const invoice of allInvoices) {
      try {
        // Check if overdue
        if (!invoice.due_date) {
          skipped++;
          continue;
        }

        const dueDate = new Date(invoice.due_date);
        const daysOverdue = Math.floor((today - dueDate) / (1000 * 60 * 60 * 24));

        // Skip if not overdue enough
        if (daysOverdue < 7) {
          skipped++;
          continue;
        }

        // Skip if reminder sent recently
        if (invoice.last_reminder_sent) {
          const lastReminder = new Date(invoice.last_reminder_sent);
          if (lastReminder > sevenDaysAgo) {
            skipped++;
            continue;
          }
        }

        // Skip if no customer email
        if (!invoice.customer_email) {
          skipped++;
          continue;
        }

        const balance = invoice.balance || (invoice.total - (invoice.amount_paid || 0));

        // Send reminder email
        const emailBody = `Dear ${invoice.customer_name},

This is a friendly reminder that Invoice ${invoice.invoice_number} is currently ${daysOverdue} days past due.

Invoice Details:
- Invoice Number: ${invoice.invoice_number}
- Job: ${invoice.job_name}
- Amount Due: $${balance.toFixed(2)}
- Due Date: ${invoice.due_date}

Please submit payment at your earliest convenience. If you have any questions or concerns, please contact us.

Thank you for your business!

MCI Team`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: invoice.customer_email,
          subject: `Payment Reminder - Invoice ${invoice.invoice_number}`,
          body: emailBody,
          from_name: 'MCI Connect',
        });

        // Update reminder count and last sent date
        await base44.asServiceRole.entities.Invoice.update(invoice.id, {
          last_reminder_sent: today.toISOString(),
          reminder_count: (invoice.reminder_count || 0) + 1,
        });

        sent++;
        console.log(`✅ Reminder sent for invoice ${invoice.invoice_number}`);

      } catch (error) {
        console.error(`❌ Failed to send reminder for ${invoice.invoice_number}:`, error);
        errors.push({ invoice: invoice.invoice_number, error: error.message });
      }
    }

    return Response.json({
      success: true,
      reminders_sent: sent,
      skipped: skipped,
      errors: errors,
      total_checked: allInvoices.length,
    });

  } catch (error) {
    console.error('❌ Invoice reminders automation failed:', error);
    return Response.json({
      error: error.message,
      success: false,
    }, { status: 500 });
  }
});