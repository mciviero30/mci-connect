import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_auth.js';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);

    const { file_id } = await req.json();

    if (!file_id) {
      return Response.json({ error: 'file_id required' }, { status: 400 });
    }

    // Get file record
    const uploadedFiles = await base44.asServiceRole.entities.UploadedFile.filter({ id: file_id });
    
    if (!uploadedFiles || uploadedFiles.length === 0) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    const fileRecord = uploadedFiles[0];

    // Download file
    const response = await fetch(fileRecord.stored_path);
    if (!response.ok) {
      throw new Error('Failed to download file');
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': fileRecord.mime_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${fileRecord.original_name}"`,
        'Content-Length': fileRecord.size_bytes.toString()
      }
    });

  } catch (error) {
    console.error('Download error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return Response.json({ 
      error: error.message || 'Download failed' 
    }, { status: 500 });
  }
});