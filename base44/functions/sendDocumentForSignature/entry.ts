import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      document_type, 
      document_id, 
      signer_email, 
      signer_name,
      message_to_signer,
      expires_in_days = 30 
    } = await req.json();

    if (!document_type || !document_id || !signer_email) {
      return Response.json({ 
        error: 'document_type, document_id, and signer_email required' 
      }, { status: 400 });
    }

    // Fetch document details
    let document, document_title, job_id, pdf_url;

    if (document_type === 'quote') {
      const docs = await base44.entities.Quote.filter({ id: document_id });
      if (docs.length === 0) throw new Error('Quote not found');
      document = docs[0];
      document_title = `Quote ${document.quote_number}`;
      job_id = document.job_id;
    } else if (document_type === 'invoice') {
      const docs = await base44.entities.Invoice.filter({ id: document_id });
      if (docs.length === 0) throw new Error('Invoice not found');
      document = docs[0];
      document_title = `Invoice ${document.invoice_number}`;
      job_id = document.job_id;
    } else if (document_type === 'change_order') {
      const docs = await base44.entities.ChangeOrder.filter({ id: document_id });
      if (docs.length === 0) throw new Error('Change Order not found');
      document = docs[0];
      document_title = `Change Order ${document.change_order_number}`;
      job_id = document.job_id;
    } else if (document_type === 'contract') {
      const docs = await base44.entities.AgreementSignature.filter({ id: document_id });
      if (docs.length === 0) throw new Error('Contract not found');
      document = docs[0];
      document_title = document.agreement_name || 'Contract';
      job_id = document.job_id;
    }

    // Calculate expiration
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Create signature request
    const signatureRequest = await base44.entities.DocumentSignature.create({
      document_type,
      document_id,
      document_title,
      document_pdf_url: pdf_url,
      job_id,
      signer_email,
      signer_name: signer_name || signer_email,
      signer_role: 'client',
      status: 'pending',
      requested_by_user_id: user.id,
      requested_by_name: user.full_name,
      requested_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      message_to_signer: message_to_signer || '',
      audit_trail: [{
        action: 'sent',
        timestamp: new Date().toISOString(),
        ip_address: req.headers.get('x-forwarded-for') || 'unknown'
      }]
    });

    // Send email notification
    const appUrl = Deno.env.get('APP_URL') || 'https://your-app.base44.com';
    const signatureUrl = `${appUrl}/#/SignDocument?id=${signatureRequest.id}`;

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1E3A8A;">Signature Required</h2>
        <p>Dear ${signer_name || 'Client'},</p>
        <p>${user.full_name} has requested your signature on the following document:</p>
        
        <div style="background: #F3F4F6; padding: 16px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold; color: #374151;">${document_title}</p>
          ${message_to_signer ? `<p style="margin-top: 8px; color: #6B7280; font-size: 14px;">${message_to_signer}</p>` : ''}
        </div>

        <p style="margin: 24px 0;">
          <a href="${signatureUrl}" style="background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">
            Review & Sign Document
          </a>
        </p>

        <p style="color: #6B7280; font-size: 12px;">
          This signature request expires on ${format(expiresAt, 'MMMM dd, yyyy')}.
        </p>

        <p style="margin-top: 24px;">Thank you,<br><strong>MCI Connect Team</strong></p>
      </div>
    `;

    await base44.integrations.Core.SendEmail({
      to: signer_email,
      subject: `Signature Required: ${document_title}`,
      body: emailBody,
      from_name: 'MCI Connect'
    });

    return Response.json({ 
      success: true, 
      signature_request_id: signatureRequest.id,
      signature_url: signatureUrl,
      message: 'Signature request sent successfully'
    });

  } catch (error) {
    console.error('Send Document Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});