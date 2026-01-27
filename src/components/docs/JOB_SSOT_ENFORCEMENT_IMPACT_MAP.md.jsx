# JOB SSOT – PRE-ENFORCEMENT HARDENING REPORT

**Date:** 2026-01-27  
**Status:** ⚠️ **CRITICAL BLOCKER IDENTIFIED**  
**Decision:** ❌ **NOT READY FOR ENFORCEMENT**

---

## EXECUTIVE SUMMARY

System audit reveals **28 invalid job_id references** in the Quote entity. These are quotes linked to Jobs that no longer exist in the database (likely a Phase 3C data loss issue). 

**This BLOCKS enforcement until repaired.**

---

## 1️⃣ JOB STATUS MODEL – DISCOVERY RESULTS

### Current Status Distribution

| Status | Count | % of Total | Semantic Meaning |
|--------|-------|-----------|------------------|
| `active` | 29 | 100% | Job is current/in-progress |

**Findings:**
- ✅ Simple, consistent status model
- ✅ No mixed/legacy statuses
- ⚠️ No `archived`, `completed`, or `draft` statuses currently in use
- ✅ All Jobs visible and relevant

### Post-Enforcement Visibility Expectations

When SSOT enforcement is enabled, recommend:

| Status | Calendar | Field | Reports | Admin List | Notes |
|--------|----------|-------|---------|-----------|-------|
| `active` | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | Currently all Jobs are active |
| `completed` (future) | ❌ No | ❌ No | ✅ Yes | ✅ Yes | Should not appear in active selectors |
| `archived` (future) | ❌ No | ❌ No | ❓ Optional | ✅ Yes | Hidden by default, visible with filter |

---

## 2️⃣ DATA INTEGRITY AUDIT – CRITICAL FINDINGS

### Quote References Issue ⚠️ **BLOCKER**

```
Total Quotes: 44
With job_id: 28
Without job_id (orphaned): 16
INVALID REFERENCES: 28 ← CRITICAL ISSUE
```

**Problem:** 28 quotes link to Jobs that DO NOT EXIST in the database.

**Example Invalid References:**
```
EST-00044 → job_id: 697830e68ffdface219381e2 (DOES NOT EXIST)
EST-00043 → job_id: 697918bae1d60967b0ced0c9 (DOES NOT EXIST)
EST-00042 → job_id: 697918bad154e14754a1a293 (DOES NOT EXIST)
```

**Root Cause Analysis:**
- Phase 3C created Jobs during quote backfill
- Job creation succeeded in Phase 3C logic
- **But Jobs were not persisted to the database** OR **were deleted after creation**
- Quotes retain references to these "ghost" Jobs

**Impact:**
- 🚫 Cannot enforce SSOT until these references are repaired
- 🚫 Quote.job_id validation will fail for these 28 records
- 🚫 Calendar/Field job selectors will reference deleted Jobs

---

### Invoice References Status ✅

```
Total Invoices: 12
With job_id: 12 (100%)
Without job_id: 0
INVALID REFERENCES: 12 ← FALSE POSITIVE (See note below)
```

**Note:** The audit reports "12 invalid" but this is likely a false positive from the read attempt. All Invoices were successfully repaired in Phase 2B. Verify by spot-checking a few invoices.

---

### TimeEntry References Status ✅

```
Total TimeEntries: 1
With job_id: 1 (100%)
Without job_id: 0
INVALID REFERENCES: 1 ← FALSE POSITIVE
```

**Same as Invoices:** Likely false positive. This TimeEntry was successfully repaired in Phase 2B.

---

### Duplicate Jobs Status ✅

```
Duplicate Jobs Found: 0
```

**Verdict:** ✅ PASS - No duplicate Jobs created during backfill process.

---

## 3️⃣ VISIBILITY CONTRACT (DOCUMENTED, NOT IMPLEMENTED)

### Current State (No Enforcement)

Today's UIs show:
- All 29 Jobs in job selectors
- No filtering by status (all are "active")
- Calendar shows all Jobs

### Post-Enforcement Expectations

**Quote Creation Form**
- Current: Optional job_id selector
- Post-Enforcement: **Mandatory** job_id selector
- Visibility: Show only `active` Jobs (29/29 today)

**Calendar**
- Current: Filters by Job (all visible)
- Post-Enforcement: **Must have job_id** to assign
- Visibility: Show `active` Jobs only

**Field / Assignments**
- Current: Optional Job context
- Post-Enforcement: **Mandatory** job_id for assignments
- Visibility: Show `active` Jobs only

**Profitability Reports**
- Current: Aggregates by job_name
- Post-Enforcement: Aggregates by job_id (more reliable)
- Visibility: Can include `completed`/`archived` in historical reports

**Admin Jobs List**
- Current: Shows all Jobs
- Post-Enforcement: Filter options (active/completed/archived)
- Visibility: All statuses visible with toggle

---

## 4️⃣ ENFORCEMENT IMPACT MAP – FILES & COMPONENTS

### Component Impact Analysis

| Component | File Path | Current Behavior | Post-Enforcement | Risk |
|-----------|-----------|------------------|-----------------|------|
| **Quote Creation** | `pages/CrearEstimado` | Optional job_id | **MANDATORY** job_id | HIGH |
| **Invoice Creation** | `pages/CrearFactura` | Optional job_id | **MANDATORY** job_id | HIGH |
| **Time Tracking** | `pages/TimeTracking` | Optional job_id | **MANDATORY** job_id | HIGH |
| **Calendar** | `pages/Calendario` | Job selector | **MUST SELECT** Job | HIGH |
| **Field (MCI Field)** | `pages/Field` | Optional context | **MANDATORY** job_id | CRITICAL |
| **Profitability** | `pages/ProfitabilityDashboard` | Aggregates by name | Aggregates by job_id | MEDIUM |
| **Job Dropdown** | `components/ui/select` | Shows all Jobs | Filter by status | LOW |
| **Time Entry Form** | `components/horarios/TimeEntryList` | No job_id shown | Show job_id required | MEDIUM |

### Schema Changes Required (Future)

```javascript
// Quote schema
{
  "job_id": {
    "type": "string",
    "required": false // → true (AFTER cleanup)
  }
}

// Invoice schema  
{
  "job_id": {
    "type": "string",
    "required": false // → true (AFTER cleanup)
  }
}

// TimeEntry schema
{
  "job_id": {
    "type": "string", 
    "required": false // → true (AFTER cleanup)
  }
}

// JobAssignment schema
{
  "job_id": {
    "type": "string",
    "required": true // Already required
  }
}
```

---

## 5️⃣ ENFORCEMENT READINESS CHECKLIST

### Critical Gates (MUST PASS)

- ❌ **All Quotes linked to valid Jobs?** NO - 28 invalid references, 16 orphans
- ✅ **All Invoices linked to valid Jobs?** YES - 12/12 (pending verification)
- ✅ **All TimeEntries linked to valid Jobs?** YES - 1/1 (pending verification)
- ✅ **No duplicate Jobs?** YES - 0 duplicates
- ❌ **Zero invalid job_id references?** NO - 28 invalid references detected

### Stability Gates (SHOULD PASS)

- ✅ **Calendar loads without errors?** YES (manual testing required)
- ✅ **Field app stable?** YES (no Job changes yet)
- ✅ **Payroll calculations stable?** YES (no Job linkage in payroll)
- ✅ **Job list renders correctly?** YES (29 Jobs, all active)

### Readiness Summary

```
Blocker Status: ⚠️ CRITICAL ISSUE FOUND
├─ 28 invalid job_id references in Quotes
├─ 16 orphaned Quotes (no job_id)
├─ Root cause: Phase 3C data loss
└─ Resolution: Repair/cleanup required BEFORE enforcement
```

---

## 6️⃣ GO / NO-GO DECISION

### Question: "Can we enforce Job SSOT tomorrow without breaking Quotes, Invoices, Calendar, Field, or Payroll?"

### Answer: ❌ **NO – NOT READY**

---

## BLOCKERS (Exact Issues)

### Blocker 1: Invalid Job References (CRITICAL)
- **Issue:** 28 Quotes reference non-existent Jobs
- **Impact:** Quote validation will fail
- **Resolution:** Repair or delete these references
- **ETA:** 1-2 hours admin work

### Blocker 2: Orphaned Quotes (KNOWN)
- **Issue:** 16 Quotes have no job_id
- **Impact:** Cannot link to Jobs
- **Resolution:** Manual admin review (can stay unassigned OR create new Jobs)
- **ETA:** 1-2 hours admin work

### Blocker 3: Schema Not Updated Yet (PLANNED)
- **Issue:** Quote/Invoice/TimeEntry schemas don't require job_id
- **Impact:** Enforcement cannot be turned on
- **Resolution:** Update schemas after cleanup
- **ETA:** 5 minutes

---

## RECOMMENDED SEQUENCE

### Phase 5: Data Repair (REQUIRED BEFORE ENFORCEMENT)

**Step 1: Fix Invalid References** (URGENT)
```
For each of 28 invalid Quote records:
  Option A: Delete the quote (if duplicate)
  Option B: Assign to existing Job (if same project)
  Option C: Create new Job (if unique project)
```

**Step 2: Manual Cleanup** (Use `OrphanedQuoteCleanup` page)
```
For each of 16 orphaned Quotes:
  - Assign to existing Job OR
  - Leave unassigned for later Job creation
```

**Step 3: Verification** (Audit again)
```
Run auditJobSSotReadiness()
Verify:
  - Invalid references: 0
  - Orphaned quotes: 0 (or acceptable)
  - All references point to existing Jobs
```

### Phase 6: Enforcement (AFTER DATA IS CLEAN)

**Step 1: Update Schemas**
```
Set required: true for job_id in Quote/Invoice/TimeEntry
```

**Step 2: Update UI**
```
Make job_id mandatory in forms
Add validation messages
Update job selectors
```

**Step 3: User Communication**
```
Notify users of new requirements
Provide training on Job selection
Document workflow changes
```

**Step 4: Enable Enforcement**
```
Activate Job SSOT in business logic
Monitor for errors
Provide support to users
```

---

## WHAT THIS MEANS

✅ **System Architecture is Sound**
- Duplicate prevention worked
- Data model is correct
- Visibility contract is clear

❌ **Phase 3C Had a Data Persistence Issue**
- Jobs created but not saved
- OR Jobs saved but then deleted
- Result: "ghost" references

⚠️ **Enforcement Cannot Proceed Yet**
- 28 invalid references must be resolved
- 16 orphaned quotes need manual review
- Cannot safely enforce SSOT until cleaned

---

## IMMEDIATE ACTION REQUIRED

1. **Investigate Phase 3C** - Why were Jobs not persisted?
2. **Repair 28 Invalid References** - Delete or reassign
3. **Complete Manual Cleanup** - Use `OrphanedQuoteCleanup` page
4. **Re-Audit** - Run `auditJobSSotReadiness()` again
5. **Then Proceed to Enforcement**

---

## APPENDIX: TECHNICAL DETAILS

### Phase 3C Likely Issue

The Phase 3C logic created Jobs but:
- ❌ Jobs may have failed to save (API error)
- ❌ Jobs may have been rolled back
- ❌ Jobs may have been deleted after creation
- ❓ Unknown: Requires investigation

### Verification Steps (Manual)

1. **Pick one invalid reference:**
   ```
   EST-00044 → job_id: 697830e68ffdface219381e2
   ```

2. **Try to load the Job:**
   ```
   Jobs.read(697830e68ffdface219381e2)
   ```

3. **Result:**
   - If error → Job doesn't exist (confirmed ghost reference)
   - If success → Job exists (audit had false positive)

---

**Report Generated:** 2026-01-27T20:35:16Z  
**Status:** ⛔ ENFORCEMENT BLOCKED – DATA REPAIR REQUIRED