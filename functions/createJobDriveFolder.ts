import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    const { job_id, job_name } = await req.json();

    if (!job_id || !job_name) {
      return Response.json({ error: 'job_id and job_name required' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    if (!accessToken) {
      return Response.json({ error: 'Google Drive not connected' }, { status: 400 });
    }

    // Create folder in Google Drive
    const folderMetadata = {
      name: `${job_name} - ${job_id.slice(0, 8)}`,
      mimeType: 'application/vnd.google-apps.folder'
    };

    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(folderMetadata)
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
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
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone'
      })
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
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error creating Drive folder:', error);
    }
    return safeJsonError('Failed to create folder', 500, error.message);
  }
});