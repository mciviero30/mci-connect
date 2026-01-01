# ZIP Import - Smoke Tests

## Test Suite for File Import System

### Test Environment Setup
- User: Admin account (role='admin' OR position='CEO'/'administrator')
- Browser: Chrome/Firefox/Safari
- Files needed:
  - Valid ZIP (10-50 files, < 50MB)
  - Malicious ZIP with `../evil.txt`
  - Large ZIP (near 100MB limit)
  - PDF, PNG, CSV files
  - Oversized file (>100MB)

---

## Test Cases

### 1. Access Control Tests

#### TC-001: Admin Access
**Steps:**
1. Login as admin user
2. Navigate to Project Import page
3. Verify page loads successfully

**Expected:**
- ✅ Page renders
- ✅ Upload form visible
- ✅ Security notes displayed

**Status:** [ ]

---

#### TC-002: Non-Admin Access
**Steps:**
1. Login as regular employee (technician/manager without admin)
2. Navigate to Project Import page

**Expected:**
- ✅ "Access Denied" message shown
- ✅ Upload form NOT visible
- ✅ 403 error if trying API directly

**Status:** [ ]

---

### 2. Upload Tests

#### TC-003: Valid ZIP Upload
**Steps:**
1. Login as admin
2. Drag & drop valid ZIP (10-50 files, ~10MB)
3. Select category: "Codebase ZIP"
4. Add notes: "Test upload"
5. Click Upload File

**Expected:**
- ✅ Progress indicator shows
- ✅ Success message: "File uploaded successfully"
- ✅ File appears in list with status "Uploaded"
- ✅ SHA256 hash displayed
- ✅ File size correct

**Status:** [ ]

---

#### TC-004: Invalid File Type
**Steps:**
1. Try to upload .exe, .sh, or .bat file

**Expected:**
- ✅ Error: "File type not allowed"
- ✅ No upload occurs
- ✅ List of allowed types shown

**Status:** [ ]

---

#### TC-005: Oversized File
**Steps:**
1. Try to upload file > 100MB

**Expected:**
- ✅ Error: "File too large. Maximum size: 100MB"
- ✅ No upload occurs

**Status:** [ ]

---

#### TC-006: Valid Document Upload
**Steps:**
1. Upload .pdf file (5MB)
2. Category: "Documents"
3. Notes: "Test PDF"

**Expected:**
- ✅ Upload succeeds
- ✅ Correct category badge shown
- ✅ Document icon displayed

**Status:** [ ]

---

### 3. ZIP Security Tests

#### TC-007: Zip Slip Attack Prevention
**Steps:**
1. Create malicious ZIP with files:
   - `../../../etc/passwd`
   - `..\..\windows\system32\config`
   - `/etc/hosts`
2. Upload ZIP successfully
3. Click package icon to index

**Expected:**
- ✅ Upload succeeds (file stored)
- ✅ Indexing FAILS
- ✅ Status changes to "Failed"
- ✅ Error message: "ZIP contains unsafe paths"
- ✅ Sample unsafe paths listed

**Status:** [ ]

---

#### TC-008: Valid ZIP Indexing
**Steps:**
1. Upload valid ZIP with normal paths (pages/, components/, etc)
2. Wait for upload
3. Click package icon to index

**Expected:**
- ✅ Indexing completes (~5-10 seconds)
- ✅ Status changes to "Indexed"
- ✅ File count badge appears (e.g., "42 files")
- ✅ Eye icon becomes clickable

**Status:** [ ]

---

#### TC-009: Large ZIP Indexing
**Steps:**
1. Upload ZIP with 6000+ files
2. Index the ZIP

**Expected:**
- ✅ Indexing completes
- ✅ Shows "Indexed first 5000 files"
- ✅ Truncation warning in viewer
- ✅ Status: "Indexed"

**Status:** [ ]

---

### 4. ZIP Contents Viewer Tests

#### TC-010: View ZIP Contents
**Steps:**
1. Upload and index a valid ZIP
2. Click eye icon
3. Modal opens

**Expected:**
- ✅ Modal shows file statistics
- ✅ Search box functional
- ✅ File list with paths and sizes
- ✅ Can scroll through files
- ✅ Uncompressed size displayed

**Status:** [ ]

---

#### TC-011: Search ZIP Contents
**Steps:**
1. Open ZIP viewer
2. Type "components" in search
3. Observe filtered results

**Expected:**
- ✅ Only matching files shown
- ✅ Search is case-insensitive
- ✅ File count updates

**Status:** [ ]

---

### 5. Download Tests

#### TC-012: Download Uploaded File
**Steps:**
1. Upload any valid file
2. Click download icon
3. Save file

**Expected:**
- ✅ Download starts immediately
- ✅ Filename matches original
- ✅ File size matches
- ✅ File integrity intact (SHA256 matches if checked)

**Status:** [ ]

---

#### TC-013: Download Non-Existent File
**Steps:**
1. Delete a file from UploadedFile entity manually
2. Try to click download

**Expected:**
- ✅ Error: "File not found" or "Download failed"
- ✅ No corrupt download

**Status:** [ ]

---

### 6. UI/UX Tests

#### TC-014: Drag & Drop
**Steps:**
1. Drag file over upload area
2. Drop file

**Expected:**
- ✅ Drag area highlights (blue border)
- ✅ File name appears after drop
- ✅ No page reload

**Status:** [ ]

---

#### TC-015: Multiple Uploads
**Steps:**
1. Upload file A
2. Upload file B
3. Upload file C

**Expected:**
- ✅ All files appear in list
- ✅ Sorted by upload date (newest first)
- ✅ No duplicates

**Status:** [ ]

---

#### TC-016: Status Badges
**Steps:**
1. Upload ZIP (status: uploaded)
2. Index ZIP (status: indexed)
3. Upload malicious ZIP and try to index (status: failed)

**Expected:**
- ✅ "Uploaded" badge: outline, clock icon
- ✅ "Indexed" badge: green, check icon
- ✅ "Failed" badge: red, X icon

**Status:** [ ]

---

### 7. Error Handling Tests

#### TC-017: Network Error During Upload
**Steps:**
1. Start upload
2. Disconnect network mid-upload
3. Reconnect

**Expected:**
- ✅ Error message shown
- ✅ No partial file created
- ✅ Can retry upload

**Status:** [ ]

---

#### TC-018: Concurrent Uploads
**Steps:**
1. Upload file A
2. Immediately upload file B (before A finishes)

**Expected:**
- ✅ Both uploads complete
- ✅ No race conditions
- ✅ Both files appear in list

**Status:** [ ]

---

### 8. SHA256 Integrity Tests

#### TC-019: SHA256 Calculation
**Steps:**
1. Upload known file (calculate SHA256 externally first)
2. Compare with displayed hash

**Expected:**
- ✅ SHA256 matches external calculation
- ✅ First 8 chars displayed in list
- ✅ Full hash stored in database

**Status:** [ ]

---

### 9. Performance Tests

#### TC-020: 100MB File Upload
**Steps:**
1. Upload file near limit (95MB)
2. Observe upload time

**Expected:**
- ✅ Upload completes (may take 30-60 seconds)
- ✅ No timeout errors
- ✅ Progress indicator responsive

**Status:** [ ]

---

#### TC-021: ZIP with 1000 Files
**Steps:**
1. Upload and index ZIP with 1000 files
2. Open viewer

**Expected:**
- ✅ Indexing completes in < 30 seconds
- ✅ Viewer loads smoothly
- ✅ Search responsive

**Status:** [ ]

---

## Test Results Summary

| Category | Total | Pass | Fail | Skip |
|----------|-------|------|------|------|
| Access Control | 2 | - | - | - |
| Upload | 4 | - | - | - |
| Security | 3 | - | - | - |
| Viewer | 2 | - | - | - |
| Download | 2 | - | - | - |
| UI/UX | 3 | - | - | - |
| Error Handling | 2 | - | - | - |
| Integrity | 1 | - | - | - |
| Performance | 2 | - | - | - |
| **TOTAL** | **21** | **-** | **-** | **-** |

---

## Critical Tests (Must Pass)

1. **TC-002**: Non-admin access denied
2. **TC-007**: Zip slip prevention
3. **TC-008**: Valid ZIP indexing
4. **TC-019**: SHA256 integrity

If these fail, **DO NOT deploy to production**.

---

## Test Data Files

**Create these test files:**

1. `valid-small.zip` - 10 files, normal paths
2. `valid-large.zip` - 1000+ files, 80MB
3. `malicious-zipslip.zip` - Contains `../../../evil.txt`
4. `oversized.zip` - 110MB (should fail)
5. `test-document.pdf` - 5MB valid PDF
6. `test-image.png` - 2MB valid PNG

---

## Automated Test Script

```javascript
// Run in browser console after login as admin
async function runSmokeTests() {
  console.log('Starting ZIP Import Smoke Tests...');
  
  // TC-001: Check page access
  const response = await fetch('/ProjectImport');
  console.log('TC-001:', response.ok ? 'PASS' : 'FAIL');
  
  // TC-003: Upload test file
  const formData = new FormData();
  const testFile = new File(['test'], 'test.zip', { type: 'application/zip' });
  formData.append('file', testFile);
  formData.append('category', 'other');
  formData.append('notes', 'Automated test');
  
  const uploadResponse = await base44.functions.invoke('uploadFile', formData);
  console.log('TC-003:', uploadResponse.data?.success ? 'PASS' : 'FAIL');
  
  // Add more automated tests here...
}
```

---

**Last Updated:** 2026-01-01  
**Version:** 1.0  
**Tester:** _____________  
**Date Tested:** _____________