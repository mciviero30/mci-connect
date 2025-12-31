# Smoke Test Checklist
**Date**: 2025-12-31  
**Tester**: _______________

---

## Pre-Test
- [ ] Login as **Admin**
- [ ] Open DevTools Console (F12)
- [ ] Clear cache

---

## Test 1: Facturas Pagination
- [ ] Navigate to Facturas
- [ ] Check: "Mostrando 50 / 50+" appears
- [ ] Click "Load More"
- [ ] Verify: Count updates to "100 / 100+"
- [ ] Search: Type customer name
- [ ] Verify: Real-time filter works
- [ ] Status filter: Select "Sent"
- [ ] Verify: Only sent invoices shown
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test 2: Estimados Pagination
- [ ] Navigate to Estimados
- [ ] Check: Initial load 50 quotes
- [ ] Click "Load More"
- [ ] Verify: No duplicates
- [ ] AI Wizard: Create test quote
- [ ] Verify: Appears in list
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test 3: Trabajos Pagination
- [ ] Navigate to Trabajos
- [ ] Check: 50 jobs loaded
- [ ] Load More works
- [ ] Search filters loaded jobs
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test 4: Job Provisioning

### Quote → Invoice
- [ ] Open quote
- [ ] Convert to Invoice
- [ ] Console: `TRIGGER 1` message
- [ ] Job auto-created
- [ ] **PASS** ✅ / **FAIL** ❌

### Manual Invoice
- [ ] Create new invoice
- [ ] Save Draft
- [ ] Console: `TRIGGER 2` message
- [ ] Job auto-created
- [ ] **PASS** ✅ / **FAIL** ❌

### Send Invoice
- [ ] Edit invoice
- [ ] Save & Send
- [ ] Console: `TRIGGER 3` message
- [ ] Email sent
- [ ] **PASS** ✅ / **FAIL** ❌

### Retry Provisioning
- [ ] Find invoice with partial status
- [ ] Click "Provision Job" button
- [ ] Modal shows Job/Drive/Field status
- [ ] Badge updates after retry
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test 5: Security - Admin Functions

### As Regular User (NOT admin)
- [ ] Logout, login as regular user
- [ ] Console:
```javascript
await base44.functions.invoke('exportDatabase', {});
```
- [ ] Verify: `403 Forbidden: Admin access required`
- [ ] **PASS** ✅ / **FAIL** ❌

### PDF Ownership
- [ ] As regular user
- [ ] Try PDF of OTHER user's invoice:
```javascript
await base44.functions.invoke('generateInvoicePDF', { invoiceId: 'OTHER_ID' });
```
- [ ] Verify: `403 Forbidden`
- [ ] Try YOUR invoice: PDF downloads
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Test 6: Idempotency Smoke Test

### Run Automated Test
- [ ] Login as Admin
- [ ] Console:
```javascript
const result = await base44.functions.invoke('testJobProvisioningSmoke', {});
console.log(result);
```
- [ ] Verify output:
  - ✅ `job_created_once: true`
  - ✅ `drive_created_once: true`
  - ✅ `field_created_once: true`
  - ✅ `idempotency_ok: true`
- [ ] **PASS** ✅ / **FAIL** ❌

---

## Final Sign-Off

**All Tests Passed**: YES ☐ / NO ☐  
**Critical Issues**: _______________  
**Deploy to Production**: YES ☐ / NO ☐