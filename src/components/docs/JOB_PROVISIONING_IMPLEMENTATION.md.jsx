# Job Provisioning Implementation Summary
**Date:** 2025-12-31  
**Status:** Implementation Complete

## Overview
Implemented unified, idempotent job provisioning system to ensure all invoices have complete job resources (MCI Connect Job + Google Drive folder + MCI Field sync).

## Architecture

### 1. Backend Function (Single Source of Truth)
**File:** `functions/provisionJobFromInvoice.js`

**Purpose:** Idempotent provisioning of all job resources from an invoice

**Input:**
```json
{
  "invoice_id": "string (required)",
  "mode": "convert | create | send | retry"
}
```

**Output:**
```json
{
  "ok": true/false,
  "invoice_id": "string",
  "job_id": "string",
  "drive_folder_url": "string",
  "field_project_id": "string",
  "steps": {
    "job": "created | existing",
    "drive": "created | existing | error",
    "field": "created | existing | error"
  },
  "errors": ["array of error messages"] | null,
  "provisioning_status": "completed | error"
}
```

**Idempotency Guarantees:**
- ✅ Checks if Job exists before creating
- ✅ Checks if Drive folder exists before creating
- ✅ Checks if Field project exists before syncing
- ✅ Can run 100 times → same result, no duplicates

**Error Handling:**
- Non-blocking: Invoice is saved even if provisioning fails
- Errors logged to job.provisioning_last_error
- Status tracked in job.provisioning_status

---

### 2. Entity Changes
**File:** `entities/Job.json`

**New Fields:**
```json
{
  "provisioning_status": {
    "type": "string",
    "enum": ["not_started", "in_progress", "completed", "error"],
    "default": "not_started"
  },
  "provisioning_last_error": {
    "type": "string"
  },
  "provisioning_completed_at": {
    "type": "string",
    "format": "date-time"
  },
  "field_project_id": {
    "type": "string",
    "description": "ID from MCI Field sync"
  }
}
```

---

### 3. Integration Points

#### A. Quote Conversion (pages/Estimados.js)
**Location:** Line 109-152 (convertToInvoiceMutation)

**Changes:**
- After creating invoice, calls `provisionJobFromInvoice`
- Non-blocking: conversion succeeds even if provisioning fails
- Errors logged but don't block user

```javascript
// Provision job (Drive + Field) - non-blocking
try {
  await base44.functions.invoke('provisionJobFromInvoice', {
    invoice_id: newInvoice.id,
    mode: 'convert'
  });
} catch (provisionError) {
  console.warn('Provisioning failed (non-critical):', provisionError);
}
```

#### B. Manual Invoice Creation (pages/CrearFactura.js)
**Locations:** 
- createMutation (line 268-351)
- sendMutation (line 464-566)

**Changes:**
- Both mutations call `provisionJobFromInvoice` after invoice creation
- Non-blocking provisioning

#### C. Quote Detail Conversion (pages/VerEstimado.js)
**Location:** Line 121-257 (convertToInvoiceMutation)

**Changes:**
- Calls provisioning after invoice creation
- Results included in success toast

#### D. Invoice View - Retry Button (pages/VerFactura.js)
**Component:** `RetryProvisioningButton`

**Changes:**
- New component added to action bar
- Visible only when provisioning incomplete/failed
- Shows detailed results modal after retry
- Refreshes job data on success

---

### 4. Supporting Functions

#### Fixed: functions/syncJobToMCIField.js
**Before:** Export default (not a proper Deno function)

**After:** Proper Deno.serve with:
- User authentication
- Deno.env instead of process.env
- Proper error handling
- Returns mci_field_job_id

---

## How to Use

### For Developers

#### Creating New Invoice (Any Method)
The provisioning happens automatically. No manual steps needed.

```javascript
// In any mutation after invoice creation:
const newInvoice = await base44.entities.Invoice.create(data);

// Provisioning runs automatically (non-blocking)
```

#### Manual Retry
If provisioning fails, users see "Provision Job" button in VerFactura page.

Admin can also call directly:
```javascript
const { data } = await base44.functions.invoke('provisionJobFromInvoice', {
  invoice_id: 'some-id',
  mode: 'retry'
});
```

---

## Files Modified

### New Files:
1. ✅ `functions/provisionJobFromInvoice.js` - Main provisioning function
2. ✅ `components/invoices/RetryProvisioningButton.jsx` - Retry UI component
3. ✅ `components/docs/JOB_PROVISIONING_AUDIT.md` - Audit documentation
4. ✅ `components/docs/JOB_PROVISIONING_TESTS.md` - Test plan
5. ✅ `components/docs/JOB_PROVISIONING_IMPLEMENTATION.md` - This file

### Modified Files:
1. ✅ `entities/Job.json` - Added provisioning tracking fields
2. ✅ `functions/syncJobToMCIField.js` - Fixed to proper Deno function
3. ✅ `pages/Estimados.js` - Integrated provisioning
4. ✅ `pages/CrearFactura.js` - Integrated provisioning (2 places)
5. ✅ `pages/VerEstimado.js` - Integrated provisioning
6. ✅ `pages/VerFactura.js` - Added retry button and job query

---

## Decision Log

### Why Non-Blocking?
Provisioning (Drive + Field) can fail due to:
- OAuth not connected
- Network issues
- External API downtime

Critical: Invoice data must be saved even if provisioning fails.
Solution: Run provisioning after invoice save, catch errors, allow retry.

### Why Idempotent?
Users might click "Retry" multiple times.
Solution: Check existence before creating any resource.

### Why Single Function?
Previously, provisioning logic was scattered across 4+ files.
Solution: One source of truth = easier to maintain, test, and debug.

---

## Rollback Plan
If issues arise:
1. Remove provisioning calls from mutations (revert to previous state)
2. Keep new function - can be used manually if needed
3. Entity schema changes are backward compatible (new fields optional)

---

## Future Improvements
- [ ] Add provisioning status indicator in Jobs list
- [ ] Automated retry with exponential backoff
- [ ] Webhook for async provisioning
- [ ] Bulk provisioning for legacy jobs
- [ ] Calendar sync integration