# ZIP Import Implementation Guide

## Overview
Complete implementation of secure file import system for MCI Connect, with special focus on ZIP file handling and security.

## Architecture

### Database Layer
**Entity: UploadedFile**
- Stores metadata for all uploaded files
- Tracks processing status (uploaded → indexed → extracted)
- Stores SHA256 hash for integrity verification
- Includes ZIP-specific fields (file count, root folders, index JSON)

### Backend Functions

#### 1. uploadFile.js
**Purpose:** Handle file uploads with validation and storage

**Security Checks:**
- Admin-only access (requireAdmin)
- File extension whitelist
- MIME type validation
- Size limit enforcement (100MB default)
- SHA256 hash calculation

**Flow:**
1. Validate user is admin
2. Check file extension and size
3. Upload to Base44 storage
4. Calculate SHA256 hash
5. Create UploadedFile record
6. Return file_id and metadata

#### 2. indexZipContents.js
**Purpose:** Safely inspect ZIP contents without extraction

**Security Checks:**
- Path traversal protection (zip slip)
- Blocks `../`, absolute paths, backslash escapes
- Path normalization before storage
- Max file limit (5000 files)

**Flow:**
1. Download ZIP from storage
2. Read central directory using zipjs
3. Validate all paths for safety
4. Reject if unsafe paths found
5. Build file index (paths, sizes, structure)
6. Update UploadedFile with index data

#### 3. downloadUploadedFile.js
**Purpose:** Secure file download for admins

**Features:**
- Admin-only access
- Streams file directly from storage
- Sets proper Content-Disposition headers
- Preserves original filename

### Frontend Page

**ProjectImport.jsx**

**Key Features:**
- Drag & drop upload interface
- Category selection (codebase_zip, docs, images, etc)
- Real-time upload progress
- File list with status badges
- ZIP indexing trigger
- ZIP contents viewer (modal)
- File download functionality

**Security Indicators:**
- SHA256 hash display (first 8 chars)
- Status badges (uploaded/indexed/failed)
- Error message display for failed files
- Admin-only access enforcement

## Security Model

### Zip Slip Protection
**What it is:** Malicious ZIP files with paths like `../../etc/passwd` that try to write outside intended directory.

**Our Protection:**
```javascript
function isPathSafe(path) {
  if (path.includes('..')) return false;
  if (path.startsWith('/')) return false;
  if (path.includes('\\..')) return false;
  if (path.startsWith('\\')) return false;
  
  const normalized = path.replace(/\\/g, '/');
  if (normalized.includes('/../') || normalized.startsWith('../')) return false;
  
  return true;
}
```

**Result:** ZIP with unsafe paths is rejected entirely and marked as 'failed' status.

### Admin-Only Access
All functions use `requireAdmin()` from `_auth.js`:
- Validates user is authenticated
- Checks role === 'admin' OR position includes 'CEO' or 'administrator'
- Returns 403 Forbidden for unauthorized users

### File Type Restrictions
**Allowed Extensions:**
- Archives: `.zip`
- Documents: `.pdf`, `.txt`, `.md`
- Images: `.png`, `.jpg`, `.jpeg`
- Data: `.csv`, `.xlsx`, `.json`

**Validation:** Both extension check (client-side hint) and MIME type validation (server-side).

### Size Limits
- Default: 100MB per file
- Configurable via `MAX_FILE_SIZE` constant
- Enforced before upload to storage

## Usage Guide

### For Administrators

**Uploading a File:**
1. Navigate to Project Import page (admin only)
2. Drag & drop file or click Browse
3. Select category and add notes
4. Click Upload File
5. Wait for success confirmation

**Indexing a ZIP:**
1. Find uploaded ZIP in file list
2. Click package icon (📦) to index
3. Wait for indexing to complete
4. Status changes from "Uploaded" to "Indexed"

**Viewing ZIP Contents:**
1. Find indexed ZIP
2. Click eye icon (👁️) to view contents
3. Search/browse file list in modal
4. See total files, size, structure

**Downloading a File:**
1. Click download icon (⬇️)
2. File downloads with original name

### Error Handling

**Common Errors:**
- "File type not allowed" → Check extension
- "File too large" → Reduce file size or increase limit
- "ZIP contains unsafe paths" → ZIP has malicious paths, cannot be used
- "Admin access required" → User is not admin

## Integration with Existing System

**Layout.js Integration:**
Add to admin navigation:
```javascript
{ 
  title: 'Project Import', 
  url: createPageUrl("ProjectImport"), 
  icon: Package 
}
```

**No Changes to:**
- Existing entities (Job, Quote, Invoice, etc)
- Authentication system
- User permissions (only adds admin check)
- Other pages or components

## Performance Considerations

**Large ZIP Files:**
- Indexing is done via central directory (no extraction)
- First 5000 files indexed, rest marked as truncated
- Streaming download (no full load in memory)

**Database:**
- zip_index_json can be large (consider separate storage for huge ZIPs)
- Query limit: 100 recent files (adjustable)

**Storage:**
- Files stored in Base44 storage (persistent)
- Original files preserved (no automatic deletion)

## Testing

See `ZIP_IMPORT_SMOKE_TESTS.md` for comprehensive test suite.

## Future Enhancements

**Possible Additions:**
1. Extract ZIP to storage (extractZipToStorage function)
2. Automatic file expiration (delete after X days)
3. File sharing (generate public links)
4. Bulk operations (delete multiple files)
5. Advanced ZIP analysis (detect code patterns, dependencies)
6. Version control (track file updates)
7. Integration with MCI Field (import blueprints from ZIP)

## Dependencies

**NPM Packages:**
- `zipjs@2.7.32` (Deno import) - ZIP reading without extraction
- Base44 SDK 0.8.6+
- React Query for state management

**Backend:**
- Deno runtime (server-side)
- Base44 storage API
- Web Crypto API (SHA256)

## Support

For issues or questions:
- Check smoke tests for expected behavior
- Review error messages in UploadedFile.error_message
- Contact system administrator

---

**Implementation Date:** 2026-01-01  
**Version:** 1.0  
**Status:** Production Ready