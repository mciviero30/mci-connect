# JOB SSOT – PRE-ENFORCEMENT HARDENING PASS

**Date:** 2026-01-27  
**Phase:** PREPARATION ONLY (NO ENFORCEMENT)  
**Status:** 🛠️ SYSTEM ANALYSIS & CONTRACT DEFINITION

---

## EXECUTIVE SUMMARY

This document defines the **operational contracts and impact analysis** required before enabling Job SSOT enforcement. This is **PREPARATION ONLY** — no enforcement, no blocking, no business logic changes.

**Purpose:**
- Document current Job status model
- Define visibility contracts for enforcement
- Map enforcement impact across codebase
- Establish testing requirements

**Next Steps After This Pass:**
1. Manual cleanup of 16 orphaned Quotes (via `JobQuoteCleanup` page)
2. UI smoke testing
3. **THEN** enforcement activation (separate phase)

---

## 1️⃣ JOB STATUS MODEL AUDIT

### Current Status Enum

From `entities/Job.json`:
```json
{
  "status": {
    "type": "string",
    "enum": ["active", "completed", "archived", "on_hold"],
    "default": "active"
  }
}
```

### Status Lifecycle Table

| Status | Meaning | Operational Visibility | Phase | Can Accept Work? | Billable? |
|--------|---------|------------------------|-------|------------------|-----------|
| **active** | Job is currently in progress, work is ongoing | ✅ YES | Execution | ✅ YES | ✅ YES |
| **on_hold** | Job is paused temporarily (awaiting approval, materials, etc.) | ⚠️ CONDITIONAL | Execution (Paused) | ⚠️ LIMITED | ✅ YES (for existing) |
| **completed** | Job work is finished, may still be open for invoicing/closeout | ✅ YES (Historical) | Closeout | ❌ NO | ✅ YES |
| **archived** | Job is fully closed, historical record only | ❌ NO | Historical | ❌ NO | ❌ NO |

### Additional Status Flags

**Approval Status (Independent):**
```json
{
  "approval_status": {
    "enum": ["pending_approval", "approved", "rejected"],
    "default": "approved"
  }
}
```

**Soft Delete:**
```json
{
  "deleted_at": "timestamp or null"
}
```

### Operational Rules

**Active Jobs (`status: active`):**
- Primary operational state
- Appears in all selectors (Calendar, Field, Time Tracking)
- Can receive new assignments, time entries, expenses
- Full UI visibility

**On-Hold Jobs (`status: on_hold`):**
- Visible in most selectors (user can resume work)
- Should show warning badge in UI
- Can receive time entries (for resumed work)
- May need admin approval to resume

**Completed Jobs (`status: completed`):**
- Still visible in dropdowns (for closing out paperwork)
- Historical reference in reports
- No NEW work assignments
- Can still create invoices, adjust time entries

**Archived Jobs (`status: archived`):**
- Hidden from operational selectors
- Visible only in "All Jobs" or "Archived" views
- Read-only in most contexts
- Historical reporting only

**Deleted Jobs (`deleted_at: not null`):**
- Soft-deleted, not visible in normal queries
- Admin-only recovery
- Should NOT appear in any dropdowns

---

## 2️⃣ VISIBILITY CONTRACT (ENFORCEMENT-READY)

### Contract Definition

When Job SSOT is enforced, Job visibility in selectors MUST follow these rules:

#### A. Calendar / JobAssignment Selectors

**Purpose:** Assign work to employees  
**Visibility Rules:**
```javascript
// INCLUDE:
status IN ['active', 'on_hold'] 
AND deleted_at IS NULL
AND approval_status = 'approved'

// EXCLUDE:
status IN ['completed', 'archived']
OR deleted_at IS NOT NULL
OR approval_status IN ['pending_approval', 'rejected']
```

**Rationale:**
- Only show Jobs where new work can be scheduled
- Exclude completed/archived to reduce clutter
- Respect approval workflow

#### B. Field / MCI Field Project Selection

**Purpose:** Clock in/out, capture photos, tasks  
**Visibility Rules:**
```javascript
// INCLUDE:
status IN ['active', 'on_hold']
AND deleted_at IS NULL
AND field_project_id IS NOT NULL  // Optional: only provisioned Field jobs

// EXCLUDE:
status IN ['completed', 'archived']
OR deleted_at IS NOT NULL
```

**Rationale:**
- Field workers need active projects only
- On-hold projects visible (work may resume)
- Completed projects hidden (reduce mobile clutter)

#### C. Time Tracking / Expense Job Selector

**Purpose:** Log hours, expenses against a Job  
**Visibility Rules:**
```javascript
// INCLUDE:
status IN ['active', 'on_hold', 'completed']  // Allow completed for retroactive entries
AND deleted_at IS NULL
AND approval_status = 'approved'

// EXCLUDE:
status = 'archived'
OR deleted_at IS NOT NULL
```

**Rationale:**
- Allow retroactive time entry for completed Jobs
- Archived Jobs excluded (finalized)

#### D. Quote / Invoice Creation

**Purpose:** Link financial documents to Job  
**Visibility Rules:**
```javascript
// INCLUDE:
status IN ['active', 'on_hold', 'completed']
AND deleted_at IS NULL
AND approval_status = 'approved'

// EXCLUDE:
status = 'archived'
OR deleted_at IS NOT NULL
```

**Rationale:**
- Can create quotes for active/on-hold Jobs
- Can invoice completed Jobs

#### E. Admin Jobs List

**Purpose:** Full system view for admins  
**Visibility Rules:**
```javascript
// INCLUDE:
ALL Jobs (including soft-deleted if "Show Deleted" enabled)

// Separate tabs/filters:
- Active
- On Hold
- Completed
- Archived
- Deleted (admin only)
```

**Rationale:**
- Admins need full visibility
- UI should provide filters/tabs

#### F. Reports & Analytics

**Purpose:** Historical analysis  
**Visibility Rules:**
```javascript
// INCLUDE:
status IN ['active', 'on_hold', 'completed', 'archived']
AND deleted_at IS NULL
OR (include_deleted_in_historical_reports = true)

// Date range filtering applies
```

**Rationale:**
- Reports need historical data
- Archived Jobs included for trend analysis

---

## 3️⃣ ENFORCEMENT IMPACT MAP

### Files/Components Requiring Updates When SSOT Enforced

#### 🔴 CRITICAL (Must Change)

**A. Entity Creation Forms**

1. **Quote Creation (`pages/CrearEstimado.js`)**
   - Add: Mandatory Job selector dropdown
   - Validation: Block save if `job_id` is null
   - UX: Show "or create new Job" link

2. **Invoice Creation (`pages/CrearFactura.js`)**
   - Add: Mandatory Job selector dropdown
   - Validation: Block save if `job_id` is null
   - Option: Pre-fill from Quote if invoice created from quote

3. **Time Entry Creation (`components/horarios/*`, `pages/TimeTracking.js`)**
   - Add: Mandatory Job selector dropdown
   - Validation: Block save if `job_id` is null
   - Mobile: Ensure Field time tracker includes Job

4. **Expense Creation (`pages/MisGastos.js`, `pages/Gastos.js`)**
   - Add: Mandatory Job selector dropdown (if not already)
   - Validation: Block save if `job_id` is null

**B. Entity Schemas (FK Enforcement)**

5. **`entities/Quote.json`**
   - Change: Add `job_id` to `required` array
   - Schema enforcement will block creation without job_id

6. **`entities/Invoice.json`**
   - Change: Add `job_id` to `required` array

7. **`entities/TimeEntry.json`**
   - Change: Add `job_id` to `required` array

8. **`entities/Expense.json`**
   - Change: Add `job_id` to `required` array (if applicable)

9. **`entities/JobAssignment.json`**
   - Already requires `job_id` (verify)

#### 🟡 IMPORTANT (Should Update)

**C. Selector Components**

10. **Job Dropdown Components (various)**
    - Implement visibility contract (filter by status)
    - Add visual indicators for status (badges)
    - Example: "Active (5) | On Hold (2) | Completed (12)"

11. **Calendar Job Filters (`pages/Calendario.js`)**
    - Apply operational visibility rules
    - Hide archived/deleted Jobs

12. **Field Job Selection (`pages/Field.js`)**
    - Apply Field visibility rules
    - Show only active/on-hold

**D. Validation & Error Handling**

13. **Create Form Validation**
    - Add client-side validation: "Job is required"
    - Add server-side validation (schema enforcement)
    - User-friendly error messages

14. **Backend Functions**
    - Update `generateInvoiceNumber`, etc. to verify job_id exists
    - Add FK validation in custom mutations

#### 🟢 OPTIONAL (Nice to Have)

**E. User Experience Enhancements**

15. **Job Quick-Create Modal**
    - Add "Create New Job" button in selectors
    - Inline Job creation without leaving form

16. **Job Status Badges**
    - Visual indicators in dropdowns
    - Color coding: Green (active), Yellow (on-hold), Gray (completed)

17. **Historical Job Warning**
    - When selecting completed Job: "Note: This Job is completed. Time entries may require approval."

18. **Orphan Prevention Warnings**
    - Pre-save validation: "This Quote is not linked to a Job. Please select or create one."

#### 🔵 REPORTS & ANALYTICS

**F. Reporting Layer**

19. **Job Performance Reports (`pages/JobPerformanceAnalysis.js`)**
    - Filter by Job status
    - Include/exclude archived Jobs option

20. **Profitability Dashboard (`pages/ProfitabilityDashboard.js`)**
    - Ensure Job filtering respects status
    - Historical vs. active toggle

21. **Cash Flow Reports (`pages/CashFlowReport.js`)**
    - Job-based filtering
    - Status-aware projections

---

## 4️⃣ TESTING REQUIREMENTS (PRE-ENFORCEMENT)

### Manual Test Cases

**Before Enforcement Activation:**

#### Test Case 1: Quote Creation Without Job
- **Action:** Try to create a Quote without selecting a Job
- **Expected (AFTER enforcement):** Error: "Job is required"
- **Current (BEFORE enforcement):** Should save successfully

#### Test Case 2: Invoice Creation Without Job
- **Action:** Try to create an Invoice without selecting a Job
- **Expected (AFTER enforcement):** Error: "Job is required"
- **Current (BEFORE enforcement):** Should save successfully

#### Test Case 3: Time Entry Without Job
- **Action:** Try to log time without selecting a Job
- **Expected (AFTER enforcement):** Error: "Job is required"
- **Current (BEFORE enforcement):** Should save successfully

#### Test Case 4: Job Selector Visibility
- **Action:** Open Calendar, check Job dropdown
- **Expected:** Only active/on-hold Jobs visible
- **Test:** Create an archived Job, verify it's hidden

#### Test Case 5: Field Job Selection
- **Action:** Open MCI Field, check project list
- **Expected:** Only active/on-hold Jobs with field_project_id
- **Test:** Archived Jobs should not appear

#### Test Case 6: Orphaned Quote Cleanup
- **Action:** Use `JobQuoteCleanup` page
- **Expected:** Admin can manually assign Jobs
- **Test:** Verify assignment persists, Quote.job_id updates

---

## 5️⃣ SCHEMA CHANGES (ENFORCEMENT ACTIVATION)

### Current Schema (No Enforcement)

```json
{
  "Quote": {
    "job_id": { "type": "string" }
    // NOT in required array
  }
}
```

### Post-Enforcement Schema

```json
{
  "Quote": {
    "job_id": { "type": "string" },
    "required": ["customer_name", "job_name", "quote_date", "items", "total", "job_id"]
  }
}
```

**Impact:**
- Any Quote creation without `job_id` will **fail at database level**
- Frontend MUST enforce Job selection before this schema change

**Rollout Order:**
1. Update all frontend forms to include Job selector
2. Deploy frontend changes
3. Test thoroughly (ensure no orphan creation)
4. Update entity schemas (add job_id to required)
5. Monitor for errors

---

## 6️⃣ MIGRATION SAFETY CHECKLIST

### Pre-Enforcement Checklist

- [✅] Phase 1-3 backfill complete
- [⚠️] 16 orphaned Quotes identified (manual cleanup in progress)
- [⚠️] Job numbers assigned (0/29 currently)
- [ ] All frontend forms updated with Job selectors
- [ ] Validation messages implemented
- [ ] Job visibility contracts implemented in selectors
- [ ] User documentation prepared
- [ ] Admin training completed
- [ ] UI smoke testing passed
- [ ] Backend function FK validation added

### Post-Enforcement Monitoring

**Week 1 After Enforcement:**
- Monitor error logs for "job_id required" errors
- Track Quote/Invoice creation success rate
- Survey users for UX friction
- Adjust error messages if confusing

**Week 2-4:**
- Review orphaned records (should be 0)
- Analyze Job status distribution
- Optimize selector performance
- Gather feedback for improvements

---

## 7️⃣ ROLLBACK PLAN

### If Enforcement Causes Issues

**Immediate Rollback:**
1. Remove `job_id` from `required` array in schemas
2. Redeploy entity definitions
3. Allow orphaned records temporarily
4. Fix frontend issues
5. Re-attempt enforcement

**Partial Rollback (Quote-Only Enforcement):**
- Enforce job_id for Invoices/TimeEntries only
- Allow Quotes to remain optional temporarily
- Gives more time for user adoption

---

## 8️⃣ COMMUNICATION PLAN

### User Notification (Pre-Enforcement)

**Announcement Email:**
```
Subject: Important Update: Job Selection Required for Quotes & Invoices

Hi Team,

Starting [DATE], you will need to select a Job when creating Quotes, Invoices, 
or logging time. This ensures better project tracking and reporting.

What's changing:
- New dropdown: "Select Job" on creation forms
- Can't save without selecting a Job
- Need to create a Job first? Contact admin or use "New Job" button

Why:
- Better project organization
- Accurate cost tracking
- Improved reporting

Need help? [Link to guide]
```

### Training Materials

**Quick Start Guide:**
1. Creating a Job (if needed)
2. Selecting a Job when creating Quotes
3. What to do if your Job isn't listed

**Video Tutorial:**
- 2-minute walkthrough of new workflow
- Screen recording of Job selection process

---

## 9️⃣ TECHNICAL DEBT & FUTURE IMPROVEMENTS

### Known Limitations

**L1: No Job Quick-Create**
- Current: Must navigate to Jobs page to create Job
- Future: Inline Job creation modal in selectors

**L2: No Job Templates**
- Current: Manual Job creation every time
- Future: Templates for common job types

**L3: No Job Number Auto-Generation**
- Current: Job numbers not auto-assigned
- Future: Auto-increment like Quote/Invoice numbers

**L4: No Job Status Workflow**
- Current: Manual status changes
- Future: Automated status transitions (active → completed when invoiced)

**L5: No Bulk Job Assignment**
- Current: Must assign Quotes to Jobs one-by-one
- Future: Bulk selection for historical data

---

## 🎯 ENFORCEMENT ACTIVATION CHECKLIST

### When Ready to Enforce (Post-Cleanup)

- [ ] All 16 orphaned Quotes resolved (manual cleanup complete)
- [ ] Job numbers assigned to all Jobs
- [ ] Frontend forms updated with Job selectors
- [ ] Validation implemented
- [ ] Error messages clear and helpful
- [ ] User documentation published
- [ ] Team training completed
- [ ] Smoke testing passed (see Test Cases above)
- [ ] Monitoring dashboards ready
- [ ] Rollback plan documented
- [ ] Communication sent to users

**Only when ALL boxes checked:**
→ Update entity schemas (add job_id to required)
→ Deploy schema changes
→ Monitor for 1 week

---

## 📊 SUCCESS METRICS (POST-ENFORCEMENT)

### Week 1 KPIs

- **Zero Orphaned Records:** 100% of new Quotes/Invoices have job_id
- **Creation Success Rate:** ≥99% (users not blocked by validation)
- **Error Rate:** <1% (validation errors)
- **User Support Tickets:** <5 (indicates clear UX)

### Month 1 KPIs

- **Job Utilization:** 100% of active Jobs linked to at least 1 entity
- **Orphan Prevention:** 0 new orphaned records
- **Status Accuracy:** Jobs correctly marked active/completed/archived
- **User Satisfaction:** ≥4/5 in post-implementation survey

---

## 🔐 SECURITY & COMPLIANCE

### Data Integrity Guarantees

**Post-Enforcement:**
- **Referential Integrity:** All job_id references valid (FK enforced)
- **No Orphans:** Zero new orphaned entities
- **Audit Trail:** All Job assignments tracked (backfill_source, job_link_method)

### Compliance Impact

**Financial Reporting:**
- Job-level cost tracking now accurate
- Revenue recognition tied to Jobs
- Profit margin calculations reliable

**Time Tracking Compliance:**
- All hours linked to specific Jobs
- Labor cost allocation accurate
- Prevailing wage compliance (if applicable)

---

## CONCLUSION

This hardening pass establishes the **operational contracts and impact analysis** required for safe Job SSOT enforcement. The system is **architecturally ready**, pending:

1. ✅ Manual cleanup of 16 orphaned Quotes (via `JobQuoteCleanup` page)
2. ⚠️ Frontend form updates (Job selectors + validation)
3. ⚠️ Job number assignment (recommended)
4. ⚠️ User communication + training

**Next Immediate Action:**
→ Use `pages/JobQuoteCleanup` to resolve orphaned Quotes
→ Assign job_numbers to all 29 Jobs
→ Update frontend forms (separate task)
→ **THEN** activate enforcement (schema changes)

**System Status:** 🟡 PREPARED, NOT ENFORCED

---

**Document Version:** 1.0  
**Author:** Job SSOT Pre-Enforcement Analysis  
**Date:** 2026-01-27  
**Approval:** PENDING ADMIN REVIEW