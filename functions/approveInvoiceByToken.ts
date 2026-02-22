import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * approveInvoiceByToken
 * Public endpoint — no auth required.
 * Validates the token and marks the invoice as customer-approved.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, invoiceId } = await req.json();

    if (!token || !invoiceId) {
      return Response.json({ error: 'token and invoiceId required' }, { status: 400 });
    }

    const invoice = await base44.asServiceRole.entities.Invoice.get(invoiceId);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Validate token
    if (!invoice.approval_token || invoice.approval_token !== token) {
      return Response.json({ error: 'Invalid or expired approval link' }, { status: 403 });
    }

    // Check expiration
    if (invoice.approval_token_expires_at) {
      const expiresAt = new Date(invoice.approval_token_expires_at);
      if (new Date() > expiresAt) {
        return Response.json({ error: 'Approval link has expired. Please contact MCI for a new link.' }, { status: 410 });
      }
    }

    // Already approved?
    if (invoice.customer_approved_at) {
      return Response.json({ 
        success: true, 
        already_approved: true,
        message: 'Invoice was already approved.',
        invoice_number: invoice.invoice_number,
        customer_name: invoice.customer_name,
        total: invoice.total
      });
    }

    // Mark invoice as customer-approved
    await base44.asServiceRole.entities.Invoice.update(invoiceId, {
      customer_approved_at: new Date().toISOString(),
      customer_approved: true,
      approval_status: 'approved',
      // Clear the token so it can't be reused
      approval_token: null
    });

    // Notify admins
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of admins) {
      if (!admin.email) continue;
      await base44.asServiceRole.entities.Notification.create({
        recipient_email: admin.email,
        recipient_name: admin.full_name || 'Admin',
        title: `✅ Invoice Approved by Customer: ${invoice.invoice_number}`,
        message: `${invoice.customer_name} has approved invoice ${invoice.invoice_number} for $${(invoice.total || 0).toLocaleString()}.`,
        type: 'invoice_customer_approved',
        priority: 'high',
        link: `/page/VerFactura?id=${invoiceId}`,
        related_entity_id: invoiceId,
        related_entity_type: 'invoice',
        read: false
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        from_name: 'MCI Connect — Invoice Approved',
        subject: `✅ Customer Approved: ${invoice.invoice_number}`,
        body: `
Hi ${admin.full_name || 'Admin'},

Great news! ${invoice.customer_name} has approved invoice ${invoice.invoice_number}.

• Invoice: ${invoice.invoice_number}
• Job: ${invoice.job_name || 'N/A'}
• Total: $${(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
• Approved at: ${new Date().toLocaleString()}

${Deno.env.get('APP_URL') || ''}/page/VerFactura?id=${invoiceId}

— MCI Connect
        `.trim()
      });
    }

    console.log(`[approveInvoiceByToken] Invoice ${invoiceId} approved by ${invoice.customer_name}`);
    return Response.json({ 
      success: true,
      message: 'Invoice approved successfully!',
      invoice_number: invoice.invoice_number,
      customer_name: invoice.customer_name,
      job_name: invoice.job_name,
      total: invoice.total
    });

  } catch (error) {
    console.error('[approveInvoiceByToken] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});