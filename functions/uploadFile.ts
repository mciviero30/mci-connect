import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_auth.js';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_EXTENSIONS = ['.zip', '.pdf', '.png', '.jpg', '.jpeg', '.csv', '.xlsx', '.json', '.txt', '.md'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await requireAdmin(base44);

    const formData = await req.formData();
    const file = formData.get('file');
    const category = formData.get('category') || 'other';
    const notes = formData.get('notes') || '';

    if (!file || !(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file extension
    const fileName = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some(ext => fileName.endsWith(ext));
    
    if (!hasValidExt) {
      return Response.json({ 
        error: `File type not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json({ 
        error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }, { status: 400 });
    }

    // Upload to storage
    const uploadResult = await base44.asServiceRole.integrations.Core.UploadFile({ 
      file: file 
    });

    // Calculate SHA256
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create database record
    const uploadedFile = await base44.asServiceRole.entities.UploadedFile.create({
      original_name: file.name,
      stored_path: uploadResult.file_url,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
      sha256: sha256,
      uploaded_by_email: user.email,
      uploaded_by_name: user.full_name,
      category: category,
      notes: notes,
      status: 'uploaded'
    });

    return Response.json({
      success: true,
      file_id: uploadedFile.id,
      url: uploadResult.file_url,
      sha256: sha256,
      size_bytes: file.size,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return Response.json({ 
      error: error.message || 'Upload failed' 
    }, { status: 500 });
  }
});