# Employee Onboarding Smoke Tests

**Last Updated:** 2026-01-02  
**Status:** READY FOR EXECUTION  
**Priority:** P0 (CRITICAL)

---

## Pre-Test Setup

### Test Environment
- [ ] Staging/Dev environment available
- [ ] Test admin account with invite permissions
- [ ] Test email addresses prepared (use + trick: admin+test1@example.com)
- [ ] Browser dev tools ready for console monitoring

### Test Data Preparation
Create 3 test pending employees with complete data:
```javascript
// Example test employee
{
  first_name: "John",
  last_name: "TestUser",
  email: "john.test@example.com",
  phone: "(555)123-4567",
  address: "123 Test St, Test City, TX 75001",
  dob: "1990-01-15",
  position: "technician",
  department: "field",
  team_id: "<test_team_id>",
  team_name: "Test Team Alpha",
  ssn_tax_id: "123-45-6789",
  tshirt_size: "L",
  hourly_rate: 28.50,
  direct_manager_name: "Test Manager"
}
```

---

## Test 1: Complete Data Preservation (Critical Path)

**Objective:** Verify NO data is lost when inviting employee with full profile

### Steps
1. ✅ Create PendingEmployee with ALL fields populated (see example above)
2. ✅ Verify data visible in Empleados page → Pending tab
3. ✅ Click "Invite Employee"
4. ✅ Complete Base44 system invitation
5. ✅ Log in as new user (opens in incognito window)
6. ✅ Check browser console for migration logs
7. ✅ Complete 3 onboarding forms (Safety, Rules, Paperwork)
8. ✅ Verify redirect to Dashboard after 3rd form
9. ✅ Navigate to Profile page
10. ✅ Verify ALL fields match original PendingEmployee data

### Expected Results
- [ ] first_name preserved: "John"
- [ ] last_name preserved: "TestUser"
- [ ] phone preserved: "(555)123-4567"
- [ ] address preserved: "123 Test St..."
- [ ] dob preserved: "1990-01-15"
- [ ] position preserved: "technician"
- [ ] team_name preserved: "Test Team Alpha"
- [ ] ssn_tax_id preserved: "123-45-6789"
- [ ] hourly_rate preserved: 28.50
- [ ] Console shows: "📋 Migrating PendingEmployee data"
- [ ] Console shows: "✅ All 3 unique forms completed"

### Fail Criteria
- Any field shows email-derived value (e.g., "john.test" instead of "John")
- Any field is empty/null that had data
- Phone number lost or malformed
- Team assignment missing

---

## Test 2: Onboarding Loop Prevention (Critical Path)

**Objective:** Verify onboarding wizard does NOT restart after completion

### Steps
1. ✅ Continue from Test 1 (user already completed onboarding)
2. ✅ Log out
3. ✅ Log back in as same user
4. ✅ Check which page loads

### Expected Results
- [ ] Redirected to Dashboard (NOT OnboardingWizard)
- [ ] Console shows: "🚫 Onboarding already completed, redirecting..."
- [ ] No onboarding forms visible
- [ ] User has full app access

### Fail Criteria
- OnboardingWizard page loads
- User is prompted to complete forms again
- Any form completion counter resets

---

## Test 3: Duplicate Form Prevention

**Objective:** Verify duplicate forms are not created

### Steps
1. ✅ Create fresh PendingEmployee
2. ✅ Invite and log in
3. ✅ Complete Safety form (Form 1)
4. ✅ Manually navigate away (type URL: /Dashboard)
5. ✅ Browser back button to OnboardingWizard
6. ✅ Try to submit Safety form again

### Expected Results
- [ ] Form update occurs (not duplicate creation)
- [ ] Console shows: "⚠️ Form safety_acknowledgment already exists, updating..."
- [ ] Query database: Only 1 safety form exists for user
- [ ] Progress shows: 1/3 forms (33%)

### Fail Criteria
- Multiple safety forms created
- Error thrown on duplicate submission
- Progress shows incorrect count

---

## Test 4: Partial Data Migration

**Objective:** Verify migration works with minimal data

### Steps
1. ✅ Create PendingEmployee with ONLY:
   - first_name: "Min"
   - last_name: "Test"
   - email: "min.test@example.com"
2. ✅ Invite and activate
3. ✅ Complete onboarding (fill remaining fields during onboarding)
4. ✅ Check profile

### Expected Results
- [ ] first_name, last_name preserved: "Min Test"
- [ ] Other fields empty/null (not filled with garbage)
- [ ] No errors in console
- [ ] Onboarding completes successfully
- [ ] Full_name correctly built: "Min Test"

---

## Test 5: SSN Required Validation

**Objective:** Verify SSN is REQUIRED as text (no photo upload)

### Steps
1. ✅ Start fresh onboarding
2. ✅ Navigate to Paperwork form (Form 3)
3. ✅ Fill legal_full_name, dob, banking, emergency contact
4. ✅ **SKIP** ssn_or_itin field (leave empty)
5. ✅ Click Submit

### Expected Results
- [ ] Form DOES NOT submit
- [ ] Validation error: "SSN/ITIN required for payroll"
- [ ] Field marked with asterisk (*)
- [ ] NO file upload fields visible

### Steps (Part 2)
1. ✅ Fill ssn_or_itin: "123-45-6789"
2. ✅ Click Submit

### Expected Results
- [ ] Form submits successfully
- [ ] No upload required
- [ ] SSN saved in User.ssn_tax_id

---

## Test 6: Document Upload Removal

**Objective:** Verify document uploads are no longer in onboarding

### Steps
1. ✅ Start fresh onboarding
2. ✅ Navigate to Paperwork form (Form 3)
3. ✅ Inspect form fields

### Expected Results
- [ ] NO "Driver's License" upload field visible
- [ ] NO "Social Security Card" upload field visible
- [ ] NO "Work Permit" upload field visible
- [ ] SSN field is plain text input
- [ ] Form is shorter and simpler

---

## Test 7: Onboarding Status Flags (Critical)

**Objective:** Verify all completion flags are set correctly

### Steps
1. ✅ Complete onboarding as new user
2. ✅ After redirect to Dashboard, open browser console
3. ✅ Run: `base44.auth.me().then(u => console.log(u))`
4. ✅ Inspect user object

### Expected Results
- [ ] `onboarding_completed: true`
- [ ] `onboarding_completed_at: <ISO timestamp>`
- [ ] `onboarding_status: "completed"`
- [ ] `employment_status: "active"`
- [ ] All timestamps are ISO format

### Fail Criteria
- Any flag is false/null/missing
- Timestamp is not ISO format
- Status is "not_started" or "in_progress"

---

## Test 8: PendingEmployee Cleanup & Audit Trail

**Objective:** Verify PendingEmployee record is properly migrated and deleted

### Steps
1. ✅ Note PendingEmployee ID before invitation
2. ✅ Note all field values (first_name, last_name, ssn_tax_id, etc.)
3. ✅ Complete activation and onboarding
4. ✅ Check console logs during migration
5. ✅ Query PendingEmployee table for that ID

### Expected Results
- [ ] Console shows: "📋 Migrating PendingEmployee data: [list of fields]"
- [ ] Before deletion, PendingEmployee updated with:
  - `data_migrated_to_user: true`
  - `migrated_at: <timestamp>`
  - `status: "active"`
- [ ] PendingEmployee record deleted after migration
- [ ] User record has ALL migrated fields (verify each one)
- [ ] Console shows: "✅ Pending record cleaned up"

### Audit Trail Check
Query PendingEmployee before deletion (if possible):
- [ ] `data_migrated_to_user: true`
- [ ] `migrated_at: <timestamp>`
- [ ] `status: "active"`

---

## Test 9: Concurrent User Login (Race Condition Test)

**Objective:** Verify no race conditions if user logs in multiple times during activation

### Steps
1. ✅ Invite new employee
2. ✅ Open 2 browser windows (both incognito)
3. ✅ Log in with same credentials in BOTH windows simultaneously
4. ✅ Let auto-activation run in both
5. ✅ Watch console logs in both windows

### Expected Results
- [ ] No errors in either console
- [ ] Only 1 migration occurs (check sessionStorage flag)
- [ ] Both windows redirect correctly to OnboardingWizard
- [ ] User data is consistent across windows
- [ ] No duplicate PendingEmployee deletions

### SessionStorage Check
- [ ] `activation_${userId}` flag is set to "done" in both windows
- [ ] Flag prevents second window from re-running migration

---

## Test 10: Name Display Consistency

**Objective:** Verify name appears correctly across all pages

### Steps
1. ✅ Complete Test 1 (user with full data: first="John", last="TestUser")
2. ✅ Navigate to:
   - Dashboard (header/welcome)
   - Employees page (ModernEmployeeCard)
   - Directory page
   - Profile page (EmployeeProfile)
   - Chat (if applicable)
3. ✅ Verify name display in each location

### Expected Results
- [ ] Name is "John TestUser" everywhere (NOT "john.test")
- [ ] Title Case formatting consistent: "John TestUser"
- [ ] No email usernames showing as names
- [ ] Avatar initials match: "JT"
- [ ] full_name field in database: "John TestUser"

### Fail Criteria
- Email prefix appears as name ("john.test")
- Lowercase names ("john testuser")
- Inconsistent names across pages

---

## Test 11: SSN/DOB Security (NEW - CRITICAL)

**Objective:** Verify sensitive data is protected from unauthorized access

### Setup
1. ✅ Create employee with SSN: "123-45-6789", DOB: "1990-01-15"
2. ✅ Complete onboarding
3. ✅ Log in as 3 different users:
   - Admin (role: admin)
   - Manager (position: manager)
   - Technician (position: technician)

### Test as Admin (should see full data)
1. ✅ Navigate to Employees → Active
2. ✅ Click "Manage" on test employee
3. ✅ Click "Edit Employee"

**Expected:**
- [ ] SSN field visible: "123-45-6789" (full, unmasked)
- [ ] DOB field visible: "1990-01-15"
- [ ] Can edit both fields

### Test as Manager (should NOT see full data)
1. ✅ Navigate to Employees → Active
2. ✅ Click "Manage" on test employee
3. ✅ Click "Edit Employee"

**Expected:**
- [ ] SSN field NOT visible in form
- [ ] DOB field NOT visible in form
- [ ] Alert shown: "🔒 DOB and SSN fields require CEO/Admin/Administrator permissions"
- [ ] Other fields still editable

### Test as Technician (should NOT see data)
1. ✅ Navigate to their own profile (My Profile)
2. ✅ Check if SSN/DOB is visible

**Expected:**
- [ ] SSN/DOB NOT shown in display
- [ ] If editing own profile, SSN/DOB fields disabled/hidden

---

## Test 12: Data Merge Priority

**Objective:** Verify PendingEmployee data wins over email-derived values

### Steps
1. ✅ Create PendingEmployee:
   - first_name: "María"
   - last_name: "García López"
   - email: "maria.garcia@example.com"
   - phone: "(555)999-8888"
2. ✅ Invite employee
3. ✅ Log in as employee
4. ✅ Check User record after auto-activation

### Expected Results
- [ ] full_name: "María García López" (NOT "Maria Garcia")
- [ ] Accents preserved
- [ ] Compound last names preserved
- [ ] Phone number preserved
- [ ] NO fallback to "maria.garcia" or email parsing

---

## Regression Tests

### R1: Admin Can Still Invite Multiple Users
- [ ] Invite 3 employees in quick succession
- [ ] All 3 receive emails
- [ ] All 3 can activate independently
- [ ] No data cross-contamination
- [ ] Each has unique PendingEmployee record before activation

### R2: Existing Users Not Affected
- [ ] Log in as user who completed onboarding BEFORE fix
- [ ] Verify still has app access
- [ ] Verify not forced to re-onboard
- [ ] Data intact (no fields lost)
- [ ] `onboarding_completed` flag auto-set to `true` if 3+ forms exist

### R3: Invitation Email Content
- [ ] Email subject correct
- [ ] Email body has both custom + Base44 instructions
- [ ] Links work
- [ ] No broken formatting
- [ ] Language matches employee preference (if set)

### R4: SSN Security Across All Pages
- [ ] Manager cannot see SSN in Empleados page
- [ ] Manager cannot edit SSN in EmployeeProfile
- [ ] Technician cannot see SSN in Directory
- [ ] Admin CAN see and edit SSN everywhere

---

## Performance Tests

### P1: Large Team Migration (23 Employees)
**Steps:**
1. ✅ Have 23 PendingEmployees ready
2. ✅ Invite all 23 in one batch
3. ✅ Monitor activation as they log in

**Expected:**
- [ ] All 23 migrate successfully
- [ ] No database locks
- [ ] 100% data preservation rate
- [ ] Average activation time < 5 seconds
- [ ] No timeouts

### P2: Onboarding Completion Time
**Steps:**
1. ✅ Start timer at Form 1
2. ✅ Fill out all 3 forms at normal pace
3. ✅ Stop timer when Dashboard unlocks

**Expected:**
- [ ] Total time < 5 minutes
- [ ] No delays after final submit
- [ ] Redirect happens within 2 seconds

---

## Failure Scenarios

### F1: What if Migration Fails?
**Simulate:** Manually delete PendingEmployee during auto-activation

**Expected:**
- [ ] Error logged to console
- [ ] User still activates (uses Base44 auth data + email-derived name)
- [ ] No app crash
- [ ] Admin can manually fix profile later
- [ ] employment_status still becomes "active"

### F2: What if User Closes Browser Mid-Onboarding?
**Steps:**
1. ✅ Complete Form 1 (Safety)
2. ✅ Close browser (hard close, not just tab)
3. ✅ Wait 5 minutes
4. ✅ Log back in

**Expected:**
- [ ] Resumes at Form 2 (NOT Form 1)
- [ ] Form 1 completion saved in database
- [ ] Progress bar shows 33% (1/3)
- [ ] Can complete remaining forms

### F3: What if Duplicate Forms Are Submitted?
**Steps:**
1. ✅ Complete Form 1
2. ✅ Use browser back button
3. ✅ Submit Form 1 again

**Expected:**
- [ ] Form updates existing record (not duplicate)
- [ ] Console shows: "⚠️ Form safety_acknowledgment already exists, updating..."
- [ ] Database has only 1 Form 1 record
- [ ] Progress stays at 33% (not 66%)

---

## Security Tests (NEW)

### S1: Non-Admin Cannot View SSN
**Steps:**
1. ✅ Log in as Manager
2. ✅ Navigate to Employees
3. ✅ Try to view employee SSN

**Expected:**
- [ ] SSN masked as `***-**-1234` in UI
- [ ] Full SSN not exposed in DOM/HTML
- [ ] Edit form does NOT show SSN field

### S2: Non-Admin Cannot Edit DOB
**Steps:**
1. ✅ Log in as Technician
2. ✅ Try to edit own profile
3. ✅ Look for DOB field

**Expected:**
- [ ] DOB field not visible in form
- [ ] Cannot submit DOB even via API manipulation
- [ ] Alert shown about permissions

### S3: Admin Has Full Access
**Steps:**
1. ✅ Log in as Admin
2. ✅ Edit any employee
3. ✅ Verify SSN and DOB fields

**Expected:**
- [ ] SSN visible and editable (full value)
- [ ] DOB visible and editable
- [ ] Can save changes to both fields
- [ ] Changes persist in database

---

## Automated Test Script (Optional)

```javascript
// Run in browser console after logging in as admin
async function testEmployeeFlow() {
  const testEmail = `test.${Date.now()}@example.com`;
  
  // 1. Create pending employee with full data
  const pending = await base44.entities.PendingEmployee.create({
    first_name: "Auto",
    last_name: "Test",
    email: testEmail,
    phone: "(555)999-0000",
    position: "technician",
    ssn_tax_id: "999-99-9999",
    dob: "1995-06-15",
    address: "123 Auto Test St",
    hourly_rate: 30
  });
  
  console.log('✅ Created PendingEmployee:', pending.id);
  console.log('📋 Data:', {
    name: `${pending.first_name} ${pending.last_name}`,
    ssn: pending.ssn_tax_id,
    rate: pending.hourly_rate
  });
  
  // 2. Simulate invitation (manual step)
  console.log('⚠️ MANUAL STEP: Invite user via Dashboard');
  console.log('Email to invite:', testEmail);
  
  // 3. After user completes onboarding, verify migration
  setTimeout(async () => {
    const users = await base44.entities.User.list();
    const newUser = users.find(u => u.email === testEmail);
    
    if (newUser) {
      console.log('✅ User activated');
      console.log('📊 Data Check:');
      console.log('  - Name:', newUser.full_name, '(should be "Auto Test")');
      console.log('  - SSN:', newUser.ssn_tax_id, '(should be "999-99-9999")');
      console.log('  - Rate:', newUser.hourly_rate, '(should be 30)');
      console.log('  - Onboarding:', newUser.onboarding_completed, '(should be true)');
      
      // Verify pending was deleted
      const stillPending = await base44.entities.PendingEmployee.list();
      const foundPending = stillPending.find(p => p.email === testEmail);
      console.log('  - Pending deleted:', !foundPending, '(should be true)');
    } else {
      console.error('❌ User not found after 60 seconds');
    }
  }, 60000); // Check after 1 min
}

// Run test
testEmployeeFlow();
```

---

## Success Criteria

All tests must pass with:
- ✅ 0 data loss incidents
- ✅ 0 onboarding loops
- ✅ 0 duplicate forms
- ✅ 100% migration success rate
- ✅ < 5 min average onboarding time
- ✅ DOB/SSN protected from unauthorized access
- ✅ SSN required (no photo upload)

---

## Checklist for Production Deploy

Before deploying to production:
- [ ] All 12 smoke tests passed
- [ ] All 4 regression tests passed
- [ ] All 3 security tests passed
- [ ] Performance tests show no degradation
- [ ] Failure scenarios handled gracefully
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured
- [ ] Security audit completed

---

## Known Limitations

1. **SSN Storage:** Stored in plain text (consider encryption in future)
2. **Browser Refresh:** Mid-form progress not saved (must complete form in one session)
3. **Email Changes:** If employee email changes, old data may not migrate
4. **Multiple Pending Records:** If duplicate pending records exist, only first is migrated

---

**Test Execution Date:** _________________  
**Tester Name:** _________________  
**Pass/Fail:** _________________  
**Security Review:** _________________  
**Notes:**

---

**For Issues Found:**
1. Document in KNOWN_BUGS_AUDIT.md
2. Create Jira ticket (if applicable)
3. Notify development team
4. Re-test after fix
5. If security issue: escalate immediately

---

**Last Updated:** 2026-01-02  
**Next Review:** After first production deploy  
**Security Level:** HIGH (handles PII/SSN data)