import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    const folderId = formData.get('folder_id');

    if (!file || !folderId) {
      return Response.json({ error: 'Missing file or folder_id' }, { status: 400 });
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Upload file metadata
    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,thumbnailLink',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Drive upload error: ${error}` }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({ 
      success: true,
      file: data
    });

  } catch (error) {
    console.error('Error uploading to Drive:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});