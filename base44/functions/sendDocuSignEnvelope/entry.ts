import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      document_id,
      document_type,
      signer_email,
      signer_name,
      document_pdf_url,
      document_title
    } = await req.json();

    if (!document_id || !document_type || !signer_email || !document_pdf_url) {
      return Response.json({ 
        error: 'document_id, document_type, signer_email, and document_pdf_url required' 
      }, { status: 400 });
    }

    // Get DocuSign credentials
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
    const userId = Deno.env.get('DOCUSIGN_USER_ID');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');
    const privateKey = Deno.env.get('DOCUSIGN_PRIVATE_KEY');

    if (!integrationKey || !userId || !accountId) {
      return Response.json({ 
        error: 'DocuSign not configured. Please set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, and DOCUSIGN_ACCOUNT_ID' 
      }, { status: 500 });
    }

    // Get OAuth token (using JWT Grant)
    const baseUrl = 'https://demo.docusign.net'; // Change to 'https://www.docusign.net' for production
    
    // For simplicity, using secret key authentication (production should use JWT)
    const authHeader = `Basic ${btoa(`${integrationKey}:${secretKey}`)}`;

    // Download PDF from URL
    const pdfResponse = await fetch(document_pdf_url);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = btoa(String.fromCharCode(...new Uint8Array(pdfBuffer)));

    // Create envelope
    const envelopeDefinition = {
      emailSubject: `Please sign: ${document_title}`,
      documents: [{
        documentBase64: pdfBase64,
        name: document_title,
        fileExtension: 'pdf',
        documentId: '1'
      }],
      recipients: {
        signers: [{
          email: signer_email,
          name: signer_name || signer_email,
          recipientId: '1',
          routingOrder: '1',
          tabs: {
            signHereTabs: [{
              anchorString: '/sn1/',
              anchorUnits: 'pixels',
              anchorXOffset: '20',
              anchorYOffset: '10',
              documentId: '1',
              pageNumber: '1',
              xPosition: '100',
              yPosition: '700'
            }]
          }
        }]
      },
      status: 'sent'
    };

    const envelopeResponse = await fetch(
      `${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envelopeDefinition)
      }
    );

    if (!envelopeResponse.ok) {
      const error = await envelopeResponse.text();
      console.error('DocuSign Error:', error);
      return Response.json({ error: 'Failed to create DocuSign envelope', details: error }, { status: 500 });
    }

    const envelope = await envelopeResponse.json();

    // Store in DocumentSignature entity
    await base44.entities.DocumentSignature.create({
      document_type,
      document_id,
      document_title,
      document_pdf_url,
      signer_email,
      signer_name: signer_name || signer_email,
      status: 'pending',
      requested_by_user_id: user.id,
      requested_by_name: user.full_name,
      requested_at: new Date().toISOString(),
      docusign_envelope_id: envelope.envelopeId,
      docusign_status: envelope.status,
      audit_trail: [{
        action: 'sent_via_docusign',
        timestamp: new Date().toISOString(),
        envelope_id: envelope.envelopeId
      }]
    });

    return Response.json({ 
      success: true, 
      envelope_id: envelope.envelopeId,
      status: envelope.status,
      message: 'Document sent via DocuSign successfully'
    });

  } catch (error) {
    console.error('DocuSign Send Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});