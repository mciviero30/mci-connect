import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folder_id, job_id } = await req.json();

    if (!folder_id) {
      return Response.json({ error: 'Missing folder_id' }, { status: 400 });
    }
    
    // Verify user has access to the job associated with this folder
    if (job_id) {
      const job = await base44.entities.Job.get(job_id);
      if (job) {
        const isAdmin = user.role === 'admin' || user.position === 'CEO' || user.position === 'administrator';
        const isAssigned = job.assigned_team_field?.includes(user.email);
        
        if (!isAdmin && !isAssigned) {
          return Response.json({ error: 'Forbidden: No access to this job' }, { status: 403 });
        }
      }
    }

    // Get Google Drive access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // List files in folder
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q='${folder_id}'+in+parents&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink,thumbnailLink,size)&orderBy=modifiedTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: `Drive API error: ${error}` }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({ 
      success: true,
      files: data.files || []
    });

  } catch (error) {
    console.error('Error listing Drive files:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});