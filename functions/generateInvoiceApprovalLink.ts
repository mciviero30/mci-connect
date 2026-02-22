import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * generateInvoiceApprovalLink
 * Generates a secure one-time approval token for a customer to approve an invoice via email link.
 * Stores the token on the invoice entity and returns the approval URL.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return Response.json({ error: 'invoiceId required' }, { status: 400 });
    }

    const invoice = await base44.entities.Invoice.get(invoiceId);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (!invoice.customer_email) {
      return Response.json({ error: 'Invoice has no customer email' }, { status: 400 });
    }

    // Generate a secure random token
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    // Store token on invoice (expires in 30 days)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await base44.entities.Invoice.update(invoiceId, {
      approval_token: token,
      approval_token_expires_at: expiresAt,
      approval_token_created_by: user.email
    });

    const appUrl = Deno.env.get('APP_URL') || '';
    const approvalUrl = `${appUrl}/page/InvoiceApproval?token=${token}&id=${invoiceId}`;

    // Send email to customer
    const items = Array.isArray(invoice.items) ? invoice.items : [];
    const itemsHtml = items.map(item =>
      `<tr>
        <td style="padding:8px;border-bottom:1px solid #eee;">${item.item_name || item.description || 'Item'}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:center;">${item.quantity || 0} ${item.unit || ''}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">$${(item.unit_price || 0).toFixed(2)}</td>
        <td style="padding:8px;border-bottom:1px solid #eee;text-align:right;font-weight:bold;">$${(item.total || 0).toFixed(2)}</td>
      </tr>`
    ).join('');

    await base44.integrations.Core.SendEmail({
      to: invoice.customer_email,
      from_name: 'MCI Connect — Invoice Approval',
      subject: `Invoice ${invoice.invoice_number} Ready for Approval — $${(invoice.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      body: `
Dear ${invoice.customer_name},

Your invoice is ready for review and approval.

<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
  <div style="background:#000;padding:20px;text-align:center;">
    <h2 style="color:white;margin:0;">Invoice ${invoice.invoice_number}</h2>
    <p style="color:#aaa;margin:5px 0;">For: ${invoice.job_name || invoice.customer_name}</p>
  </div>

  <div style="padding:20px;background:#f9f9f9;">
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="background:#333;color:white;">
          <th style="padding:10px;text-align:left;">Item</th>
          <th style="padding:10px;text-align:center;">Qty</th>
          <th style="padding:10px;text-align:right;">Rate</th>
          <th style="padding:10px;text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
    </table>

    <div style="margin-top:20px;text-align:right;">
      <p style="margin:5px 0;color:#666;">Subtotal: <strong>$${(invoice.subtotal || 0).toFixed(2)}</strong></p>
      ${invoice.tax_amount > 0 ? `<p style="margin:5px 0;color:#666;">Tax (${invoice.tax_rate || 0}%): <strong>$${(invoice.tax_amount || 0).toFixed(2)}</strong></p>` : ''}
      <p style="margin:10px 0;font-size:18px;font-weight:bold;color:#000;">Total: $${(invoice.total || 0).toFixed(2)}</p>
      ${invoice.due_date ? `<p style="color:#e53e3e;font-size:12px;">Due: ${invoice.due_date}</p>` : ''}
    </div>
  </div>

  <div style="padding:30px;text-align:center;background:#fff;">
    <a href="${approvalUrl}" style="display:inline-block;background:#16a34a;color:white;padding:16px 40px;border-radius:8px;text-decoration:none;font-size:18px;font-weight:bold;">
      ✅ Approve Invoice
    </a>
    <p style="color:#888;font-size:12px;margin-top:16px;">This link is valid for 30 days.</p>
  </div>
</div>

Thank you for your business!
Modern Components Installation
      `.trim()
    });

    console.log(`[generateInvoiceApprovalLink] Token generated for invoice ${invoiceId}, sent to ${invoice.customer_email}`);
    return Response.json({ success: true, approval_url: approvalUrl });

  } catch (error) {
    console.error('[generateInvoiceApprovalLink] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});