# Smoke Test Checklist - Job Provisioning & Pagination
**Date**: 2025-12-31  
**Tester**: _______________  
**Environment**: Production

---

## Pre-Test Setup

- [ ] 1. Open DevTools Console (F12)
- [ ] 2. Login as **Admin** user
- [ ] 3. Clear browser cache (Ctrl+Shift+Delete)
- [ ] 4. Note starting time: __:__

---

## Test Suite 1: FACTURAS (Invoices) - Pagination

### Test 1.1: Initial Load
- [ ] Navigate to **Facturas** page
- [ ] Verify page loads without errors
- [ ] Console: No red errors
- [ ] UI: Invoices render correctly
- [ ] Check: "Mostrando 50 / 50+" appears at bottom
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 1.2: Load More
- [ ] Scroll to bottom
- [ ] Click **"Load More"** button
- [ ] Verify button shows loading spinner
- [ ] Check: Count updates to "Mostrando 100 / 100+"
- [ ] Verify: More invoices appear
- [ ] Console: No errors
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 1.3: Search
- [ ] Type customer name in search box
- [ ] Verify: Invoices filter in real-time
- [ ] Clear search
- [ ] Verify: All loaded invoices reappear
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 1.4: Status Filter
- [ ] Select **"Sent"** from status dropdown
- [ ] Verify: Only sent invoices shown
- [ ] Click "Load More" (if available)
- [ ] Verify: Loads more sent invoices
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 2: ESTIMADOS (Quotes) - Pagination

### Test 2.1: Initial Load
- [ ] Navigate to **Estimados** page
- [ ] Verify page loads without errors
- [ ] Check: Quotes render correctly
- [ ] Check: "Mostrando 50 / 50+" appears
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 2.2: Load More
- [ ] Click **"Load More"** button
- [ ] Verify: Count updates correctly
- [ ] Verify: No duplicate quotes
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 2.3: AI Wizard
- [ ] Click **"AI Wizard"** button
- [ ] Verify: Modal opens
- [ ] Create test quote via AI
- [ ] Verify: New quote appears in list
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 3: TRABAJOS (Jobs) - Pagination

### Test 3.1: Initial Load
- [ ] Navigate to **Trabajos** page
- [ ] Verify page loads without errors
- [ ] Check: Jobs render with provisioning badges
- [ ] Check: "Mostrando 50 / 50+" appears
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 3.2: Load More & Search
- [ ] Click "Load More"
- [ ] Search for job name
- [ ] Verify: Search works on all loaded jobs
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 4: JOB PROVISIONING - Idempotency

### Test 4.1: Quote → Invoice Conversion
- [ ] Navigate to **Estimados**
- [ ] Open any quote in draft status
- [ ] Click **"Convert to Invoice"**
- [ ] Wait for redirect to invoice
- [ ] Console: Check for `TRIGGER 1: Quote → Invoice Conversion Provisioning`
- [ ] Verify: Invoice created successfully
- [ ] Verify: Job created (if didn't exist)
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Notes**: _______________________

### Test 4.2: Manual Invoice Creation
- [ ] Navigate to **Facturas** → **New Invoice**
- [ ] Fill in:
  - Customer: "Test Customer"
  - Job: "Test Job Manual"
  - Add 1 item
- [ ] Click **"Save Draft"**
- [ ] Console: Check for `TRIGGER 2: Manual Invoice Creation Provisioning`
- [ ] Verify: Invoice saved
- [ ] Verify: Job auto-created
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Notes**: _______________________

### Test 4.3: Send Invoice
- [ ] Create new invoice (or use draft)
- [ ] Fill customer email
- [ ] Click **"Save & Send"**
- [ ] Console: Check for `TRIGGER 3: Invoice Send Provisioning`
- [ ] Verify: Email sent confirmation
- [ ] Verify: Invoice status = 'sent'
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Notes**: _______________________

### Test 4.4: Retry Provisioning Button
- [ ] Navigate to **VerFactura** (invoice details)
- [ ] If job has missing Drive/Field, verify **"Provision Job"** button visible
- [ ] Click button
- [ ] Wait for modal to appear
- [ ] Verify modal shows:
  - Job status (Created/Existing)
  - Drive status (Created/Existing/Error)
  - Field status (Created/Existing/Error)
- [ ] Verify: Provisioning badge updates
- [ ] Click retry again
- [ ] Verify: Status = "Existing" (idempotent)
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Notes**: _______________________

---

## Test Suite 5: PROVISIONING STATUS BADGES

### Test 5.1: Invoice List Badges
- [ ] Navigate to **Facturas**
- [ ] Verify invoices with jobs show provisioning badges:
  - 🔵 Pending/In Progress (animated spinner)
  - ⚠️ Partial (amber warning)
  - ✅ Completed (green check)
  - ❌ Error (red X)
- [ ] Verify: Badges don't appear for invoices without jobs
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 5.2: Invoice Details Badges
- [ ] Open invoice with provisioning status
- [ ] Verify badge appears at top
- [ ] Verify color matches status
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 5.3: Job Details Safe Navigation
- [ ] Navigate to **Trabajos**
- [ ] Open job without `drive_folder_url`
- [ ] Verify: No crash
- [ ] Verify: Drive link shows "N/A" or hidden
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 6: NULL SAFETY GUARDS

### Test 6.1: Invoice Without Job
- [ ] Create invoice WITHOUT selecting job
- [ ] Save as draft
- [ ] Navigate to invoice details
- [ ] Verify: No crash
- [ ] Verify: No provisioning button (job required)
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 6.2: Job Without Drive/Field
- [ ] Navigate to job created manually (not from invoice)
- [ ] Verify: No crash if `drive_folder_url` is null
- [ ] Verify: No crash if `field_project_id` is null
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 7: SECURITY - Function Authorization

### Test 7.1: Admin-Only Function
- [ ] **Logout** and login as **regular user** (NOT admin)
- [ ] Open DevTools Console
- [ ] Try to call admin function:
```javascript
await base44.functions.invoke('exportDatabase', {});
```
- [ ] Verify: Returns `403 Forbidden: Admin access required`
- [ ] Console: No red errors, clean JSON response
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 7.2: PDF Generation (Ownership)
- [ ] As regular user, get invoice ID you did NOT create
- [ ] Try to generate PDF:
```javascript
await base44.functions.invoke('generateInvoicePDF', { invoiceId: 'OTHER_USER_INVOICE_ID' });
```
- [ ] Verify: Returns `403 Forbidden`
- [ ] Try with YOUR invoice ID
- [ ] Verify: PDF downloads successfully
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 7.3: Drive Operations (Job Access)
- [ ] As regular user NOT assigned to job
- [ ] Try to list Drive files:
```javascript
await base44.functions.invoke('listDriveFiles', { 
  folder_id: 'SOME_FOLDER_ID', 
  job_id: 'JOB_YOU_ARE_NOT_ASSIGNED_TO' 
});
```
- [ ] Verify: Returns `403 Forbidden`
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 8: IDEMPOTENCY - Smoke Test

### Test 8.1: Run Automated Smoke Test
- [ ] Login as **Admin**
- [ ] Open DevTools Console
- [ ] Run:
```javascript
const result = await base44.functions.invoke('testJobProvisioningSmoke', {});
console.log('Smoke Test Results:', result);
```
- [ ] Wait 30-60 seconds
- [ ] Verify output contains:
  - ✅ `job_created_once: true`
  - ✅ `drive_created_once: true`
  - ✅ `field_created_once: true`
  - ✅ `idempotency_ok: true`
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Console Output**: 
```
Paste full output here:




```

---

## Test Suite 9: EDGE CASES

### Test 9.1: Empty Lists
- [ ] Create new filters that return 0 results
- [ ] Verify: Empty state shows correctly
- [ ] Verify: No "Load More" button
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 9.2: Rapid Clicking
- [ ] Navigate to Facturas
- [ ] Rapidly click "Load More" 5 times
- [ ] Verify: No duplicate invoices
- [ ] Verify: Requests are debounced/queued
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 9.3: Offline/Error Handling
- [ ] Turn off network (DevTools → Network → Offline)
- [ ] Try to navigate to Facturas
- [ ] Verify: Shows cached data OR error message
- [ ] Turn network back on
- [ ] Refresh page
- [ ] Verify: Loads correctly
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test Suite 10: PERFORMANCE VALIDATION

### Test 10.1: Load Time Comparison
- [ ] Clear cache completely
- [ ] Navigate to **Facturas**
- [ ] DevTools → Network tab → Note load time: ____ms
- [ ] Expected: < 300ms for initial 50 invoices
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 10.2: Memory Usage
- [ ] Load Facturas
- [ ] Click "Load More" 3 times (150 invoices)
- [ ] DevTools → Performance → Memory
- [ ] Verify: Memory usage reasonable (< 100MB)
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Final Verification

### Critical Paths (All Must Pass)
- [ ] ✅ Quote → Invoice conversion works
- [ ] ✅ Manual invoice creation works
- [ ] ✅ Invoice send works
- [ ] ✅ Provisioning retry button works
- [ ] ✅ Pagination loads correctly on all 3 pages
- [ ] ✅ Admin functions reject non-admin users
- [ ] ✅ No crashes on null Drive/Field URLs
- [ ] ✅ Idempotency smoke test passes

---

## Issues Found

| # | Page/Function | Issue Description | Severity | Status |
|---|---------------|-------------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Sign-Off

**Tested By**: _______________  
**Date**: _______________  
**Time Spent**: _____ minutes  

**Overall Result**:  
- [ ] ✅ ALL TESTS PASSED - Deploy to production
- [ ] ⚠️ MINOR ISSUES - Deploy with monitoring
- [ ] ❌ CRITICAL FAILURES - Do not deploy

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________