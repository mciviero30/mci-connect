# Job Provisioning Audit Report
**Date:** 2025-12-31  
**Status:** Initial Audit Complete

## 1. Current Flow Analysis

### Quote → Invoice Conversion Points
1. **pages/Estimados.js** (lines 109-152)
   - `convertToInvoiceMutation` creates invoice from quote
   - ❌ Does NOT create Job automatically
   - ❌ Does NOT provision Drive folder
   - ❌ Does NOT sync to MCI Field
   - ❌ No retry mechanism

2. **pages/VerEstimado.js** (lines 121-257)
   - `convertToInvoiceMutation` with more complete implementation
   - ✅ Creates Job if missing (lines 130-169)
   - ⚠️ Attempts Field sync (lines 156-161) but errors are only logged
   - ❌ Does NOT create Drive folder
   - ❌ No retry mechanism
   - ❌ No status tracking

### Invoice Manual Creation Points
3. **pages/CrearFactura.js** (lines 268-351, 464-566)
   - Two mutations: `createMutation` and `sendMutation`
   - ✅ Auto-creates Job if missing (lines 318-346, 507-535)
   - ❌ Does NOT provision Drive folder
   - ❌ Does NOT sync to MCI Field
   - ❌ No retry mechanism

### Backend Functions Review
4. **functions/createJobDriveFolder.js**
   - ✅ Creates Google Drive folder
   - ✅ Updates Job with `drive_folder_id` and `drive_folder_url`
   - ⚠️ Requires admin auth
   - ✅ Idempotent (can check if folder exists)

5. **functions/syncJobToMCIField.js**
   - ❌ Not a proper Deno serve function (export default)
   - ⚠️ Uses process.env instead of Deno.env
   - ⚠️ No authentication
   - ❌ Not idempotent (no check if already synced)
   - ❌ No return of field_project_id

## 2. Problems Identified

### Critical Issues
- **No unified provisioning flow**: Each place implements partial job creation
- **No Drive folder provisioning**: Never called in invoice/quote flows
- **Field sync incomplete**: Function exists but is never properly integrated
- **No error recovery**: If any step fails, it's lost forever
- **No status tracking**: Can't tell if a Job is fully provisioned or not

### Medium Issues
- **Race conditions**: No atomic counter for Job creation
- **Inconsistent error handling**: Some flows log, some ignore, some crash
- **No retry UI**: Users can't fix failed provisioning

### Minor Issues
- **Missing validation**: Some flows don't check auth before provisioning
- **Logging inconsistent**: Mix of console.log, console.error, and nothing

## 3. Recommended Architecture

### New Job Entity Fields
```json
{
  "provisioning_status": "not_started|in_progress|completed|error",
  "provisioning_last_error": "Error message if failed",
  "provisioning_completed_at": "ISO timestamp",
  "field_project_id": "ID from MCI Field sync"
}
```

### New Backend Function
**functions/provisionJobFromInvoice.js**
- Input: `{ invoice_id, mode: "convert"|"create"|"retry" }`
- Idempotent: Can run multiple times safely
- Steps:
  1. Load Invoice → ensure Job exists
  2. Check/create Drive folder → update job.drive_folder_id
  3. Check/sync MCI Field → update job.field_project_id
  4. Update job.provisioning_status
- Output: Complete status of all resources

### Integration Points
- **pages/Estimados.js**: Call after invoice creation
- **pages/CrearFactura.js**: Call after invoice creation (both mutations)
- **pages/VerFactura.js**: Add "Retry Provisioning" button
- **pages/VerEstimado.js**: Call during conversion

## 4. Migration Strategy
1. Create new backend function (idempotent)
2. Update Job entity schema (add provisioning fields)
3. Fix syncJobToMCIField to be proper Deno function
4. Integrate provisioning in all invoice creation flows
5. Add retry button in VerFactura
6. Add status indicators in JobDetails
7. Test with new + existing records

## 5. Files to Modify
- ✏️ entities/Job.json (add provisioning fields)
- ✏️ functions/provisionJobFromInvoice.js (new)
- ✏️ functions/syncJobToMCIField.js (fix to proper Deno function)
- ✏️ pages/Estimados.js (integrate provisioning)
- ✏️ pages/CrearFactura.js (integrate provisioning)
- ✏️ pages/VerEstimado.js (integrate provisioning)
- ✏️ pages/VerFactura.js (add retry button)
- ✏️ pages/JobDetails.js (optional: show provisioning status)