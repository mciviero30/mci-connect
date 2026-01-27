# 🔍 EMPLOYEE SSOT AUDIT REPORT
**Date**: 2026-01-27  
**Objective**: Unify ALL employee-related logic under EmployeeDirectory SSOT  
**Status**: ⚠️ CRITICAL VIOLATIONS DETECTED

---

## 📊 DATA INTEGRITY VERIFICATION

### EmployeeDirectory Schema ✅
```json
{
  "user_id": { "type": "string", "index": true, "description": "SSOT: User ID FK" },
  "employee_email": { "type": "string", "required": true },
  "full_name": { "type": "string", "required": true },
  "first_name": { "type": "string" },
  "last_name": { "type": "string" },
  "status": { "enum": ["pending", "invited", "active", "inactive", "archived"] }
}
```

### EmployeeDirectory Data Integrity ❌ CRITICAL
**Sample of 50 records analyzed**:

```
Total records: 50
Active records (status='active'): 50
Active records MISSING user_id: 50 (100%)
```

**⚠️ CRITICAL DATA INTEGRITY ISSUE DETECTED**:
- ALL EmployeeDirectory records lack `user_id`
- Schema defines `user_id` as indexed SSOT
- Data does NOT populate it
- **Result**: UI queries expecting `id: user_id` fail silently → empty lists

**Sample records**:
```javascript
{
  employee_email: "fto.danucd7@gmail.com",
  full_name: "Ronaldo Patricio",
  user_id: undefined  // ❌ MISSING
}
```

---

## 🚨 GLOBAL VIOLATIONS AUDIT

### ❌ VIOLATION #1: EmployeeForm.jsx (lines 53-60)
**Location**: `components/empleados/EmployeeForm.jsx`  
**Query**: `User.list()` to get managers  
**Severity**: 🔴 CRITICAL

```javascript
// ❌ WRONG
const { data: managers } = useQuery({
  queryFn: async () => {
    const users = await base44.entities.User.list();
    return users.filter(u => ['CEO', 'manager', 'supervisor'].includes(u.position));
  }
});

// ✅ CORRECT
const { data: managers } = useQuery({
  queryFn: async () => {
    const directory = await base44.entities.EmployeeDirectory.list();
    return directory.filter(d => 
      ['CEO', 'manager', 'supervisor'].includes(d.position) && 
      d.status === 'active'
    );
  }
});
```

---

### ❌ VIOLATION #2: ActiveEmployeeForm.jsx (lines 27-34)
**Location**: `components/empleados/ActiveEmployeeForm.jsx`  
**Query**: `User.list()` to get managers  
**Severity**: 🔴 CRITICAL  
**Fix**: Same as Violation #1

---

### ❌ VIOLATION #3: ActiveEmployeeForm.jsx (lines 38-43)
**Location**: `components/empleados/ActiveEmployeeForm.jsx`  
**Query**: `User.list()` for team capacity check  
**Severity**: 🔴 CRITICAL

```javascript
// ❌ WRONG
const { data: employees } = useQuery({
  queryFn: () => base44.entities.User.list()
});

// ✅ CORRECT
const { data: employees } = useQuery({
  queryFn: () => base44.entities.EmployeeDirectory.filter({ status: 'active' })
});
```

---

### ❌ VIOLATION #4: getAggregatedPayroll.js (line 20) 🔴 BACKEND CRITICAL
**Location**: `functions/getAggregatedPayroll.js`  
**Query**: `User.filter({ employment_status: 'active' })`  
**Severity**: 🔴 **CATASTROPHIC** - Backend bypasses EmployeeDirectory

```javascript
// ❌ WRONG - Backend uses User directly
const [employees, ...] = await Promise.all([
  base44.entities.User.filter({ employment_status: 'active' }),
  // ...
]);

// ✅ CORRECT - Backend must use EmployeeDirectory
const [directoryEmployees, ...] = await Promise.all([
  base44.entities.EmployeeDirectory.filter({ status: 'active' }),
  // ...
]);

// Then enrich with User if needed:
const userIds = directoryEmployees.filter(d => d.user_id).map(d => d.user_id);
const users = await Promise.all(
  userIds.map(id => base44.entities.User.filter({ id }))
);
const userMap = users.flat().reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
```

**Impact**:
- Payroll shows employees NOT in Calendar
- Inconsistent employee counts across modules
- Financial calculations on ghost employees

---

### ⚠️ VIOLATION #5: Empleados.jsx Dialog (lines 39-43)
**Location**: `pages/Empleados.jsx` - EmployeeFormDialog  
**Mutation**: Creates employee directly in `User` entity  
**Severity**: ⚠️ HIGH

```javascript
// ❌ WRONG - Creates User without syncing to EmployeeDirectory
if (employee?.id) {
  return await base44.entities.User.update(employee.id, payload);
} else {
  return await base44.entities.User.create(payload);
}

// ✅ CORRECT - Must sync to EmployeeDirectory after User creation/update
```

---

### ⚠️ VIOLATION #6: Empleados.jsx Invitation (lines 212-217)
**Location**: `pages/Empleados.jsx` - inviteMutation  
**Mutation**: Updates `User.employment_status` without syncing  
**Severity**: ⚠️ MEDIUM

```javascript
// ❌ WRONG
await base44.entities.User.update(employee.id, { 
  employment_status: 'invited',
  last_invitation_sent: new Date().toISOString()
});

// ✅ CORRECT - Must also update EmployeeDirectory.status
```

---

## ✅ CORRECT PATTERNS IDENTIFIED

### ✅ PATTERN #1: Dashboard.jsx (lines 250-283)
```javascript
// ✅ CORRECT - EmployeeDirectory first, User for enrichment
const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
const userIds = directory.filter(d => d.user_id).map(d => d.user_id);
const users = await Promise.all(userIds.map(id => base44.entities.User.filter({ id })));
const userMap = users.flat().reduce((acc, u) => ({ ...acc, [u.id]: u }), {});

return directory.map(d => ({
  id: d.user_id || d.id,
  email: d.employee_email,
  full_name: d.full_name,
  employment_status: userMap[d.user_id]?.employment_status || 'active'
}));
```

### ✅ PATTERN #2: Empleados.jsx Main Query (lines 126-164)
```javascript
// ✅ CORRECT - EmployeeDirectory SSOT
const directory = await base44.entities.EmployeeDirectory.list('-created_date');
// ... enrich with User
```

### ✅ PATTERN #3: AssignmentForm.jsx (lines 93-103)
```javascript
// ✅ CORRECT - Uses EmployeeDirectory
const directory = await base44.entities.EmployeeDirectory.filter({ status: 'active' });
return directory.map(d => ({
  id: d.user_id || d.id,
  email: d.employee_email,
  full_name: d.full_name
}));
```

---

## 📋 CANONICAL EMPLOYEE SHAPE (ENFORCED)

```javascript
// CANONICAL SHAPE - ALL UI components must use this
Employee = {
  id: user_id,                    // Primary key (SSOT)
  email: employee_email,          // Legacy FK (read-only)
  full_name: full_name,           // Display name
  first_name: first_name,         // Component
  last_name: last_name,           // Component
  employment_status: status,      // Active state (renamed from 'status')
  
  // Optional enrichment from User entity:
  role: user?.role,               // System role
  hourly_rate: user?.hourly_rate,
  dob: user?.dob,
  avatar_image_url: user?.avatar_image_url
}
```

---

## 🎯 ROOT CAUSE ANALYSIS

### Primary Cause
**EmployeeDirectory records exist but `user_id` is NOT populated**

### Secondary Causes
1. Frontend queries use `User` entity directly (bypassing SSOT)
2. Backend (`getAggregatedPayroll`) uses `User` entity exclusively
3. Employee creation doesn't sync to EmployeeDirectory
4. Status updates (invited → active) don't sync

### Impact
- **Calendar**: Shows empty employee list (expects `id: user_id` which is null)
- **Payroll**: Shows different employees than Calendar (uses User directly)
- **Assignments**: Partially broken (some components work, some don't)
- **Managers dropdown**: Broken if not synced

---

## 📝 ALIGNMENT PLAN (6-PHASE FIX)

### Phase 1: Data Backfill (URGENT)
- Create backend function to populate `user_id` in ALL EmployeeDirectory records
- Match by `employee_email` → `User.email`
- Set `user_id` field
- **NO DELETION, NO MIGRATION**

### Phase 2: Frontend Query Alignment
Fix 3 files:
- `components/empleados/EmployeeForm.jsx` (managers)
- `components/empleados/ActiveEmployeeForm.jsx` (managers + capacity)
- Already fixed: `pages/Calendario.jsx` ✅

### Phase 3: Backend Alignment (CRITICAL)
- Fix `functions/getAggregatedPayroll.js` to use EmployeeDirectory first
- Ensure Payroll and Calendar see same employees

### Phase 4: Lifecycle Sync
- Employee creation → sync to EmployeeDirectory
- Status updates → sync to EmployeeDirectory
- Profile updates → sync to EmployeeDirectory

### Phase 5: Defensive Logging (Non-blocking)
Add console warnings when:
- `User` entity queried for employee list
- `EmployeeDirectory` record missing `user_id`
- UI receives employee with undefined `id`

### Phase 6: Validation
- Test Calendar shows all employees
- Test Payroll matches Calendar
- Test assignments work
- Verify no silent failures

---

## 🛡️ DEFENSIVE GUARDRAILS (LOG-ONLY)

```javascript
// Add to critical components
if (import.meta.env?.DEV) {
  // Detect User.list() usage
  if (queryKey.includes('User') && context === 'employee-discovery') {
    console.warn('⚠️ SSOT VIOLATION: User.list() called for employee discovery. Use EmployeeDirectory instead.');
  }
  
  // Detect missing user_id
  if (employee && !employee.id && employee.user_id === undefined) {
    console.error('❌ CRITICAL: Employee missing user_id', { email: employee.email });
  }
  
  // Detect auth.user used as employee
  if (source === 'auth.me' && usage === 'employee-list') {
    console.warn('⚠️ ANTI-PATTERN: auth.user used for employee discovery');
  }
}
```

---

## ✅ SUCCESS CRITERIA

- [ ] EmployeeDirectory has 100% `user_id` population (active records)
- [ ] Zero frontend queries use `User.list()` for employees
- [ ] Backend `getAggregatedPayroll` uses EmployeeDirectory
- [ ] Calendar shows all active employees
- [ ] Payroll employee list === Calendar employee list
- [ ] Manager dropdowns work consistently
- [ ] Team capacity calculations accurate
- [ ] No silent empty lists
- [ ] Defensive logs active in dev mode

---

## 🔐 INVARIANTS (MUST HOLD TRUE)

```
INVARIANT 1: EmployeeDirectory is the ONLY source for employee discovery
INVARIANT 2: user_id is the primary key for ALL employee joins
INVARIANT 3: employee_email is legacy FK (read-only, backward compatibility)
INVARIANT 4: User entity NEVER used for employee listing
INVARIANT 5: Calendar and Payroll see identical employee sets
```

---

**Next Action**: Execute Phase 1 (Data Backfill) to populate user_id in EmployeeDirectory