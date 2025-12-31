# Login & Profile Smoke Tests
**Date**: 2025-12-31  
**Purpose**: Validate i18n, profile hydration, and navigation fixes  
**Status**: 🧪 READY FOR MANUAL TESTING

---

## TEST 1: projects@mci-us.com Login (Manager)

### Setup
- **User**: projects@mci-us.com
- **Expected Position**: Manager or Supervisor
- **Expected Team**: (varies)
- **Browser Language**: `es-MX` (Spanish)

### Steps
1. Clear localStorage and all cookies
2. Login with projects@mci-us.com
3. Wait for app to load

### Verification Checklist
- [ ] **Language**: ✅ All UI in Spanish (no English mixed)
- [ ] **Sidebar Footer Name**: Real name shown (NOT "projects@mci-us.com")
- [ ] **Sidebar Footer Position**: Shows "Manager" or "Supervisor" (NOT "User")
- [ ] **Team Badge**: Shows team name if assigned
- [ ] **Navigation**: "Facturas" visible in FINANCE section
- [ ] **Navigation**: "Estimados" visible in FINANCE section
- [ ] **Navigation Sections**: STRATEGY, OPERATIONS, FINANCE, WORKFORCE, TIME & PAYROLL, COMPLIANCE
- [ ] **No Console Errors**: Check DevTools console (should be clean)

### Expected Result
✅ **PASS**: Spanish UI, real name, position shown, Invoices/Quotes visible

---

## TEST 2: angelo.civiero@mci-us.com Login (Administrativo)

### Setup
- **User**: angelo.civiero@mci-us.com
- **Expected Position**: Administrativo or Administrator
- **Browser Language**: `en-US` (English)

### Steps
1. Clear localStorage
2. Login with angelo.civiero@mci-us.com
3. Wait for app to load

### Verification Checklist
- [ ] **Language**: ✅ All UI in English
- [ ] **Sidebar Footer Name**: "Angelo Civiero" (NOT email)
- [ ] **Sidebar Footer Position**: Shows "Administrativo" or position
- [ ] **Navigation**: "Invoices" and "Quotes" visible
- [ ] **Approvals Hub**: Visible in COMPLIANCE section
- [ ] **Can Access**: Click Approvals Hub → should open (not blocked)

### Expected Result
✅ **PASS**: English UI, real name, can access Approvals Hub

---

## TEST 3: Language Toggle Persistence

### Steps
1. Login as any user (English by default)
2. Open language selector in sidebar footer
3. Change to Spanish
4. **Verify**: UI switches to Spanish immediately
5. Navigate to 3 different pages (Dashboard, Employees, Invoices)
6. **Verify**: All pages in Spanish
7. Refresh browser (F5)
8. **Verify**: Still Spanish after reload
9. Logout
10. Login again
11. **Verify**: Still Spanish

### Verification Checklist
- [ ] **Immediate switch**: Language changes instantly
- [ ] **All pages**: No English/Spanish mix
- [ ] **After refresh**: Persists (localStorage)
- [ ] **After logout/login**: Persists (localStorage + DB)

### Expected Result
✅ **PASS**: Language persists across sessions

---

## TEST 4: Multi-Page Consistency

### Steps
1. Login as manager (projects@mci-us.com)
2. Set language to English
3. Visit these pages IN ORDER:
   - Dashboard
   - Employees
   - Invoices
   - Quotes
   - Jobs
   - Calendar
   - My Profile
   - Payroll
   - Expenses
   - Training

### Verification Checklist
- [ ] **All pages**: 100% English (no Spanish leaks)
- [ ] **Navigation labels**: All English
- [ ] **Buttons**: All English
- [ ] **Forms**: All English
- [ ] **Toasts**: All English

### Notes
⚠️ **Known Issue**: MyProfile may have hardcoded Spanish strings (see LANGUAGE_AUDIT.md)

### Expected Result
✅ **MOSTLY PASS**: All pages consistent except MyProfile hardcoded strings

---

## TEST 5: Sidebar Footer Profile Display

### Steps
1. Login as projects@mci-us.com
2. Inspect sidebar footer (bottom left)

### Verification Checklist
- [ ] **Profile Photo**: Shows if user has one
- [ ] **Name Line 1**: Real full name (NOT email)
- [ ] **Name Line 2**: Position (e.g., "Manager") OR "Admin"/"User"
- [ ] **Name NOT**: "projects@mci-us.com" shown as name
- [ ] **Team Badge**: Shows team name if assigned

### Expected Result
✅ **PASS**: Real name, position, team badge visible

---

## TEST 6: MyProfile Page Data Completeness

### Steps
1. Login as angelo.civiero@mci-us.com
2. Navigate to "My Profile"
3. Check displayed fields

### Verification Checklist
- [ ] **Name**: "Angelo Civiero" (or real name from Employee)
- [ ] **Position**: "Administrativo" (or real position)
- [ ] **Email**: angelo.civiero@mci-us.com
- [ ] **Phone**: Shows if exists in Employee entity
- [ ] **Team Badge**: Shows team name
- [ ] **Hire Date**: Shows if exists

### Expected Result
✅ **PASS**: All fields populated from Employee entity

---

## TEST 7: Directory Consistency

### Steps
1. Login as admin
2. Go to Directory or Employees page
3. Find projects@mci-us.com in list
4. Compare data with sidebar footer

### Verification Checklist
- [ ] **Name Match**: Same name in Directory and sidebar
- [ ] **Position Match**: Same position in Directory and sidebar
- [ ] **Team Match**: Same team in Directory and sidebar

### Expected Result
✅ **PASS**: Data consistent across all views

---

## TEST 8: Manager Create Invoice (Pending Approval)

### Steps
1. Login as projects@mci-us.com (Manager)
2. Navigate to Invoices → New Invoice
3. **Verify**: Page loads (not blocked)
4. Fill customer, job, items
5. Click "Save Draft"
6. **Verify**: Toast "Invoice created"
7. Open created invoice (VerFactura)

### Verification Checklist
- [ ] **Yellow Banner**: "Pending Approval" visible
- [ ] **Send Button**: DISABLED (grayed out)
- [ ] **Button Tooltip**: Hover shows "Pending approval"
- [ ] **Console Log**: Check `approval_status: "pending_approval"`

### Expected Result
✅ **PASS**: Pending banner shown, send blocked

---

## TEST 9: Admin Approves → Send Enabled

### Steps
1. Login as Admin/CEO
2. Go to Approvals Hub
3. See pending invoice from TEST 8
4. Click "Review"
5. Add notes: "Looks good"
6. Click "Approve"
7. **Verify**: Toast "Invoice approved and provisioned"
8. Go to invoice (VerFactura)

### Verification Checklist
- [ ] **No Yellow Banner**: Banner removed after approval
- [ ] **Send Button**: ENABLED (blue/green)
- [ ] **Job Created**: Check Jobs page for auto-created job
- [ ] **Drive Folder**: Job has drive_folder_id
- [ ] **Field Sync**: Job has field_project_id (if Field enabled)

### Expected Result
✅ **PASS**: Approved, provisioned, send enabled

---

## TEST 10: Logout & Re-Login (Data Persistence)

### Steps
1. Login as projects@mci-us.com
2. Set language to Spanish
3. Update profile (add phone number)
4. Logout
5. Wait 5 seconds
6. Login again as projects@mci-us.com

### Verification Checklist
- [ ] **Language**: Still Spanish (from localStorage + DB)
- [ ] **Name**: Real name shown (NOT email reset)
- [ ] **Position**: Still shows "Manager"
- [ ] **Phone**: Shows updated phone number
- [ ] **Navigation**: Still sees admin modules (Invoices)

### Expected Result
✅ **PASS**: All data persists, no reset to email

---

## REGRESSION TESTS

### TEST R1: CEO Workflow (Should NOT Change)
**Steps:**
1. Login as CEO
2. Create invoice
3. **Verify**: NO yellow banner
4. **Verify**: Send button ENABLED immediately
5. **Verify**: Job provisions immediately

**Expected**: ✅ UNCHANGED

---

### TEST R2: Admin Workflow (Should NOT Change)
**Steps:**
1. Login as admin (role='admin')
2. Create invoice
3. **Verify**: NO yellow banner
4. **Verify**: Auto-approved
5. **Verify**: Can send immediately

**Expected**: ✅ UNCHANGED

---

### TEST R3: Client-Only User
**Steps:**
1. Login as client (has ProjectMember with role='client')
2. **Verify**: Redirects to ClientPortal
3. **Verify**: Cannot access Invoices/Quotes

**Expected**: ✅ UNCHANGED

---

## EDGE CASE TESTS

### TEST E1: User Without Employee Record
**Setup**: New user invited, no Employee entity record yet

**Steps:**
1. Login
2. **Verify**: No crash
3. **Verify**: Shows email as fallback name
4. **Verify**: Shows role translation as fallback position

**Expected**: ✅ Graceful fallback

---

### TEST E2: Position with Spaces/Special Chars
**Setup**: Position = `"Project Manager - Lead"`

**Steps:**
1. Login
2. **Verify**: Navigation = admin (includes 'manager')
3. **Verify**: Can create invoices

**Expected**: ✅ Matches correctly

---

### TEST E3: Empty Position Field
**Setup**: Employee has `position: ""`

**Steps:**
1. Login
2. **Verify**: No crash
3. **Verify**: Falls back to role-based nav (Employee nav)

**Expected**: ✅ Graceful fallback

---

## PERFORMANCE VALIDATION

### Cache Metrics
- **useEmployeeProfile**: 5 min staleTime
- **currentUser**: Infinity staleTime
- **Expected DB Calls**: 1 per login (Employee fetch)

### Steps
1. Login
2. Open DevTools Network tab
3. Navigate to 5 pages
4. **Verify**: Only 1 EmployeeDirectory query (cached)

**Expected**: ✅ No repeated queries

---

## CONSOLE LOG VERIFICATION

### Development Mode
**Steps:**
1. Set `NODE_ENV=development`
2. Login
3. Check console

**Expected Logs:**
```
🔄 Auto-activating invited user: projects@mci-us.com
📋 Merging pending employee data (safe): ['first_name', 'position', 'team_name']
✅ User activated successfully
```

### Production Mode
**Steps:**
1. Set `NODE_ENV=production`
2. Login
3. Check console

**Expected Logs:**
```
(empty - no logs)
```

**Expected**: ✅ Clean console in production

---

## FINAL CHECKLIST

- [ ] TEST 1: Manager login (name, position, nav)
- [ ] TEST 2: Administrativo login (name, Approvals Hub)
- [ ] TEST 3: Language persistence
- [ ] TEST 4: Multi-page consistency
- [ ] TEST 5: Sidebar footer profile
- [ ] TEST 6: MyProfile data completeness
- [ ] TEST 7: Directory consistency
- [ ] TEST 8: Manager create invoice (pending)
- [ ] TEST 9: Admin approve (provisioning)
- [ ] TEST 10: Logout/login persistence
- [ ] TEST R1-R3: Regression (CEO, Admin, Client)
- [ ] TEST E1-E3: Edge cases
- [ ] Performance: Cache working
- [ ] Console: Clean in production

---

## PASS CRITERIA

**MUST PASS (Critical):**
- TEST 1, 2, 8, 9, 10
- Regression tests (R1, R2, R3)

**SHOULD PASS (Important):**
- TEST 3, 4, 5, 6, 7
- Edge cases (E1, E2, E3)

**NICE TO PASS (Optional):**
- Performance validation
- Console log check

---

**Total Tests**: 16  
**Estimated Time**: 20 minutes  
**Tester**: Manual (projects@ and angelo@ logins required)