# EMPLOYEE DATA SYNC SYSTEM - COMPLETE ARCHITECTURE
**Created:** March 22, 2026  
**Status:** ✅ Production Ready

---

## 🎯 PROBLEM STATEMENT

**Issue:** Employee names, phone numbers, team assignments, and other data from invitations weren't syncing to User records or EmployeeDirectory, causing cards to show emails instead of real names.

**Root Cause:** No bidirectional sync between EmployeeProfile (SSOT) → User → EmployeeDirectory

---

## 🏗️ ARCHITECTURE OVERVIEW

### Data Flow (3-Tier Sync Chain)

```
EmployeeInvitation (Pre-registration)
         ↓
   [User Registers]
         ↓
EmployeeProfile (SSOT for employee data)
         ↓
    User Record (Auth system integration)
         ↓
EmployeeDirectory (App-wide lookup table)
```

---

## 📊 ENTITIES & RELATIONSHIPS

### 1. **EmployeeInvitation** (Pre-Registration Bridge)
- **Purpose:** Store employee data BEFORE they register
- **Lifecycle:** Created by admin → Sent via email → User registers → Converted to EmployeeProfile
- **Key Fields:**
  - `email` (unique)
  - `first_name`, `last_name`
  - `position`, `department`, `team_id`, `team_name`
  - `phone`, `address`, `dob`, `ssn_tax_id`
  - `hourly_rate`, `role`
  - `status`: 'pending' → 'accepted'

### 2. **EmployeeProfile** (SSOT - Single Source of Truth)
- **Purpose:** Complete employee HR/payroll data (1:1 with User)
- **Relationship:** `user_id` → User.id (UNIQUE)
- **Key Fields:**
  - `user_id` (REQUIRED, UNIQUE)
  - `first_name`, `last_name`, `full_name`
  - `position`, `department`, `team_id`, `team_name`
  - `phone`, `address_line_1`, `date_of_birth`, `ssn_encrypted`
  - `hourly_rate`, `employment_status`, `is_active`

### 3. **User** (Auth + System Role)
- **Purpose:** Authentication and app access
- **Synced Fields from EmployeeProfile:**
  - `full_name`, `phone`, `position`, `department`
  - `team_id`, `team_name`, `employment_status`

### 4. **EmployeeDirectory** (Public Lookup)
- **Purpose:** Fast, read-only employee directory for app-wide lookups
- **Relationship:** `user_id` → User.id
- **Key Fields:**
  - `user_id`, `employee_email`
  - `full_name`, `first_name`, `last_name`
  - `position`, `department`, `phone`
  - `team_id`, `team_name`, `profile_photo_url`
  - `status`: 'active' | 'inactive'
  - `sync_source`, `last_synced_at`

---

## 🔄 SYNC MECHANISMS

### A. **Real-Time Auto-Sync (Entity Automation)**

**Function:** `syncEmployeeProfileToUser` (Entity Automation)
- **Trigger:** EmployeeProfile create/update
- **Action:**
  1. Sync EmployeeProfile → User
  2. Sync User → EmployeeDirectory
- **Status:** ✅ Active automation

### B. **Post-Registration Sync**

**Function:** `syncInvitationOnRegister`
- **Trigger:** User registration (manual call after auth)
- **Action:**
  1. Find EmployeeInvitation by email
  2. Create EmployeeProfile with all invitation data
  3. Run bidirectional sync (Profile → User → Directory)
  4. Mark invitation as 'accepted'

### C. **Manual Admin Sync**

**Function:** `syncAllEmployeeData`
- **Trigger:** Admin clicks "Sync All Data" button in Empleados page
- **Action:** Loops through ALL EmployeeProfiles and forces complete sync
- **Use Case:** Repair historical data issues

### D. **On-Demand Single Sync**

**Function:** `syncEmployeeDataBidirectional`
- **Trigger:** Called programmatically after profile updates
- **Action:** Syncs a single employee's data through all 3 layers

---

## 🔧 IMPLEMENTATION DETAILS

### When Employee is Invited (EmployeeInvitation created)
```javascript
// Data stored in EmployeeInvitation
{
  email: "john@example.com",
  first_name: "John",
  last_name: "Doe",
  position: "Technician",
  team_id: "team_123",
  team_name: "Atlanta",
  phone: "555-1234",
  status: "pending"
}
```

### When User Registers
```javascript
// syncInvitationOnRegister creates EmployeeProfile
{
  user_id: "user_123",
  first_name: "John",
  last_name: "Doe",
  full_name: "John Doe",
  position: "Technician",
  team_id: "team_123",
  team_name: "Atlanta",
  phone: "555-1234",
  employment_status: "active",
  is_active: true
}

// Then syncs to User
{
  id: "user_123",
  email: "john@example.com",
  full_name: "John Doe",
  phone: "555-1234",
  position: "Technician",
  team_name: "Atlanta"
}

// Then syncs to EmployeeDirectory
{
  user_id: "user_123",
  employee_email: "john@example.com",
  full_name: "John Doe",
  first_name: "John",
  last_name: "Doe",
  position: "Technician",
  team_name: "Atlanta",
  phone: "555-1234",
  status: "active"
}
```

### When Admin Edits Employee (Empleados page)
```javascript
// 1. Update EmployeeProfile
await base44.entities.EmployeeProfile.update(profile_id, {
  first_name: "John",
  last_name: "Smith",  // Changed
  phone: "555-9999",   // Changed
  team_name: "Orlando" // Changed
});

// 2. Trigger bidirectional sync
await base44.functions.invoke('syncEmployeeDataBidirectional', {
  user_id: user_id,
  profile_id: profile_id
});

// 3. Entity automation ALSO triggers (belt-and-suspenders)
// syncEmployeeProfileToUser runs automatically on EmployeeProfile update
```

---

## 🧪 TESTING PROCEDURE

### Test 1: New Employee Invitation
1. Go to Empleados page → "Add Employee"
2. Fill in: First Name, Last Name, Email, Phone, Position, Team
3. Click "Create Employee"
4. **Expected:** EmployeeInvitation created with all data
5. Send invitation email (Invitations tab → Select → Send)
6. User registers with that email
7. **Expected:** EmployeeProfile created with ALL invitation data
8. **Expected:** User record updated with name, phone, position, team
9. **Expected:** EmployeeDirectory created with complete data
10. **Verify:** Check Empleados page → employee card shows real name, phone, team
11. **Verify:** Check Directory page → same data appears

### Test 2: Edit Existing Employee
1. Go to Empleados page → Active tab
2. Click on an employee card → navigates to EmployeeProfile page
3. Click "Edit" → Change phone number and team
4. Click "Save"
5. **Expected:** EmployeeProfile updated
6. **Expected:** Bidirectional sync runs
7. **Expected:** User record updated with new data
8. **Expected:** EmployeeDirectory updated with new data
9. **Verify:** Go back to Empleados → card shows updated phone and team
10. **Verify:** Check Directory → same updates appear

### Test 3: Historical Data Repair
1. Go to Empleados page → Active tab
2. Click "Sync All Data" button (top right)
3. **Expected:** All EmployeeProfiles synced to User and EmployeeDirectory
4. **Expected:** Toast shows "✅ Synced X employees completely"
5. **Verify:** Check employee cards - all names, phones, teams should be correct

### Test 4: Automated Sync on Profile Update
1. Use Dashboard → Settings → modify user profile
2. **Expected:** Entity automation triggers automatically
3. **Expected:** Changes propagate to EmployeeDirectory
4. **Verify:** Directory page shows updated info without manual sync

---

## 📍 UI LOCATIONS

### Where Employee Data Appears:
1. **Empleados page** - Uses `ModernEmployeeCard` component
2. **Directory page** - Uses SAME `ModernEmployeeCard` component
3. **EmployeeProfile page** - Detailed view with tabs
4. **Dashboard** - Quick stats and employee widgets
5. **Time Tracking** - Employee selection dropdowns
6. **Payroll** - Employee payroll records
7. **Chat** - User names in messages
8. **Calendar** - Assignment names

### Critical Components:
- `ModernEmployeeCard.jsx` - Shared card component (single source of UI truth)
- `EditEmployeeForm.jsx` - Admin edit form
- `pages/Empleados.jsx` - Employee management
- `pages/Directory.jsx` - Employee directory

---

## 🚨 CRITICAL INVARIANTS

### Data Integrity Rules:
1. **EmployeeProfile is SSOT** - All employee data starts here
2. **User syncs FROM Profile** - User never writes to Profile
3. **Directory syncs FROM User** - Directory is read-only aggregation
4. **No manual Directory edits** - Only sync functions write to Directory
5. **team_name must match team_id** - Always write both when assigning teams

### Sync Guarantees:
- ✅ Real-time sync on EmployeeProfile update (entity automation)
- ✅ Manual sync available for admins (bulk repair)
- ✅ Post-registration sync (invitation → profile)
- ✅ All three entities stay in sync automatically

---

## 🔍 DEBUGGING

### Check Sync Status:
```javascript
// Console commands to verify sync
const profile = await base44.entities.EmployeeProfile.get('profile_id');
const user = await base44.entities.User.get(profile.user_id);
const directory = await base44.entities.EmployeeDirectory.filter({ user_id: profile.user_id });

console.log('Profile:', profile.full_name, profile.phone, profile.team_name);
console.log('User:', user.full_name, user.phone, user.team_name);
console.log('Directory:', directory[0]?.full_name, directory[0]?.phone, directory[0]?.team_name);
```

### Common Issues:
1. **Names showing as emails** → Run "Sync All Data" button
2. **Phone not appearing** → Check EmployeeProfile has phone, then sync
3. **Team not showing** → Verify team_id AND team_name are both set
4. **Directory outdated** → Entity automation should auto-sync, but can force with "Sync All Data"

---

## ✅ VALIDATION CHECKLIST

- [x] Entity automation created: EmployeeProfile → syncEmployeeProfileToUser
- [x] Bidirectional sync function created
- [x] Manual bulk sync function created
- [x] Empleados page triggers sync on edit
- [x] Directory page uses ModernEmployeeCard (same UI as Empleados)
- [x] Post-registration sync includes all invitation data
- [x] Admin "Sync All Data" button added
- [x] All queries invalidated after sync operations

---

## 🎯 NEXT STEPS FOR USER

1. **Click "Sync All Data"** button in Empleados page (Active tab)
   - This will repair all existing employee records
   - Names, phones, teams will populate across the app

2. **Verify in Directory**
   - Navigate to Directory page
   - Should see all employees with correct names, phones, teams

3. **Test Edit Flow**
   - Edit an employee in Empleados
   - Change phone or team
   - Verify changes appear in Directory immediately

4. **Future Invitations**
   - All new invitations will auto-sync on registration
   - No manual action needed

---

## 📝 SUMMARY

**What was fixed:**
1. ✅ EmployeeProfile → User sync (automatic on every profile change)
2. ✅ User → EmployeeDirectory sync (automatic cascade)
3. ✅ Post-registration sync (invitation data → profile → user → directory)
4. ✅ Manual bulk sync for historical data repair
5. ✅ Shared UI component (ModernEmployeeCard) used in both Empleados and Directory

**Result:** All employee data now flows correctly from invitation → profile → user → directory, with automatic real-time sync and manual repair capabilities.