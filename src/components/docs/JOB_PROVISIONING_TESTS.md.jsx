# Job Provisioning Test Plan
**Date:** 2025-12-31  
**Status:** Ready for Testing

## Test Scenarios

### Test 1: Quote → Invoice Conversion (Full Flow)
**Steps:**
1. Create a new quote with customer and job details
2. Convert quote to invoice from Estimados page
3. Verify invoice created successfully
4. Check that job was created/linked
5. Verify Drive folder was created (check job.drive_folder_url)
6. Verify MCI Field sync occurred (check job.field_project_id)
7. Check job.provisioning_status = 'completed'

**Expected Results:**
- ✅ Invoice created with job_id
- ✅ Job exists in database
- ✅ job.drive_folder_url populated
- ✅ job.field_project_id populated
- ✅ job.provisioning_status = 'completed'
- ✅ No errors in console

**Actual Results:** (To be filled after testing)

---

### Test 2: Manual Invoice Creation
**Steps:**
1. Go to CrearFactura page
2. Fill in customer details
3. Add job name and address
4. Add line items
5. Click "Save Draft"
6. Verify job created automatically
7. Check Drive folder and Field sync

**Expected Results:**
- ✅ Invoice saved successfully
- ✅ Job auto-created
- ✅ Drive folder created
- ✅ Field project synced
- ✅ job.provisioning_status = 'completed'

**Actual Results:** (To be filled after testing)

---

### Test 3: Invoice Send Flow
**Steps:**
1. Create invoice draft
2. Click "Save & Send"
3. Verify email sent
4. Check provisioning completed

**Expected Results:**
- ✅ Invoice sent to customer
- ✅ Job provisioned completely
- ✅ Drive + Field resources created

**Actual Results:** (To be filled after testing)

---

### Test 4: Idempotency Test (Critical)
**Steps:**
1. Create invoice → provision job
2. Manually call provisionJobFromInvoice 3 more times
3. Verify NO duplicates created

**Expected Results:**
- ✅ Only 1 Job in database
- ✅ Only 1 Drive folder
- ✅ Only 1 Field project
- ✅ steps.job = 'existing', steps.drive = 'existing', steps.field = 'existing'

**Actual Results:** (To be filled after testing)

---

### Test 5: Partial Failure Recovery
**Steps:**
1. Simulate Drive failure (disconnect Google Drive OAuth)
2. Create invoice → observe provisioning error
3. Verify invoice still saved
4. Reconnect Google Drive
5. Click "Retry Provisioning" button
6. Verify Drive folder created on retry

**Expected Results:**
- ✅ Invoice saved even with Drive error
- ✅ job.provisioning_status = 'error'
- ✅ Error message visible
- ✅ Retry button appears
- ✅ After retry, job.provisioning_status = 'completed'
- ✅ Drive folder created

**Actual Results:** (To be filled after testing)

---

### Test 6: Legacy Jobs Compatibility
**Steps:**
1. Find old job without drive_folder_url or field_project_id
2. Create invoice linked to that job
3. Verify provisioning adds missing resources

**Expected Results:**
- ✅ Existing job updated (not duplicated)
- ✅ Drive folder added to old job
- ✅ Field project added to old job
- ✅ No data loss on existing job

**Actual Results:** (To be filled after testing)

---

### Test 7: Error Handling (No Auth)
**Steps:**
1. Test provisioning without Google Drive connected
2. Verify graceful error handling

**Expected Results:**
- ✅ Clear error message shown
- ✅ Invoice still accessible
- ✅ Retry button visible
- ✅ No app crash

**Actual Results:** (To be filled after testing)

---

## Checklist Before Deployment
- [ ] All 7 tests passed
- [ ] No duplicate jobs created in any scenario
- [ ] Retry button works correctly
- [ ] Error messages are user-friendly
- [ ] Console logs clean in production
- [ ] Legacy jobs handled correctly
- [ ] Documentation complete

## Notes
(Add any observations, edge cases, or issues found during testing)