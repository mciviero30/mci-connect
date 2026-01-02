# Employee Onboarding Smoke Tests

**Last Updated:** 2026-01-02  
**Status:** READY FOR EXECUTION  
**Priority:** P0 (CRITICAL)

---

## Pre-Test Setup

### Test Environment
- [ ] Staging/Dev environment available
- [ ] Test admin account with invite permissions
- [ ] Test email addresses prepared
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

### Fail Criteria
- Multiple safety forms created
- Error thrown on duplicate submission

---

## Test 4: Partial Data Migration

**Objective:** Verify migration works with minimal data

### Steps
1. ✅ Create PendingEmployee with ONLY:
   - first_name
   - last_name
   - email
2. ✅ Invite and activate
3. ✅ Complete onboarding
4. ✅ Check profile

### Expected Results
- [ ] first_name, last_name preserved
- [ ] Other fields empty (not filled with garbage)
- [ ] No errors in console
- [ ] Onboarding completes successfully

---

## Test 5: SSN Optional Validation

**Objective:** Verify SSN is no longer required in onboarding

### Steps
1. ✅ Start fresh onboarding
2. ✅ Navigate to Paperwork form (Form 3)
3. ✅ Fill legal_full_name, dob, banking, emergency contact
4. ✅ **SKIP** ssn_or_itin field (leave empty)
5. ✅ Click Submit

### Expected Results
- [ ] Form submits successfully
- [ ] No validation error for SSN
- [ ] Onboarding completes
- [ ] User record has ssn_tax_id: null/empty

---

## Test 6: Document Upload Removal

**Objective:** Verify document uploads are no longer required

### Steps
1. ✅ Start fresh onboarding
2. ✅ Navigate to Paperwork form (Form 3)
3. ✅ Look for file upload fields

### Expected Results
- [ ] NO "Driver's License" upload field visible
- [ ] NO "Social Security Card" upload field visible
- [ ] Form has fewer fields than before
- [ ] No validation for document uploads

---

## Test 7: Onboarding Status Flags

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

### Fail Criteria
- Any flag is false/null/missing
- Timestamp is not ISO format

---

## Test 8: PendingEmployee Cleanup

**Objective:** Verify PendingEmployee record is deleted after migration

### Steps
1. ✅ Note PendingEmployee ID before invitation
2. ✅ Complete activation and onboarding
3. ✅ Query PendingEmployee table for that ID

### Expected Results
- [ ] PendingEmployee record is deleted
- [ ] Console shows: "✅ Pending record cleaned up"
- [ ] User record has all migrated data

### Audit Trail Check
Before deletion, verify PendingEmployee was updated with:
- [ ] `data_migrated_to_user: true`
- [ ] `migrated_at: <timestamp>`
- [ ] `status: "active"`

---

## Test 9: Concurrent User Login (Edge Case)

**Objective:** Verify no race conditions if user logs in multiple times during activation

### Steps
1. ✅ Invite new employee
2. ✅ Open 2 browser windows (incognito)
3. ✅ Log in with same credentials in BOTH windows simultaneously
4. ✅ Let auto-activation run in both

### Expected Results
- [ ] No errors in console
- [ ] Only 1 migration occurs (check logs)
- [ ] Both windows redirect correctly
- [ ] User data is consistent

---

## Test 10: Name Display Consistency

**Objective:** Verify name appears correctly across all pages

### Steps
1. ✅ Complete Test 1 (user with full data)
2. ✅ Navigate to:
   - Dashboard (header/welcome)
   - Employees page
   - Directory page
   - Profile page
   - Chat (if applicable)
3. ✅ Verify name display in each

### Expected Results
- [ ] Name is "John TestUser" everywhere (NOT "john.test")
- [ ] Title Case formatting consistent
- [ ] No email usernames showing as names
- [ ] Avatar initials match: "JT"

---

## Regression Tests

### R1: Admin Can Still Invite Multiple Users
- [ ] Invite 3 employees in quick succession
- [ ] All 3 receive emails
- [ ] All 3 can activate independently
- [ ] No data cross-contamination

### R2: Existing Users Not Affected
- [ ] Log in as user who completed onboarding BEFORE fix
- [ ] Verify still has app access
- [ ] Verify not forced to re-onboard
- [ ] Data intact

### R3: Invitation Email Content
- [ ] Email subject correct
- [ ] Email body has both custom + Base44 instructions
- [ ] Links work
- [ ] No broken formatting

---

## Performance Tests

### P1: Large Team Migration
- [ ] Invite 50 employees at once
- [ ] Monitor database for locks
- [ ] Check migration success rate
- [ ] Verify no timeouts

### P2: Onboarding Completion Time
- [ ] Measure time from form 1 to dashboard unlock
- [ ] Should be < 5 minutes for average user
- [ ] No delays after final submit

---

## Failure Scenarios

### F1: What if Migration Fails?
**Simulate:** Delete PendingEmployee mid-migration

**Expected:**
- [ ] Error logged to console
- [ ] User still activates (uses Base44 auth data)
- [ ] No app crash
- [ ] Admin can manually fix profile

### F2: What if User Closes Browser Mid-Onboarding?
**Steps:**
1. ✅ Complete Form 1
2. ✅ Close browser
3. ✅ Log back in

**Expected:**
- [ ] Resumes at Form 2 (not Form 1)
- [ ] Progress saved
- [ ] Can complete remaining forms

---

## Automated Test Script (Optional)

```javascript
// Run in browser console after logging in as admin
async function testEmployeeFlow() {
  const testEmail = `test.${Date.now()}@example.com`;
  
  // 1. Create pending employee
  const pending = await base44.entities.PendingEmployee.create({
    first_name: "Auto",
    last_name: "Test",
    email: testEmail,
    phone: "(555)999-0000",
    position: "technician"
  });
  
  console.log('✅ Created:', pending.id);
  
  // 2. Simulate invitation (manual step - needs Base44 invite)
  console.log('⚠️ MANUAL: Invite user via Dashboard');
  console.log('Email:', testEmail);
  
  // 3. After user completes onboarding:
  setTimeout(async () => {
    const users = await base44.entities.User.list();
    const newUser = users.find(u => u.email === testEmail);
    
    if (newUser) {
      console.log('✅ User activated:', newUser.full_name);
      console.log('✅ Onboarding:', newUser.onboarding_completed);
    } else {
      console.error('❌ User not found');
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

---

## Checklist for Production Deploy

Before deploying to production:
- [ ] All 10 smoke tests passed
- [ ] All 3 regression tests passed
- [ ] Performance tests show no degradation
- [ ] Failure scenarios handled gracefully
- [ ] Documentation updated
- [ ] Rollback plan prepared
- [ ] Monitoring alerts configured

---

**Test Execution Date:** _________________  
**Tester Name:** _________________  
**Pass/Fail:** _________________  
**Notes:**

---

**For Issues Found:**
1. Document in KNOWN_BUGS_AUDIT.md
2. Create Jira ticket (if applicable)
3. Notify development team
4. Re-test after fix

---

**Last Updated:** 2026-01-02  
**Next Review:** After first production deploy