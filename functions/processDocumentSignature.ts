import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { 
      signature_id, 
      action, // 'sign' or 'decline'
      signature_data_url,
      decline_reason,
      signer_name,
      ip_address
    } = await req.json();

    if (!signature_id || !action) {
      return Response.json({ error: 'signature_id and action required' }, { status: 400 });
    }

    // Get signature request
    const requests = await base44.asServiceRole.entities.DocumentSignature.filter({ id: signature_id });
    if (requests.length === 0) {
      return Response.json({ error: 'Signature request not found' }, { status: 404 });
    }

    const signatureRequest = requests[0];

    if (signatureRequest.status !== 'pending' && signatureRequest.status !== 'viewed') {
      return Response.json({ error: 'Document already processed' }, { status: 400 });
    }

    // Check expiration
    if (new Date(signatureRequest.expires_at) < new Date()) {
      await base44.asServiceRole.entities.DocumentSignature.update(signature_id, {
        status: 'expired'
      });
      return Response.json({ error: 'Signature request has expired' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const userAgent = req.headers.get('user-agent') || 'unknown';

    if (action === 'sign') {
      if (!signature_data_url) {
        return Response.json({ error: 'Signature required' }, { status: 400 });
      }

      // Update signature request
      const auditTrail = signatureRequest.audit_trail || [];
      auditTrail.push({
        action: 'signed',
        timestamp: now,
        ip_address: ip_address || 'unknown'
      });

      await base44.asServiceRole.entities.DocumentSignature.update(signature_id, {
        status: 'signed',
        signature_data_url,
        signed_at: now,
        ip_address: ip_address || 'unknown',
        user_agent: userAgent,
        audit_trail: auditTrail
      });

      // Update the original document
      if (signatureRequest.document_type === 'quote') {
        await base44.asServiceRole.entities.Quote.update(signatureRequest.document_id, {
          status: 'approved',
          customer_signature: signature_data_url,
          signed_date: now
        });
      } else if (signatureRequest.document_type === 'change_order') {
        await base44.asServiceRole.entities.ChangeOrder.update(signatureRequest.document_id, {
          approval_status: 'approved',
          client_signature: signature_data_url,
          client_approval_date: now
        });
      } else if (signatureRequest.document_type === 'contract') {
        await base44.asServiceRole.entities.AgreementSignature.update(signatureRequest.document_id, {
          signature_data_url,
          signed_at: now,
          status: 'signed'
        });
      }

      // Notify requester
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: signatureRequest.requested_by_email || 'admin@mci-connect.com',
        subject: `Document Signed: ${signatureRequest.document_title}`,
        body: `${signer_name || signatureRequest.signer_name} has signed ${signatureRequest.document_title}.`,
        from_name: 'MCI Connect'
      });

      return Response.json({ success: true, message: 'Document signed successfully' });

    } else if (action === 'decline') {
      const auditTrail = signatureRequest.audit_trail || [];
      auditTrail.push({
        action: 'declined',
        timestamp: now,
        ip_address: ip_address || 'unknown'
      });

      await base44.asServiceRole.entities.DocumentSignature.update(signature_id, {
        status: 'declined',
        declined_at: now,
        decline_reason: decline_reason || 'No reason provided',
        audit_trail: auditTrail
      });

      // Notify requester
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: signatureRequest.requested_by_email || 'admin@mci-connect.com',
        subject: `Document Declined: ${signatureRequest.document_title}`,
        body: `${signer_name || signatureRequest.signer_name} has declined to sign ${signatureRequest.document_title}. Reason: ${decline_reason || 'Not specified'}`,
        from_name: 'MCI Connect'
      });

      return Response.json({ success: true, message: 'Decline recorded' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Process Signature Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});