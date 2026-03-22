import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_base64, filename, mime_type } = await req.json();

    if (!file_base64) {
      return Response.json({ error: 'No file data provided' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    const boundary = 'mci_receipt_boundary_abc123';
    const metadata = JSON.stringify({
      name: filename || `receipt_${Date.now()}.jpg`,
      mimeType: mime_type || 'image/jpeg'
    });

    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      metadata,
      `--${boundary}`,
      `Content-Type: ${mime_type || 'image/jpeg'}`,
      'Content-Transfer-Encoding: base64',
      '',
      file_base64,
      `--${boundary}--`
    ].join('\r\n');

    const uploadResponse = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text();
      console.error('Drive upload error:', errText);
      throw new Error(`Drive upload failed: ${uploadResponse.status} - ${errText}`);
    }

    const driveFile = await uploadResponse.json();
    console.log('Receipt uploaded to Drive:', driveFile.id);

    // Make file publicly readable (anyone with link can view)
    const permResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: 'reader', type: 'anyone' })
      }
    );

    if (!permResponse.ok) {
      console.warn('Could not make file public:', await permResponse.text());
    }

    const file_url = `https://drive.google.com/uc?id=${driveFile.id}&export=view`;

    return Response.json({ file_url });
  } catch (error) {
    console.error('uploadReceiptToDrive error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});