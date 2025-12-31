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
- [ ] Check: "Mostrando 50 / 50+" appears at bottom (or similar)
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 1.2: Load More
- [ ] Scroll to bottom
- [ ] Click **"Load More"** button
- [ ] Verify button shows loading spinner
- [ ] Check: More invoices appear
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
- [ ] Check: Load More button appears (if > 50 quotes)
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 2.2: Load More
- [ ] Click **"Load More"** button
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
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 3.2: Load More & Search
- [ ] Click "Load More" (if available)
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
- [ ] Console: Check for provisioning message
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
- [ ] Console: Check for provisioning message
- [ ] Verify: Invoice saved
- [ ] Verify: Job auto-created
- [ ] **PASS** ✅ / **FAIL** ❌
- [ ] **Notes**: _______________________

### Test 4.3: Send Invoice
- [ ] Create new invoice (or use draft)
- [ ] Fill customer email
- [ ] Click **"Save & Send"**
- [ ] Console: Check for provisioning message
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

## Test Suite 5: SECURITY - Function Authorization

### Test 5.1: Admin-Only Function
- [ ] **Logout** and login as **regular user** (NOT admin)
- [ ] Open DevTools Console
- [ ] Try to call admin function:
```javascript
await base44.functions.invoke('exportDatabase', {});
```
- [ ] Verify: Returns `403 Forbidden: Admin access required`
- [ ] Console: No red errors, clean JSON response
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 5.2: PDF Generation (Ownership)
- [ ] As regular user, get invoice ID you did NOT create
- [ ] Try to generate PDF:
```javascript
await base44.functions.invoke('generateInvoicePDF', { invoiceId: 'OTHER_USER_INVOICE_ID' });
```
- [ ] Verify: Returns `403 Forbidden`
- [ ] Try with YOUR invoice ID
- [ ] Verify: PDF downloads successfully
- [ ] **PASS** ✅ / **FAIL** ❌

### Test 5.3: Drive Operations (Job Access)
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

## Test Suite 6: IDEMPOTENCY - Smoke Test

### Test 6.1: Run Automated Smoke Test
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

## Final Sign-Off

**All Critical Tests Passed**: YES ☐ / NO ☐  
**Security Tests Passed**: YES ☐ / NO ☐  
**Pagination Functional**: YES ☐ / NO ☐  
**Critical Issues Found**: _______________  
**Deploy to Production**: YES ☐ / NO ☐

---

**Tested By**: _______________  
**Date**: _______________  
**Time Spent**: _____ minutes  

**Overall Result**:  
- [ ] ✅ ALL TESTS PASSED - Deploy to production
- [ ] ⚠️ MINOR ISSUES - Deploy with monitoring
- [ ] ❌ CRITICAL FAILURES - Do not deploy