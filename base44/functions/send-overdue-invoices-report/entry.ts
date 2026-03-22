import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all invoices
    const allInvoices = await base44.asServiceRole.entities.Invoice.list();
    
    // Filter overdue invoices (sent/partial status, past due date, has balance)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const overdueInvoices = allInvoices.filter(invoice => {
      if (invoice.status !== 'sent' && invoice.status !== 'partial') return false;
      if (!invoice.due_date) return false;
      
      const dueDate = new Date(invoice.due_date);
      dueDate.setHours(0, 0, 0, 0);
      
      const balance = invoice.balance || invoice.total;
      return dueDate < today && balance > 0.01;
    });

    // Sort by days overdue (most overdue first)
    overdueInvoices.sort((a, b) => {
      const daysA = Math.floor((today - new Date(a.due_date)) / (1000 * 60 * 60 * 24));
      const daysB = Math.floor((today - new Date(b.due_date)) / (1000 * 60 * 60 * 24));
      return daysB - daysA;
    });

    if (overdueInvoices.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No overdue invoices',
        count: 0 
      });
    }

    // Calculate totals
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.balance || inv.total), 0);

    // Get admin users for email
    const allUsers = await base44.asServiceRole.entities.User.list();
    const adminUsers = allUsers.filter(u => u.role === 'admin' || u.position?.toLowerCase().includes('ceo'));

    if (adminUsers.length === 0) {
      return Response.json({ 
        success: false, 
        error: 'No admin users found' 
      });
    }

    // Build email HTML
    let invoiceRows = '';
    overdueInvoices.forEach(invoice => {
      const daysOverdue = Math.floor((today - new Date(invoice.due_date)) / (1000 * 60 * 60 * 24));
      const balance = invoice.balance || invoice.total;
      
      invoiceRows += `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 12px 8px; color: #1f2937;">${invoice.invoice_number}</td>
          <td style="padding: 12px 8px; color: #1f2937;">${invoice.customer_name}</td>
          <td style="padding: 12px 8px; color: #1f2937;">$${balance.toFixed(2)}</td>
          <td style="padding: 12px 8px; color: #dc2626; font-weight: 600;">${daysOverdue} días</td>
        </tr>
      `;
    });

    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
        <div style="max-width: 700px; margin: 0 auto; padding: 20px;">
          <div style="background: white; border-radius: 16px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1f2937; font-size: 28px; margin: 0 0 8px 0;">⚠️ Facturas Vencidas</h1>
              <p style="color: #6b7280; font-size: 16px; margin: 0;">Reporte Diario - ${today.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>

            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center;">
              <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Total Pendiente</p>
              <p style="color: white; font-size: 36px; font-weight: bold; margin: 0;">$${totalOverdue.toFixed(2)}</p>
              <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 8px 0 0 0;">${overdueInvoices.length} factura(s) vencida(s)</p>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <thead>
                <tr style="background: #f9fafb; border-bottom: 2px solid #e5e7eb;">
                  <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Factura</th>
                  <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Cliente</th>
                  <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Balance</th>
                  <th style="padding: 12px 8px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase;">Vencido</th>
                </tr>
              </thead>
              <tbody>
                ${invoiceRows}
              </tbody>
            </table>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>Recordatorio:</strong> Revisa estas facturas y contacta a los clientes para seguimiento de pago.
              </p>
            </div>

            <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${Deno.env.get('APP_URL')}/Facturas" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
                Ver Todas las Facturas
              </a>
            </div>
          </div>

          <div style="text-align: center; margin-top: 20px;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Este es un reporte automático de MCI Connect
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send email to all admins
    const emailPromises = adminUsers.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'MCI Connect - Cuentas por Cobrar',
        to: admin.email,
        subject: `⚠️ ${overdueInvoices.length} Factura(s) Vencida(s) - $${totalOverdue.toFixed(2)}`,
        body: emailHTML
      })
    );

    await Promise.all(emailPromises);

    return Response.json({
      success: true,
      message: `Report sent to ${adminUsers.length} admin(s)`,
      overdue_count: overdueInvoices.length,
      total_overdue: totalOverdue,
      recipients: adminUsers.map(u => u.email)
    });
  } catch (error) {
    console.error('Overdue report error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});