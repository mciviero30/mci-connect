# Job Provisioning System - Smoke Test Report

## Overview

This document describes the automated smoke test for the **Job Provisioning System** that ensures invoice-to-job workflow is idempotent, reliable, and crash-proof.

## Test Function

**Location:** `functions/testJobProvisioningSmoke.js`

**Access:** Admin-only backend function

**Purpose:** Verifies that running provisioning multiple times on the same invoice does NOT create duplicate resources.

## What Gets Tested

### 1. Idempotency Verification
- **Job Creation**: Ensures only ONE job is created per invoice, even if provisioning runs 3x
- **Drive Folder**: Verifies no duplicate Google Drive folders
- **Field Project**: Confirms no duplicate MCI Field projects

### 2. Status Tracking
- `provisioning_status`: pending → in_progress → completed/partial/error
- `provisioning_attempts`: Counter increments correctly
- `provisioning_steps`: Tracks `{job, drive, field}` with statuses: `created`, `existing`, `error`
- `provisioning_last_error`: Short, user-friendly error messages

### 3. Error Handling
- Graceful degradation: If Drive fails, Field can still succeed (partial status)
- No crashes on null values (drive_folder_url, field_project_id)
- Clear error messages without stack traces in UI

## How to Run

1. Open Dashboard → Code → Functions → `testJobProvisioningSmoke`
2. Click "Test" (no payload needed)
3. Review JSON response:

```json
{
  "verdict": "✅ PASS - Idempotency preserved",
  "pass": true,
  "summary": {
    "total_attempts": 3,
    "successful_attempts": 3,
    "unique_jobs_created": 1,
    "unique_drive_folders_created": 1,
    "unique_field_projects_created": 1,
    "idempotency_check": {
      "jobs_ok": true,
      "drive_ok": true,
      "field_ok": true
    }
  }
}
```

## Expected Results

✅ **PASS Criteria:**
- Only 1 unique job ID across all 3 attempts
- Only 1 unique Drive folder URL
- Only 1 unique Field project ID
- Subsequent attempts return `existing` for all steps
- No errors or crashes

❌ **FAIL Criteria:**
- Multiple jobs created for same invoice
- Duplicate Drive folders
- Duplicate Field projects
- Function crashes or returns 500

## Test Scenarios Covered

### Scenario A: Fresh Invoice (No Job Linked)
1. **Attempt 1**: Creates Job → Creates Drive → Syncs Field → Status: `completed`
2. **Attempt 2**: Uses existing Job → Uses existing Drive → Uses existing Field → Status: `completed`
3. **Attempt 3**: Same as Attempt 2

### Scenario B: Invoice with Existing Job
1. **Attempt 1**: Finds existing Job → Creates Drive → Syncs Field → Status: `completed`
2. **Attempt 2**: Uses all existing → Status: `completed`
3. **Attempt 3**: Same as Attempt 2

### Scenario C: Partial Failure (e.g., Field Sync Down)
1. **Attempt 1**: Creates Job → Creates Drive → Field fails → Status: `partial`
2. **Attempt 2**: Uses existing Job → Uses existing Drive → Retries Field → Status: `completed` (if fixed) or `partial`

## Integration Points

### Frontend Guards
All pages that display job data now safely handle null values:

- **VerFactura.js**: Shows provisioning status badge
- **Facturas.js**: Safe rendering of drive_folder_url/field_project_id
- **JobDetails.js**: Defensive checks before accessing job fields

### Entity Schema Updates
New fields in `Job` entity:
- `provisioning_status` (enum: not_started, pending, partial, in_progress, completed, error)
- `provisioning_last_error` (string, max 200 chars)
- `provisioning_steps` (object: {job, drive, field})
- `provisioning_attempts` (number)
- `provisioning_last_attempt_at` (datetime)
- `provisioning_completed_at` (datetime)

## Maintenance Notes

### When to Re-Run Test
- After any changes to `provisionJobFromInvoice` function
- After modifying `createJobDriveFolder` or `syncJobToMCIField` functions
- Before major releases
- Monthly sanity check

### Known Limitations
- Test uses **most recent invoice** or creates a dummy one
- Does not test Google Drive API quota limits
- Does not verify actual Drive folder contents
- Field sync success depends on MCI_FIELD being online

## Troubleshooting

### Test Shows Duplicates
**Root Cause:** Race condition or missing idempotency check  
**Fix:** Review step logic in `provisionJobFromInvoice`, ensure `if (resource_exists)` checks are BEFORE creation

### Test Crashes
**Root Cause:** Missing error handling or null reference  
**Fix:** Add try-catch blocks, check for null values before accessing properties

### Field Sync Always Fails
**Root Cause:** MCI Field app may be down or CROSS_APP_TOKEN invalid  
**Expected:** Test should show `partial` status, NOT crash

## Audit Trail

- **Test Created:** 2025-12-31
- **Last Modified:** 2025-12-31
- **Test Owner:** System Admin
- **Compliance:** Internal QA requirement for invoice-to-job workflow

---

**Quick Command:**  
```bash
curl -X POST https://[your-app]/functions/testJobProvisioningSmoke \
  -H "Authorization: Bearer [admin-token]"
```

**Expected Output:**  
`"verdict": "✅ PASS - Idempotency preserved"