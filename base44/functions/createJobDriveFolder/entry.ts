import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || (user.role !== 'admin' && user.role !== 'ceo')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { job_id, job_name } = await req.json();

    if (!job_id || !job_name) {
      return Response.json({ error: 'job_id and job_name required' }, { status: 400 });
    }

    // Get Google Drive access token (updated API)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

    if (!accessToken) {
      return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    // Create folder in Google Drive
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `${job_name} - ${job_id.slice(0, 8)}`,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Drive folder creation error:', error);
      return Response.json({ error: 'Failed to create folder', details: error }, { status: 500 });
    }

    const folder = await createResponse.json();

    // Make folder publicly accessible (view-only)
    await fetch(`https://www.googleapis.com/drive/v3/files/${folder.id}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' })
    });

    // Update job with folder info
    await base44.asServiceRole.entities.Job.update(job_id, {
      drive_folder_id: folder.id,
      drive_folder_url: `https://drive.google.com/drive/folders/${folder.id}`
    });

    return Response.json({
      success: true,
      folder_id: folder.id,
      folder_url: `https://drive.google.com/drive/folders/${folder.id}`
    });

  } catch (error) {
    console.error('Error creating Drive folder:', error);
    return Response.json({ error: 'Failed to create folder', details: error.message }, { status: 500 });
  }
});