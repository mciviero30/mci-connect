import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { requireAdmin } from './_auth.js';
import * as zip from 'https://deno.land/x/zipjs@v2.7.32/index.js';

const MAX_FILES_TO_INDEX = 5000;

function isPathSafe(path) {
  // Block dangerous paths
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.includes('\\..')) return false;
  if (path.startsWith('\\')) return false;
  
  // Normalize and check again
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('/../') || normalized.startsWith('../')) return false;
  
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);

    const { file_id } = await req.json();

    if (!file_id) {
      return Response.json({ error: 'file_id required' }, { status: 400 });
    }

    // Get file record
    const uploadedFile = await base44.asServiceRole.entities.UploadedFile.filter({ id: file_id });
    
    if (!uploadedFile || uploadedFile.length === 0) {
      return Response.json({ error: 'File not found' }, { status: 404 });
    }

    const fileRecord = uploadedFile[0];

    // Download ZIP file
    const response = await fetch(fileRecord.stored_path);
    if (!response.ok) {
      throw new Error('Failed to download ZIP file');
    }

    const blob = await response.blob();
    const reader = new zip.ZipReader(new zip.BlobReader(blob));
    const entries = await reader.getEntries();

    // Validate all paths
    const unsafePaths = [];
    const safeEntries = [];

    for (const entry of entries) {
      if (!isPathSafe(entry.filename)) {
        unsafePaths.push(entry.filename);
      } else {
        safeEntries.push(entry);
      }
    }

    if (unsafePaths.length > 0) {
      await reader.close();
      
      await base44.asServiceRole.entities.UploadedFile.update(file_id, {
        status: 'failed',
        error_message: `ZIP contains unsafe paths: ${unsafePaths.slice(0, 5).join(', ')}`
      });

      return Response.json({ 
        error: 'ZIP contains unsafe paths (zip slip detected)',
        unsafe_paths: unsafePaths.slice(0, 10)
      }, { status: 400 });
    }

    // Build index
    const fileList = [];
    const folders = new Set();
    let totalSize = 0;

    for (const entry of safeEntries.slice(0, MAX_FILES_TO_INDEX)) {
      const path = entry.filename.replace(/\\/g, '/');
      
      if (!entry.directory) {
        fileList.push({
          path: path,
          size: entry.uncompressedSize,
          compressed_size: entry.compressedSize
        });
        totalSize += entry.uncompressedSize;
      }

      // Extract root folder
      const parts = path.split('/');
      if (parts.length > 1) {
        folders.add(parts[0]);
      }
    }

    await reader.close();

    const rootFolders = Array.from(folders);
    const truncated = safeEntries.length > MAX_FILES_TO_INDEX;

    // Update database
    await base44.asServiceRole.entities.UploadedFile.update(file_id, {
      status: 'indexed',
      zip_file_count: safeEntries.length,
      zip_root_folders: rootFolders,
      zip_index_json: JSON.stringify({
        files: fileList,
        total_uncompressed_size: totalSize,
        truncated: truncated,
        indexed_count: fileList.length
      })
    });

    return Response.json({
      success: true,
      file_count: safeEntries.length,
      root_folders: rootFolders,
      total_size: totalSize,
      top_files: fileList.slice(0, 50),
      truncated: truncated,
      message: truncated ? `Indexed first ${MAX_FILES_TO_INDEX} files` : 'All files indexed'
    });

  } catch (error) {
    console.error('Index error:', error);
    
    if (error.message?.includes('Forbidden') || error.message?.includes('admin')) {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    return Response.json({ 
      error: error.message || 'Indexing failed' 
    }, { status: 500 });
  }
});