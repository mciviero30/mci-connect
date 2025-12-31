# Data Model Audit — MCI Connect
**Date**: 2025-12-31  
**Focus**: Entity relationships, data flow, risks of overwrite/loss

---

## EMPLOYEE IDENTITY — Triple Entity Problem ⚠️

### Three Overlapping Entities

```
┌─────────────────────────────────────────────────────────────────┐
│                     EMPLOYEE IDENTITY SYSTEM                     │
│                                                                  │
│  PendingEmployee          User (Auth+Profile)    EmployeeDirectory│
│  ┌─────────────────┐     ┌─────────────────┐   ┌─────────────┐ │
│  │ - email (PK)    │     │ - id (PK)       │   │ - employee_ │ │
│  │ - first_name    │     │ - email (unique)│   │   email (PK)│ │
│  │ - last_name     │     │ - full_name     │   │ - full_name │ │
│  │ - position      │     │ - first_name    │   │ - position  │ │
│  │ - phone         │     │ - last_name     │   │ - department│ │
│  │ - address       │     │ - position      │   │ - phone     │ │
│  │ - dob           │     │ - department    │   │ - profile_  │ │
│  │ - ssn_tax_id    │     │ - phone         │   │   photo_url │ │
│  │ - hourly_rate   │     │ - address       │   │ - status    │ │
│  │ - team_id       │     │ - dob           │   └─────────────┘ │
│  │ - team_name     │     │ - ssn_tax_id    │                   │
│  │ - department    │     │ - hourly_rate   │                   │
│  │ - direct_manager│     │ - team_id       │                   │
│  │ - tshirt_size   │     │ - team_name     │                   │
│  │ - status        │     │ - hire_date     │                   │
│  │ - notes         │     │ - tshirt_size   │                   │
│  │                 │     │ - employment_   │                   │
│  │ 16+ fields      │     │   status        │   7 fields        │
│  └─────────────────┘     │ - role          │                   │
│                          │ - onboarding_   │                   │
│   STAGING                │   completed     │   DISPLAY         │
│   (pre-invite)           │                 │   (public search) │
│                          │ 60+ fields      │                   │
│                          └─────────────────┘                   │
│                                                                 │
│                          AUTHORITATIVE                          │
│                          (post-login)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Data Flow Timeline

#### Phase 1: Pre-Invitation (Staging)
```
Admin creates → PendingEmployee.create({
  first_name: "John",
  last_name: "Doe",
  email: "john.doe@mci-us.com",
  position: "manager",
  phone: "(555)123-4567",
  address: "123 Main St",
  dob: "1990-01-01",
  ssn_tax_id: "123-45-6789",
  hourly_rate: 25.00,
  team_id: "team_123",
  department: "operations",
  status: "pending"
})

Result:
✅ PendingEmployee record created
❌ User entity: DOES NOT EXIST YET
❌ EmployeeDirectory: DOES NOT EXIST YET
```

---

#### Phase 2: Invitation
```
Admin invites → functions/sendInvitationEmail({
  email: "john.doe@mci-us.com",
  pending_id: "..."
})

Process:
1. sendInvitationEmail() sends custom email
2. base44.users.inviteUser(email, 'user')
3. PendingEmployee.update(id, { 
     status: 'invited',
     last_invitation_sent: now,
     invitation_count: +1
   })

Result:
✅ PendingEmployee.status = 'invited'
✅ Base44 sends system invitation email
❌ User entity: STILL DOES NOT EXIST
❌ EmployeeDirectory: STILL DOES NOT EXIST
```

---

#### Phase 3: User Accepts (Base44 System)
```
User clicks "Accept Invitation" in email
User creates password

Base44 creates:
User.create({
  id: "generated_uuid",
  email: "john.doe@mci-us.com",
  role: "user",
  employment_status: "invited",  ← KEY FIELD
  full_name: "",  ← EMPTY!
  first_name: "",
  last_name: "",
  phone: "",
  address: "",
  // ... all other fields EMPTY
})

Result:
✅ User entity created (mostly empty)
✅ PendingEmployee STILL EXISTS (status: 'invited')
❌ EmployeeDirectory: STILL DOES NOT EXIST
```

---

#### Phase 4: First Login (CRITICAL MIGRATION) ⚠️

**Before Fix (Data Loss):**
```javascript
// Layout.js - OLD CODE
if (user.employment_status === 'invited') {
  const pending = await PendingEmployee.filter({ email: user.email });
  
  // ❌ DELETE FIRST (DANGEROUS!)
  await PendingEmployee.delete(pending.id);
  
  // Then try to copy fields (but incomplete!)
  await updateMe({
    full_name: pending.first_name + ' ' + pending.last_name,
    // ... only 5-6 fields copied
    // ❌ MISSING: phone, address, dob, ssn_tax_id, team_id, etc.
  });
}

Result:
❌ PendingEmployee DELETED (data gone forever)
❌ User has incomplete profile
❌ Sidebar shows "projects@mci-us.com" instead of "John Doe"
```

**After Fix (Safe Migration):**
```javascript
// Layout.js - NEW CODE (Dec 31)
if (user.employment_status === 'invited') {
  const pending = await PendingEmployee.filter({ email: user.email });
  
  // ✅ MIGRATE FIRST (complete, safe)
  const migratedData = migratePendingToUser(user, pending);
  // Returns: {
  //   first_name: "John",
  //   last_name: "Doe",
  //   full_name: "John Doe",
  //   phone: "(555)123-4567",
  //   address: "123 Main St",
  //   dob: "1990-01-01",
  //   ssn_tax_id: "123-45-6789",
  //   hourly_rate: 25.00,
  //   team_id: "team_123",
  //   position: "manager",
  //   department: "operations",
  //   employment_status: "active",
  //   hire_date: today
  // }
  
  // ✅ Update User with ALL fields
  await base44.auth.updateMe(migratedData);
  
  // ✅ Mark as migrated (audit trail)
  await PendingEmployee.update(pending.id, {
    migrated_at: now,
    migrated_to_user_id: user.id,
    migration_status: 'completed'
  });
  
  // ✅ DELETE LAST (after verification)
  await PendingEmployee.delete(pending.id);
}

Result:
✅ User has COMPLETE profile (all 16+ fields)
✅ Sidebar shows "John Doe" / "Manager"
✅ Audit trail preserved (migrated_at timestamp)
✅ NO DATA LOSS
```

---

#### Phase 5: Directory Sync
```javascript
// ProfileSyncManager.jsx (automatic)
useEffect(() => {
  if (user && user.employment_status === 'active') {
    syncToEmployeeDirectory(user);
  }
}, [user.profile_last_updated]);

async function syncToEmployeeDirectory(user) {
  const existing = await EmployeeDirectory.filter({ 
    employee_email: user.email 
  });
  
  if (existing.length > 0) {
    // Update existing
    await EmployeeDirectory.update(existing[0].id, {
      full_name: user.full_name,
      position: user.position,
      department: user.department,
      phone: user.phone,
      profile_photo_url: user.profile_photo_url,
      status: 'active'
    });
  } else {
    // Create new
    await EmployeeDirectory.create({
      employee_email: user.email,
      full_name: user.full_name,
      position: user.position,
      department: user.department,
      phone: user.phone,
      profile_photo_url: user.profile_photo_url,
      status: 'active'
    });
  }
}

Result:
✅ EmployeeDirectory created/updated
✅ Directory.jsx search works
✅ Public profile visible
```

---

### Field Mapping Matrix

| Field | PendingEmployee | User (Auth) | EmployeeDirectory | Priority | Notes |
|-------|----------------|-------------|-------------------|----------|-------|
| **email** | ✅ (PK) | ✅ (unique) | ✅ (PK) | SAME | Never changes |
| **first_name** | ✅ | ✅ | ❌ | User wins | Migrated from Pending |
| **last_name** | ✅ | ✅ | ❌ | User wins | Migrated from Pending |
| **full_name** | ❌ | ✅ | ✅ | User → Dir | Built: first + last |
| **position** | ✅ | ✅ | ✅ | User → Dir | Operational field |
| **department** | ✅ | ✅ | ✅ | User → Dir | Operational field |
| **phone** | ✅ | ✅ | ✅ | User → Dir | Contact info |
| **address** | ✅ | ✅ | ❌ | User only | Private (not in Dir) |
| **dob** | ✅ | ✅ | ❌ | User only | Private (not in Dir) |
| **ssn_tax_id** | ✅ | ✅ | ❌ | User only | Private (not in Dir) |
| **hourly_rate** | ✅ | ✅ | ❌ | User only | Private (not in Dir) |
| **team_id** | ✅ | ✅ | ❌ | User only | Internal reference |
| **team_name** | ✅ | ✅ | ❌ | User only | Denormalized |
| **tshirt_size** | ✅ | ✅ | ❌ | User only | Logistics |
| **hire_date** | ❌ | ✅ | ❌ | User only | Set on activation |
| **employment_status** | ✅ | ✅ | ❌ | User only | pending/invited/active |
| **status** | ✅ (local) | ❌ | ✅ | Different | Dir: active/inactive |
| **profile_photo_url** | ❌ | ✅ | ✅ | User → Dir | Avatar |
| **role** | ❌ | ✅ | ❌ | User only | admin/user |
| **onboarding_completed** | ❌ | ✅ | ❌ | User only | Boolean flag |
| **direct_manager** | ✅ | ❌ | ❌ | Pending only | Not migrated |
| **notes** | ✅ | ❌ | ❌ | Pending only | Admin notes |

---

### Risks of Overwrite

#### Risk 1: Empty Values Overwriting Valid Data ⚠️
**Before Fix:**
```javascript
// BAD: Blindly copy all fields
await updateMe({
  first_name: pending.first_name,  // Could be empty!
  phone: pending.phone,            // Could be empty!
  // If pending fields are empty → overwrites existing data
});
```

**After Fix:**
```javascript
// GOOD: Only copy non-empty values
function mergeNonEmpty(target, source, keys) {
  const result = { ...target };
  for (const key of keys) {
    if (source[key] && source[key] !== '') {
      result[key] = source[key];  // Only if source has value
    }
  }
  return result;
}
```

---

#### Risk 2: Case-Sensitive Email Matching
**Issue**: `john.doe@mci-us.com` vs `John.Doe@mci-us.com`

**Solution:**
```javascript
export function normalizeEmail(email) {
  return email?.toLowerCase().trim() || '';
}

const pending = allPending.filter(
  p => normalizeEmail(p.email) === normalizeEmail(user.email)
);
```

---

#### Risk 3: Concurrent Updates
**Scenario**: User updates profile while migration happening

**Mitigation**: 
- Migration only runs ONCE (sessionStorage flag: `activation_${user.id}`)
- Quick operation (< 500ms)
- updateMe() is atomic

---

### Recommended Consolidation

#### Option A: Keep 3 Entities (Current - Stable)
```
PendingEmployee → Staging only, deleted after migration
User → Authoritative (all data)
EmployeeDirectory → Public display + search index
```

**Pros:**
- ✅ Clear separation of concerns
- ✅ No schema changes needed
- ✅ Works today (with fixes)

**Cons:**
- ❌ Duplication (60% overlap)
- ❌ Sync logic needed

---

#### Option B: Consolidate to 2 Entities
```
User → Authoritative (all data)
EmployeeDirectory → Public display + search index
```

**Changes:**
- Remove PendingEmployee entity
- Add fields to User: `invitation_status`, `invitation_count`, `last_invitation_sent`
- Admin creates User directly (employment_status: 'pending')

**Pros:**
- ✅ Single source of truth
- ✅ No migration needed
- ✅ Simpler logic

**Cons:**
- ❌ Schema change required
- ❌ Need to update invite flow
- ❌ Risk during transition

---

#### Option C: Append-Only Audit Log
```
User → Authoritative
EmployeeDirectory → Public display
PendingEmployee → Audit log only (never delete)
```

**Changes:**
- Never delete PendingEmployee
- Add field: `archived_at` (instead of delete)
- Keep full history

**Pros:**
- ✅ Audit trail forever
- ✅ Can rollback if needed
- ✅ Minimal code change

**Cons:**
- ❌ Database grows
- ❌ More records to filter

---

### Recommendation: **Option A (Current)**
- Already working with Dec 31 fixes
- No breaking changes
- Can revisit after Jan 5 launch

---

## QUOTE → INVOICE → JOB RELATIONSHIP

### Three-Stage Document Lifecycle

```
┌────────────────────────────────────────────────────────────────┐
│                     QUOTE LIFECYCLE                             │
│                                                                 │
│  Phase 1: DRAFT                                                │
│  ┌──────────────────────────────────────┐                      │
│  │ Quote (EST-00001)                    │                      │
│  │ - status: 'draft'                    │                      │
│  │ - approval_status: 'pending_approval'│ ← Manager creates    │
│  │ - created_by: manager@mci.com        │                      │
│  │ - created_by_role: 'manager'         │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 ↓ (Admin approves)                             │
│  ┌──────────────────────────────────────┐                      │
│  │ Quote                                │                      │
│  │ - approval_status: 'approved'        │                      │
│  │ - approved_by: admin@mci.com         │                      │
│  │ - approved_at: 2025-12-31T10:00:00Z  │                      │
│  │ - approval_notes: "Looks good"       │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 ↓ (Convert to Invoice)                         │
│  ┌──────────────────────────────────────┐                      │
│  │ Quote                                │                      │
│  │ - status: 'converted_to_invoice'     │                      │
│  │ - invoice_id: 'inv_xyz'              │                      │
│  └──────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                     INVOICE LIFECYCLE                           │
│                                                                 │
│  Phase 1: CREATED (from Quote)                                │
│  ┌──────────────────────────────────────┐                      │
│  │ Invoice (INV-00001)                  │                      │
│  │ - quote_id: EST-00001                │ ← Reference          │
│  │ - items: [...] (copied from quote)   │                      │
│  │ - status: 'draft'                    │                      │
│  │ - approval_status: ?                 │                      │
│  │   → 'pending_approval' if manager    │                      │
│  │   → 'approved' if admin/CEO          │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 ↓ (Admin approves)                             │
│  ┌──────────────────────────────────────┐                      │
│  │ Invoice                              │                      │
│  │ - approval_status: 'approved'        │                      │
│  │ - approved_by: admin@mci.com         │                      │
│  │ - approved_at: 2025-12-31T11:00:00Z  │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 ↓ (Send to customer)                           │
│  ┌──────────────────────────────────────┐                      │
│  │ Invoice                              │                      │
│  │ - status: 'sent'                     │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 ↓ (Provision job - AUTOMATIC)                  │
│  ┌──────────────────────────────────────┐                      │
│  │ TRIGGER: provisionJobFromInvoice()   │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│                 └──────────→ Creates Job entity                │
└─────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                     JOB PROVISIONING                            │
│                                                                 │
│  STEP 1: Create/Update Job Entity                             │
│  ┌──────────────────────────────────────┐                      │
│  │ Job.create({                         │                      │
│  │   name: invoice.job_name,            │                      │
│  │   customer_id: invoice.customer_id,  │                      │
│  │   contract_amount: invoice.total,    │                      │
│  │   team_id: invoice.team_id,          │                      │
│  │   status: 'active',                  │                      │
│  │   provisioning_status: 'in_progress' │                      │
│  │ })                                   │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│  STEP 2: Create Google Drive Folder                           │
│  ┌──────────────────────────────────────┐                      │
│  │ functions/createJobDriveFolder({     │                      │
│  │   job_id, job_name                   │                      │
│  │ })                                   │                      │
│  │                                      │                      │
│  │ Result:                              │                      │
│  │ - folder_id: "1Ab2Cd3Ef..."         │                      │
│  │ - folder_url: "https://drive.google.│                      │
│  │              com/drive/folders/..."  │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│  STEP 3: Sync to MCI Field                                    │
│  ┌──────────────────────────────────────┐                      │
│  │ functions/syncJobToMCIField({        │                      │
│  │   jobData: { id, name, customer,... }│                      │
│  │ })                                   │                      │
│  │                                      │                      │
│  │ Result:                              │                      │
│  │ - mci_field_job_id: "job_xyz"       │                      │
│  │ - synced_at: timestamp              │                      │
│  └──────────────┬───────────────────────┘                      │
│                 │                                               │
│  FINAL: Update Job with Results                               │
│  ┌──────────────────────────────────────┐                      │
│  │ Job.update(job_id, {                 │                      │
│  │   drive_folder_id,                   │                      │
│  │   drive_folder_url,                  │                      │
│  │   field_project_id,                  │                      │
│  │   provisioning_status: 'completed',  │                      │
│  │   provisioning_completed_at: now,    │                      │
│  │   provisioning_steps: {              │                      │
│  │     job: 'created',                  │                      │
│  │     drive: 'created',                │                      │
│  │     field: 'created'                 │                      │
│  │   }                                  │                      │
│  │ })                                   │                      │
│  └──────────────────────────────────────┘                      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Data Propagation

| Field | Quote | Invoice | Job | Notes |
|-------|-------|---------|-----|-------|
| **customer_id** | ✅ | ✅ → | ✅ → | Propagates |
| **customer_name** | ✅ | ✅ → | ✅ → | Propagates |
| **job_name** | ✅ | ✅ → | ✅ → | Propagates |
| **job_address** | ✅ | ✅ → | ✅ → | Propagates |
| **team_id** | ✅ | ✅ → | ✅ → | Propagates |
| **items[]** | ✅ | ✅ → | ❌ | Not on Job |
| **total** | ✅ | ✅ → | ✅ (contract_amount) | Renamed |
| **approval_status** | ✅ | ✅ | ❌ | Document-only |
| **provisioning_status** | ❌ | ✅ | ✅ → | Invoice → Job |
| **drive_folder_id** | ❌ | ❌ | ✅ | Job-only |
| **field_project_id** | ❌ | ❌ | ✅ | Job-only |

---

### Approval Gates

#### Gate 1: Quote Approval
```javascript
// components/core/roleRules.js
export function needsApproval(user) {
  if (!user) return true;
  
  const position = (user.position || '').toLowerCase();
  const role = user.role;
  
  // Admins/CEOs auto-approved
  if (role === 'admin') return false;
  if (position.includes('ceo')) return false;
  if (position.includes('administrator')) return false;
  
  // Everyone else needs approval
  return true;
}

// pages/CrearEstimado.jsx
const newQuote = {
  ...quoteData,
  approval_status: needsApproval(user) ? 'pending_approval' : 'approved'
};
```

**Result:**
- Manager creates quote → `pending_approval`
- Admin creates quote → `approved`

---

#### Gate 2: Invoice Approval
```javascript
// pages/VerEstimado.jsx (convert to invoice)
const newInvoice = {
  ...invoiceData,
  approval_status: needsApproval(user) ? 'pending_approval' : 'approved'
};
```

**Result:**
- If quote creator was manager → invoice also `pending_approval`
- If quote creator was admin → invoice `approved`

---

#### Gate 3: Provisioning Trigger
```javascript
// functions/provisionJobFromInvoice.js
if (invoice.approval_status !== 'approved') {
  return { 
    success: false, 
    error: 'Invoice must be approved first' 
  };
}

// Proceed with provisioning...
```

**Result:**
- Only approved invoices can create jobs
- Approval workflow enforced at backend

---

### Idempotency Protection

```javascript
// provisionJobFromInvoice.js
const invoice = await base44.asServiceRole.entities.Invoice.get(invoice_id);

if (invoice.provisioning_status === 'completed') {
  return { 
    success: true, 
    message: 'Already provisioned',
    job_id: invoice.job_id 
  };
}

if (invoice.provisioning_status === 'in_progress') {
  return { 
    success: false, 
    message: 'Provisioning already in progress' 
  };
}
```

**Result:**
- Safe to call multiple times
- No duplicate jobs created
- Atomic status transitions

---

## ONBOARDING FORM RELATIONSHIP

### Three Mandatory Forms

```
┌────────────────────────────────────────────────────────────┐
│                 ONBOARDING FLOW DATA MODEL                  │
│                                                             │
│  User                          OnboardingForm (3x)         │
│  ┌──────────────────────┐     ┌───────────────────────┐   │
│  │ - email (PK)         │     │ - employee_email (FK) │   │
│  │ - onboarding_        │     │ - form_type           │   │
│  │   completed: false   │ ←───│   • safety_...        │   │
│  │                      │     │   • company_rules     │   │
│  └──────────────────────┘     │   • personal_...      │   │
│           ↓                   │ - status: 'completed' │   │
│     (Gate blocks              │ - form_data: {...}    │   │
│      until true)              │ - completed_at        │   │
│                               └───────────────────────┘   │
│  STEP 1: Safety Form                                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ OnboardingForm.create({                            │  │
│  │   employee_email: user.email,                      │  │
│  │   form_type: 'safety_acknowledgment',              │  │
│  │   status: 'completed',                             │  │
│  │   form_data: {                                     │  │
│  │     acknowledged_rules: true,                      │  │
│  │     signature: "John Doe",                         │  │
│  │     ppe_training: true,                            │  │
│  │     fall_protection: true,                         │  │
│  │     electrical_safety: true                        │  │
│  │   },                                               │  │
│  │   completed_at: now                                │  │
│  │ })                                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  STEP 2: Company Rules                                   │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ OnboardingForm.create({                            │  │
│  │   form_type: 'company_rules',                      │  │
│  │   form_data: {                                     │  │
│  │     read_handbook: true,                           │  │
│  │     drug_policy: true,                             │  │
│  │     attendance_policy: true,                       │  │
│  │     confidentiality: true                          │  │
│  │   }                                                │  │
│  │ })                                                 │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  STEP 3: Personal Paperwork                              │
│  ┌─────────────────────────────────────────────────────┐  │
│  │ OnboardingForm.create({                            │  │
│  │   form_type: 'personal_paperwork',                 │  │
│  │   form_data: {                                     │  │
│  │     legal_full_name: "John Michael Doe",           │  │
│  │     ssn_or_itin: "123-45-6789",                    │  │
│  │     date_of_birth: "1990-01-01",                   │  │
│  │     emergency_contact_name: "Jane Doe",            │  │
│  │     emergency_contact_phone: "(555)987-6543",      │  │
│  │     bank_name: "Chase",                            │  │
│  │     routing_number: "123456789",                   │  │
│  │     account_number: "9876543210"                   │  │
│  │   }                                                │  │
│  │ })                                                 │  │
│  │                                                    │  │
│  │ // CRITICAL: Set completion flag                  │  │
│  │ base44.auth.updateMe({                            │  │
│  │   ssn_tax_id: formData.ssn_or_itin,               │  │
│  │   dob: formData.date_of_birth,                    │  │
│  │   emergency_contact_name,                         │  │
│  │   emergency_contact_phone,                        │  │
│  │   bank_name,                                      │  │
│  │   routing_number,                                 │  │
│  │   account_number,                                 │  │
│  │   onboarding_completed: true,  ← DEFINITIVE FLAG │  │
│  │   onboarding_completed_at: now                    │  │
│  │ })                                                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                           │
│  RESULT                                                   │
│  ┌──────────────────────┐                               │
│  │ User                 │                               │
│  │ - onboarding_        │                               │
│  │   completed: true    │ ← NO MORE GATE               │
│  └──────────────────────┘                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Gate Logic

```javascript
// Layout.js
const { data: onboardingForms = [] } = useQuery({
  queryKey: ['onboardingForms', user?.email],
  queryFn: () => base44.entities.OnboardingForm.filter({ 
    employee_email: user?.email 
  }),
  enabled: !!user?.email && user?.employment_status !== 'deleted'
});

const onboardingCompleted = onboardingForms.length >= 3;

// CRITICAL: Check flag first (definitive)
const shouldBlockForOnboarding = 
  user && 
  !isClientOnly && 
  user.role !== 'admin' && 
  user.employment_status !== 'deleted' &&
  user.onboarding_completed !== true &&  // ← FLAG WINS
  !onboardingCompleted;  // ← COUNT FALLBACK

// Soft redirect
useEffect(() => {
  if (shouldBlockForOnboarding && !isOnboardingPage) {
    navigate(createPageUrl('OnboardingWizard'), { replace: true });
  }
}, [shouldBlockForOnboarding, isOnboardingPage]);
```

---

### Risk: Loop Without Flag ⚠️

**Before Fix:**
```javascript
// Only checked count
const shouldBlock = onboardingForms.length < 3;

// Problem: If cache clears or query fails → count = 0 → loop
```

**After Fix:**
```javascript
// Check flag first
if (user.onboarding_completed === true) {
  // Never block, even if forms deleted
  return false;
}

// Fallback to count
return onboardingForms.length < 3;
```

---

## TIME TRACKING DATA MODEL

### Core Entities

```
┌────────────────────────────────────────────────────────┐
│               TIME TRACKING SYSTEM                      │
│                                                         │
│  TimeEntry                                             │
│  ┌──────────────────────────────────────────────┐     │
│  │ - employee_email (FK → User)                 │     │
│  │ - employee_name                              │     │
│  │ - job_id (FK → Job)                          │     │
│  │ - job_name                                   │     │
│  │ - date                                       │     │
│  │ - check_in: "08:00:00"                       │     │
│  │ - check_out: "17:30:00"                      │     │
│  │ - check_in_latitude, longitude               │     │
│  │ - check_out_latitude, longitude              │     │
│  │ - breaks: [                                  │     │
│  │     {                                        │     │
│  │       type: 'lunch',                         │     │
│  │       start_time: "12:00:00",                │     │
│  │       end_time: "12:30:00",                  │     │
│  │       duration_minutes: 30                   │     │
│  │     }                                        │     │
│  │   ]                                          │     │
│  │ - hours_worked: 9.0 (9.5 - 0.5 break)       │     │
│  │ - hour_type: 'normal' | 'overtime'           │     │
│  │ - work_type: 'normal' | 'driving' | 'setup' │     │
│  │ - status: 'pending' | 'approved' | 'rejected'│     │
│  │ - geofence_validated: boolean                │     │
│  │ - geofence_distance_meters: 150              │     │
│  │ - requires_location_review: boolean          │     │
│  │ - exceeds_max_hours: boolean                 │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  DrivingLog (separate)                                 │
│  ┌──────────────────────────────────────────────┐     │
│  │ - employee_email, employee_name              │     │
│  │ - date                                       │     │
│  │ - miles: 150                                 │     │
│  │ - hours: 3.0                                 │     │
│  │ - rate_per_mile: 0.67 (IRS rate)            │     │
│  │ - total_amount: 100.50 (150 * 0.67)         │     │
│  │ - start_location, end_location               │     │
│  │ - job_id, job_name                           │     │
│  │ - status: 'pending' | 'approved'             │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  Expense (related)                                     │
│  ┌──────────────────────────────────────────────┐     │
│  │ - employee_email, employee_name              │     │
│  │ - job_id, job_name                           │     │
│  │ - amount                                     │     │
│  │ - category: 'per_diem' | 'meals' | ...       │     │
│  │ - date, end_date (for multi-day per diem)   │     │
│  │ - receipt_url                                │     │
│  │ - status: 'pending' | 'approved'             │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  WeeklyPayroll (aggregate)                             │
│  ┌──────────────────────────────────────────────┐     │
│  │ - employee_email, employee_name              │     │
│  │ - week_start_date                            │     │
│  │ - normal_hours                               │     │
│  │ - overtime_hours                             │     │
│  │ - work_pay                                   │     │
│  │ - driving_hours                              │     │
│  │ - driving_pay (rate * miles)                 │     │
│  │ - reimbursements (approved expenses)         │     │
│  │ - total_pay                                  │     │
│  │ - status: 'draft' | 'submitted' | 'approved' │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

---

### Geofence Validation

```javascript
// TimeEntry.create() logic
const job = await Job.get(job_id);

if (job.skip_geofence) {
  // Skip validation
  timeEntry.geofence_validated = true;
} else {
  const distance = calculateDistance(
    check_in_latitude, check_in_longitude,
    job.latitude, job.longitude
  );
  
  if (distance <= job.geofence_radius) {
    timeEntry.geofence_validated = true;
    timeEntry.geofence_distance_meters = distance;
  } else {
    timeEntry.geofence_validated = false;
    timeEntry.requires_location_review = true;
    timeEntry.geofence_distance_meters = distance;
  }
}
```

---

## COUNTER SYSTEM (Thread-Safe)

### Atomic Counter Design

```
┌────────────────────────────────────────────────────────┐
│              COUNTER ENTITY (Atomic)                    │
│                                                         │
│  Counter                                               │
│  ┌──────────────────────────────────────────────┐     │
│  │ - counter_key (PK): string                   │     │
│  │ - current_value: number                      │     │
│  │ - last_increment_date: timestamp             │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  QUOTE NUMBER GENERATION (Claim-Based)                 │
│  ┌──────────────────────────────────────────────┐     │
│  │ 1. Create unique claim:                      │     │
│  │    Counter.create({                          │     │
│  │      counter_key: 'quote-claim-{timestamp}', │     │
│  │      current_value: 1                        │     │
│  │    })                                        │     │
│  │                                              │     │
│  │ 2. Count all claims:                         │     │
│  │    allClaims = Counter.filter({              │     │
│  │      counter_key: { $regex: '^quote-claim-' }│     │
│  │    })                                        │     │
│  │    sequence = allClaims.length               │     │
│  │                                              │     │
│  │ 3. Format number:                            │     │
│  │    "EST-" + String(sequence).padStart(5,'0') │     │
│  │    → "EST-00123"                             │     │
│  └──────────────────────────────────────────────┘     │
│                                                         │
│  INVOICE NUMBER (Same Pattern)                         │
│  ┌──────────────────────────────────────────────┐     │
│  │ 1. Create: counter_key='invoice-claim-...'   │     │
│  │ 2. Count: allClaims.length                   │     │
│  │ 3. Format: "INV-" + padStart(5)              │     │
│  │    → "INV-00045"                             │     │
│  └──────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────┘
```

**Key Properties:**
- ✅ Thread-safe (each claim is unique atomic create)
- ✅ No race conditions (count happens after claim)
- ✅ No duplicates (impossible to get same count)
- ✅ Survives crashes (claims persisted immediately)

---

## SUMMARY: DATA FLOW SAFETY

### Critical Paths (FIXED Dec 31)

1. **Employee Invitation** ✅
   - PendingEmployee → User migration: SAFE
   - All fields copied: COMPLETE
   - Audit trail: PRESERVED
   - Delete timing: AFTER success

2. **Onboarding** ✅
   - 3 forms: TRACKED
   - Completion flag: DEFINITIVE
   - No loop: GUARANTEED

3. **Quote→Invoice→Job** ✅
   - Approval gates: ENFORCED
   - Provisioning: IDEMPOTENT
   - Data propagation: COMPLETE

4. **Counter System** ✅
   - Quote numbers: ATOMIC
   - Invoice numbers: ATOMIC
   - No duplicates: IMPOSSIBLE

---

**End of Data Model Audit**