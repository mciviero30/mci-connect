import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireUser, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireUser(base44);

    const { folder_id, job_id } = await req.json();

    if (!folder_id) {
      return Response.json({ error: 'Missing folder_id' }, { status: 400 });
    }
    
    // Verify job access
    if (job_id) {
      const job = await base44.entities.Job.get(job_id);
      if (job) {
        const isAdmin = user.role === 'admin' || user.position === 'CEO' || user.position === 'administrator';
        const isAssigned = job.assigned_team_field?.includes(user.email);
        
        if (!isAdmin && !isAssigned) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
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
    if (error instanceof Response) throw error;
    if (import.meta.env?.DEV) {
      console.error('Error listing Drive files:', error);
    }
    return safeJsonError('Failed to list files', 500, error.message);
  }
});