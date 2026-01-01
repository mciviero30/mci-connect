import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { unzip } from 'https://deno.land/x/zip@v1.2.5/mod.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Download ZIP file
    const response = await fetch(file_url);
    if (!response.ok) {
      return Response.json({ error: 'Failed to download ZIP file' }, { status: 400 });
    }

    const zipBytes = new Uint8Array(await response.arrayBuffer());
    
    // Save to temp file
    const tempPath = `/tmp/upload_${Date.now()}.zip`;
    await Deno.writeFile(tempPath, zipBytes);

    // Extract and analyze
    const extractPath = `/tmp/extract_${Date.now()}`;
    await Deno.mkdir(extractPath, { recursive: true });
    
    await unzip(tempPath, extractPath);

    // Walk through extracted files
    const files = [];
    
    async function walkDir(dir, basePath = '') {
      for await (const entry of Deno.readDir(dir)) {
        const fullPath = `${dir}/${entry.name}`;
        const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory) {
          files.push({
            path: relativePath + '/',
            name: entry.name,
            dir: true,
            size: 0
          });
          await walkDir(fullPath, relativePath);
        } else {
          const stat = await Deno.stat(fullPath);
          files.push({
            path: relativePath,
            name: entry.name,
            dir: false,
            size: stat.size
          });
        }
      }
    }

    await walkDir(extractPath);

    // Cleanup
    await Deno.remove(tempPath);
    await Deno.remove(extractPath, { recursive: true });

    return Response.json({ 
      success: true,
      files: files.sort((a, b) => a.path.localeCompare(b.path))
    });

  } catch (error) {
    console.error('Error analyzing ZIP:', error);
    return Response.json({ 
      error: error.message || 'Failed to analyze ZIP' 
    }, { status: 500 });
  }
});