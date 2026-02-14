import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get DocuSign credentials
    const integrationKey = Deno.env.get('DOCUSIGN_INTEGRATION_KEY');
    const secretKey = Deno.env.get('DOCUSIGN_SECRET_KEY');
    const accountId = Deno.env.get('DOCUSIGN_ACCOUNT_ID');

    if (!integrationKey || !accountId) {
      return Response.json({ 
        error: 'DocuSign not configured' 
      }, { status: 500 });
    }

    const baseUrl = 'https://demo.docusign.net';
    const authHeader = `Basic ${btoa(`${integrationKey}:${secretKey}`)}`;

    // Get all pending signatures with DocuSign envelopes
    const signatures = await base44.asServiceRole.entities.DocumentSignature.filter({
      status: 'pending'
    });

    const pendingDocuSign = signatures.filter(s => s.docusign_envelope_id);

    let updatedCount = 0;
    const updates = [];

    for (const signature of pendingDocuSign) {
      try {
        // Get envelope status from DocuSign
        const statusResponse = await fetch(
          `${baseUrl}/restapi/v2.1/accounts/${accountId}/envelopes/${signature.docusign_envelope_id}`,
          {
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/json'
            }
          }
        );

        if (statusResponse.ok) {
          const envelopeStatus = await statusResponse.json();

          // Update if status changed
          if (envelopeStatus.status === 'completed') {
            const auditTrail = signature.audit_trail || [];
            auditTrail.push({
              action: 'signed',
              timestamp: new Date().toISOString(),
              source: 'docusign'
            });

            await base44.asServiceRole.entities.DocumentSignature.update(signature.id, {
              status: 'signed',
              signed_at: envelopeStatus.completedDateTime,
              docusign_status: envelopeStatus.status,
              audit_trail: auditTrail
            });

            updatedCount++;
            updates.push({
              signature_id: signature.id,
              document: signature.document_title,
              status: 'signed'
            });
          } else if (envelopeStatus.status === 'declined') {
            await base44.asServiceRole.entities.DocumentSignature.update(signature.id, {
              status: 'declined',
              declined_at: new Date().toISOString(),
              docusign_status: envelopeStatus.status
            });

            updatedCount++;
            updates.push({
              signature_id: signature.id,
              document: signature.document_title,
              status: 'declined'
            });
          }
        }
      } catch (error) {
        console.error(`Error syncing envelope ${signature.docusign_envelope_id}:`, error);
      }
    }

    return Response.json({ 
      success: true, 
      checked: pendingDocuSign.length,
      updated: updatedCount,
      updates
    });

  } catch (error) {
    console.error('Sync DocuSign Status Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});