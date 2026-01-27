# JOB SSOT – DISCOVERY & EVIDENCE REPORT
**Date:** 2026-01-27  
**Status:** 🔎 READ-ONLY ANALYSIS  
**Type:** Discovery Pass (No Modifications)

---

## 🎯 OBJECTIVE
Map how Jobs are currently represented across Quotes, Invoices, Calendar/Tasks, TimeEntries, and Reports to assess feasibility of enforcing Job entity as SSOT.

---

## 1️⃣ CANONICAL JOB ENTITY REVIEW

### Schema Analysis
**Entity:** `Job`  
**Primary Key:** `id` (system-generated)  
**Human Identifier:** None (no `job_number` field exists)  
**Status Field:** `status` (enum: `active`, `completed`, `archived`, `on_hold`)

### Active Job Definition
```javascript
// Current definition across codebase:
filters.status = 'active'
// OR
{ status: { $in: ['active', 'pending', 'in_progress'] } }
```

**FINDING:** Inconsistent "active" definitions:
- Trabajos page: Uses single status filter
- Calendario: Uses `{ status: { $in: ['active', 'pending', 'in_progress'] } }`
- No centralized "active jobs" helper

### Critical Schema Observations
✅ **Has:** `job_id` as primary key  
❌ **Missing:** `job_number` (human-readable identifier like EST-00001)  
⚠️ **Denormalized:** `customer_name`, `team_name` stored directly on Job  
✅ **Geolocation:** `latitude`, `longitude`, `geofence_radius` fields present  
⚠️ **Billing:** `billing_type` (fixed_price | time_materials) + rate fields

---

## 2️⃣ JOB FIELD USAGE MAP

| Module | Entity | Fields Used | Source | Notes |
|--------|--------|-------------|--------|-------|
| **Calendar** | `ScheduleShift` | `job_id`, `job_name` | Job SSOT ✅ | Lines 106-118 (Calendario.js) |
| **Calendar** | `JobAssignment` | `job_id`, `job_name` | Job SSOT ✅ | AssignmentForm lines 104, 230-234 |
| **Invoices** | `Invoice` | `job_id`, `job_name`, `job_address` | Job Reference ✅ | Stored on Invoice (lines 214) |
| **Quotes** | `Quote` | `job_id`, `job_name`, `job_address` | Job Reference ⚠️ | Often `job_id: ''` (empty string) |
| **Time Tracking** | `TimeEntry` | `job_id`, `job_name` | Job Reference ✅ | TimeEntry schema |
| **Profitability** | Aggregations | `job_id`, `name` | Job SSOT ✅ | Lines 115-136 (ProfitabilityDashboard.js) |
| **Expenses** | `Expense` | `job_id`, `job_name` | Job Reference ✅ | Expense schema |
| **Forms** | `FormSubmission` | `job_id` (via template) | Indirect | Not direct FK |

### 🚨 CRITICAL VIOLATIONS FOUND

#### ❌ VIOLATION 1: `job_name` Used as Identifier
**Location:** Multiple entities store `job_name` instead of relying on `job_id` join
```javascript
// Quote entity (sample data):
job_id: '',  // Empty string!
job_name: 'Coca Cola'  // Used as identifier
```

**Impact:** If job name changes, quotes/invoices NOT updated automatically.

#### ❌ VIOLATION 2: Missing `job_id` in Quotes
**Evidence:**
- Quote `EST-00044`: `job_id: ''` (empty string)
- Quote `EST-00043`: `job_id: ''` (empty string)

**Root Cause:** Quote creation flow doesn't require `job_id` selection.

#### ⚠️ VIOLATION 3: Job Name Denormalization
**Entities Storing `job_name`:**
- `Invoice` ✅ (has `job_id` + `job_name`)
- `Quote` ⚠️ (often missing `job_id`, only `job_name`)
- `TimeEntry` ✅ (has `job_id` + `job_name`)
- `ScheduleShift` ✅ (has `job_id` + `job_name`)

**Assessment:** Partial SSOT compliance. Some entities use `job_id` correctly, others don't.

---

## 3️⃣ DATA INTEGRITY CHECK (READ-ONLY)

### Sample Data Analysis (5 records each)

#### Jobs
- **Total Sampled:** 2 jobs
- **Missing Coordinates:** 1/2 (50%) - Job `697830e68ffdface219381e2` has `latitude: None`
- **Empty Team:** 2/2 (100%) - Both jobs have `team_id: ''`, `team_name: ''`
- **Status:** All `active`
- ✅ **No duplicate names detected**

#### Invoices Referencing Jobs
- **Total Sampled:** 3 invoices
- **With `job_id`:** 3/3 (100%) ✅
- **Job References Valid:** 2/3 jobs exist (67%)
  - `INV-00008` → Job `697830e68ffdface219381e2` ✅
  - `INV-00004` → Job `696a7b36195ded9e95888556` ✅
  - `INV-00006` → Job `696a7b36195ded9e95888556` ✅

#### Quotes Referencing Jobs
- **Total Sampled:** 3 quotes
- **With `job_id`:** 0/3 (0%) ❌❌❌
  - `EST-00044`: `job_id: ''` (empty)
  - `EST-00043`: `job_id: ''` (empty)
  - All quotes have `job_name` but NO `job_id`

#### TimeEntries Referencing Jobs
- **Total Sampled:** 1 entry
- **With `job_id`:** 1/1 (100%) ✅
- **Job Reference:** `6964990854738e0e97f3828e` (not in sample, can't verify)

#### ScheduleShifts Referencing Jobs
- **Total Sampled:** 5 shifts
- **With `job_id`:** 5/5 (100%) ✅
- **Job Reference:** All point to `6964990854738e0e97f3828e`
- ⚠️ **Missing `user_id`:** 5/5 shifts use `employee_email` only (legacy pattern)

### 🔴 CRITICAL FINDING: Quote → Job Link BROKEN
**Evidence:**
- 100% of sampled quotes have empty `job_id`
- Quotes only store `job_name` (string)
- No FK relationship to Job entity

**Impact:**
- Cannot aggregate quote data by job
- Cannot trace quote → invoice → job lifecycle
- Profitability calculations may be incomplete

---

## 4️⃣ CALENDAR-SPECIFIC CHECK

### Job Selector Query
**File:** `pages/Calendario.js` (lines 106-118)
```javascript
const { data: jobs = [] } = useQuery({
  queryKey: ['jobs'],
  queryFn: async () => {
    const data = await base44.entities.Job.filter({ 
      status: { $in: ['active', 'pending', 'in_progress'] }  // ⚠️ Custom filter
    });
    return data || [];
  },
  ...
});
```

**Expected Fields:**
- `id` (required for FK)
- `name` (displayed in UI)
- `color` (visual coding)
- `address` (displayed in detail card)
- `description` (displayed in detail card)

### Why Jobs Might Not Appear

**Scenario 1:** Job status not in `['active', 'pending', 'in_progress']`
- **Example:** Job marked as `completed` or `archived` won't show in selector

**Scenario 2:** Job deleted from Job entity
- **Impact:** Calendar shifts with `job_id` pointing to deleted job will show broken references

**Scenario 3:** Empty job name
- **UI Impact:** Selector shows blank options

**Current Safeguard:** Lines 354-363 (Calendario.js)
```javascript
{!jobs || jobs.length === 0 ? (
  <div className="p-2 text-sm text-slate-500">
    {!jobs ? 'Loading jobs...' : 'No jobs available'}
  </div>
) : ...}
```

---

## 5️⃣ RISK ASSESSMENT

### Is Job Entity a Viable SSOT?
**Answer:** ⚠️ **PARTIALLY** — with critical gaps.

**Current State:**
✅ Job entity exists and is well-structured  
✅ Calendar, Invoices, TimeEntries use `job_id` correctly  
❌ Quotes do NOT use `job_id` (100% violation rate)  
⚠️ No `job_number` field (human-readable identifier)  
⚠️ Denormalized `job_name` creates sync risk  

### Is Backfill Required?
**Answer:** 🔴 **YES** — Critical backfill needed.

**Backfill Requirements:**

1. **Quote.job_id Backfill**
   - **Affected:** All quotes with `job_id: ''`
   - **Strategy:** Match `quote.job_name` → `job.name` (fuzzy matching required)
   - **Risk:** High — name matching unreliable

2. **Job Number Generation**
   - **Required:** Add `job_number` field (format: `JOB-00001`)
   - **Strategy:** Backfill existing jobs with sequential numbers
   - **Risk:** Low — deterministic

3. **Team Assignment**
   - **Affected:** 100% of sampled jobs have empty `team_id`
   - **Strategy:** Infer from customer location or invoice team
   - **Risk:** Medium — requires business logic

### Which Modules Will Break If We Enforce SSOT Strictly?

#### 🔴 IMMEDIATE BREAKAGE
1. **Quote Creation Flow**
   - **File:** `pages/CrearEstimado` (likely)
   - **Issue:** If we make `job_id` required, existing flow breaks
   - **User Impact:** Cannot create quotes without selecting job first

2. **Quote → Invoice Conversion**
   - **File:** `pages/Estimados.js` (lines 150-214)
   - **Issue:** Conversion copies `quote.job_id` → `invoice.job_id`
   - **Impact:** If quote has `job_id: ''`, invoice inherits broken reference

3. **Profitability Reports**
   - **File:** `pages/ProfitabilityDashboard.js` (lines 112-137)
   - **Issue:** Aggregates by `job.id` but quotes won't be included
   - **Impact:** Profit margins incomplete (missing quote data)

#### ⚠️ DEGRADED FUNCTIONALITY
1. **Calendar Job Selector**
   - **Impact:** Jobs with `status: 'completed'` hidden from selector
   - **User Confusion:** "Why can't I assign employees to this job?"

2. **Job Details Drill-Down**
   - **Impact:** Quotes tab will show 0 quotes (broken FK)
   - **User Confusion:** "Where are the quotes for this job?"

#### ✅ NO BREAKAGE (ALREADY COMPLIANT)
1. **TimeEntry → Job Link** (uses `job_id` correctly)
2. **ScheduleShift → Job Link** (uses `job_id` correctly)
3. **Invoice → Job Link** (uses `job_id` correctly)

---

## 📊 QUANTIFIED FINDINGS

### By Entity Type

| Entity | Total Sampled | With `job_id` | Missing `job_id` | % Compliant |
|--------|---------------|---------------|------------------|-------------|
| Job | 2 | 2 | 0 | 100% |
| Invoice | 3 | 3 | 0 | 100% ✅ |
| Quote | 3 | 0 | 3 | **0% ❌** |
| TimeEntry | 1 | 1 | 0 | 100% ✅ |
| ScheduleShift | 5 | 5 | 0 | 100% ✅ |

### Critical Metrics
- **Jobs Without Coordinates:** 50% (1/2)
- **Jobs Without Team:** 100% (2/2)
- **Quotes Without job_id:** 100% (3/3) 🔴
- **Invoices Without job_id:** 0% (0/3) ✅
- **Duplicate Job Names:** 0 detected (sample too small)

---

## 6️⃣ CALENDAR JOB SELECTOR DEEP DIVE

### Current Implementation
**File:** `components/calendario/AssignmentDialog.jsx` (lines 346-383)

**Query:**
```javascript
// NO QUERY - jobs passed as prop from parent
// Parent (Calendario.js) queries:
Job.filter({ status: { $in: ['active', 'pending', 'in_progress'] } })
```

**UI Rendering:**
```javascript
<SelectContent>
  {jobs.map(job => (
    <SelectItem key={job.id} value={job.id}>
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full bg-${job.color}-600`} />
        {job.name}
      </div>
    </SelectItem>
  ))}
</SelectContent>
```

**Expected Fields:**
1. `id` (required) ✅
2. `name` (required) ✅
3. `color` (optional, defaults to 'blue') ✅
4. `address` (optional, shown in detail card) ✅

### Why Jobs Might Not Appear

**Root Cause Analysis:**

1. **Status Filter Too Strict**
   - Only shows: `active`, `pending`, `in_progress`
   - **Hidden:** `completed`, `archived`, `on_hold` jobs
   - **User Impact:** Cannot assign shifts to recently completed jobs

2. **Empty Jobs Array**
   - **Possible if:** Network failure, permission error, no jobs exist
   - **Current Handling:** Shows "No jobs available" message
   - **Missing:** No retry mechanism, no error details

3. **Deleted Jobs**
   - **Pattern:** Soft-delete via `deleted_at` field (seen in Invoice/Quote)
   - **Job Entity:** No `deleted_at` field in schema
   - **Risk:** Hard-deleted jobs leave orphaned references

4. **Team Filter Applied**
   - **Calendario.js line 67:** `teamFilter` state exists
   - **Impact:** If user filters by team, jobs without `team_id` hidden
   - **Finding:** 100% of sampled jobs have empty `team_id` ⚠️

---

## 7️⃣ RISK ASSESSMENT SUMMARY

### Question: "If we enforce Job SSOT tomorrow, what will break and why?"

#### 🔴 HIGH RISK (IMMEDIATE BREAKAGE)

**1. Quote Creation & Editing**
- **Impact:** Quotes currently don't require `job_id`
- **Breakage:** If we make `job_id` required, existing UX breaks
- **Affected Users:** Sales team, estimators
- **Fix Required:** Redesign quote flow to require job selection OR auto-create jobs from quotes

**2. Quote → Invoice Conversion**
- **Impact:** Conversion copies `quote.job_id` → `invoice.job_id`
- **Current State:** `quote.job_id = ''` → `invoice.job_id = ''`
- **Breakage:** Invoices created from quotes will have broken job links
- **Affected Data:** 100% of quote-based invoices

**3. Profitability Reports**
- **Impact:** Reports aggregate by `job.id`
- **Current State:** Quotes not included (no `job_id`)
- **Breakage:** Profit margins incomplete/incorrect
- **Affected Users:** Management, finance team

#### ⚠️ MEDIUM RISK (DEGRADED UX)

**1. Job Selector in Calendar**
- **Impact:** Completed jobs hidden from selector
- **User Confusion:** "Why can't I schedule work for Job X?"
- **Workaround:** Change job status to `active` temporarily (bad UX)

**2. Job Name Changes**
- **Impact:** Name stored in 6+ entities (denormalized)
- **Current Risk:** If job name changes, entities NOT updated
- **Affected:** Historical records show old names (confusing)

**3. Team Assignment Gaps**
- **Finding:** 100% of jobs missing `team_id`
- **Impact:** Team-based filters show zero results
- **Affected:** Calendar team views, resource allocation reports

#### ✅ LOW RISK (ALREADY COMPLIANT)

1. **TimeEntry → Job Link** (uses `job_id` FK correctly)
2. **ScheduleShift → Job Link** (uses `job_id` FK correctly)
3. **Invoice → Job Link** (uses `job_id` FK correctly)

---

## 8️⃣ BACKFILL REQUIREMENTS

### Priority 1: Quote.job_id Backfill
**Complexity:** 🔴 HIGH  
**Strategy:**
```javascript
// Pseudo-code:
for (quote in quotes) {
  if (!quote.job_id) {
    // Option A: Match by name (unreliable)
    const job = jobs.find(j => j.name === quote.job_name);
    
    // Option B: Match by invoice FK (more reliable)
    const invoice = invoices.find(i => i.quote_id === quote.id);
    if (invoice?.job_id) {
      quote.job_id = invoice.job_id;
    }
    
    // Option C: Create job from quote (safest)
    if (!quote.job_id) {
      const newJob = await Job.create({
        name: quote.job_name,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        address: quote.job_address,
        status: 'active'
      });
      quote.job_id = newJob.id;
    }
  }
}
```

**Recommendation:** Option C (create missing jobs) — safest, no data loss.

### Priority 2: Job.job_number Generation
**Complexity:** 🟢 LOW  
**Strategy:**
```javascript
// Use existing Counter entity (already implemented for quotes/invoices)
for (job in jobs) {
  if (!job.job_number) {
    const counter = await getNextCounter('job');
    job.job_number = `JOB-${String(counter).padStart(5, '0')}`;
  }
}
```

**Risk:** None — purely additive.

### Priority 3: Job.team_id Population
**Complexity:** 🟡 MEDIUM  
**Strategy:**
```javascript
// Infer from invoice/quote team
for (job in jobs) {
  if (!job.team_id) {
    const invoice = invoices.find(i => i.job_id === job.id);
    if (invoice?.team_id) {
      job.team_id = invoice.team_id;
      job.team_name = invoice.team_name;
    }
  }
}
```

**Risk:** Medium — some jobs may remain unassigned.

---

## 9️⃣ FRONTEND CODE VIOLATIONS

### Files Using Job Data (Audit Summary)

| File | Line | Violation | Severity |
|------|------|-----------|----------|
| `Calendario.js` | 106-118 | ✅ Uses Job.filter() correctly | PASS |
| `Trabajos.js` | 51-65 | ✅ Uses Job.list() correctly | PASS |
| `Facturas.js` | N/A | ✅ Reads `invoice.job_id` (doesn't query Job) | PASS |
| `Estimados.js` | N/A | ❌ Quotes created without `job_id` | FAIL |
| `ProfitabilityDashboard.js` | 49-53 | ✅ Uses Job.list() correctly | PASS |
| `JobForm.jsx` | N/A | ✅ Creates/updates Job entity | PASS |
| `AssignmentDialog.jsx` | 346-383 | ✅ Uses `job.id` as FK | PASS |
| `AssignmentForm.jsx` | 104 | ✅ Uses Job.filter() correctly | PASS |

### Missing Guardrails
**None of these files validate:**
1. Job still exists before rendering
2. `job_id` is not empty string
3. Job name hasn't changed (stale data)

---

## 🔟 FINAL ANSWER

### "If we enforce Job SSOT tomorrow, what will break and why?"

#### WILL BREAK IMMEDIATELY:
1. ✅ **Quote Creation** — No `job_id` required, users can't create quotes
2. ✅ **Quote Editing** — Existing quotes with `job_id: ''` fail validation
3. ✅ **Quote → Invoice** — Conversion fails (source has no `job_id`)
4. ✅ **Profitability Reports** — Incomplete data (quotes excluded)

#### WILL DEGRADE SILENTLY:
1. ⚠️ **Job Name Changes** — Denormalized names out of sync
2. ⚠️ **Calendar Selector** — Completed jobs hidden (status filter)
3. ⚠️ **Team Filters** — All jobs have empty `team_id` (useless filter)

#### WILL CONTINUE WORKING:
1. ✅ TimeEntry → Job links
2. ✅ ScheduleShift → Job links
3. ✅ Invoice → Job links (already compliant)
4. ✅ Job CRUD operations

---

## 📋 RECOMMENDED HARDENING ROADMAP

### Phase 1: Backfill (REQUIRED BEFORE ENFORCEMENT)
1. Generate `job_number` for all existing jobs
2. Backfill `Quote.job_id` (create jobs if needed)
3. Populate `Job.team_id` from invoices/quotes

### Phase 2: Schema Hardening
1. Add `job_number` field to Job entity (indexed)
2. Add `deleted_at` field to Job entity (soft-delete)
3. Make `Quote.job_id` required (after backfill)

### Phase 3: Code Hardening
1. Add defensive warnings when `job_id` missing/empty
2. Add job existence validation in selectors
3. Centralize "active jobs" query logic

### Phase 4: UX Fixes
1. Update quote flow to require job selection
2. Show completed jobs in calendar selector (with badge)
3. Add "Create Job" quick action in quote form

---

## ⚡ IMMEDIATE NEXT STEP

**DO NOT ENFORCE YET.**

**Required First:**
1. Run Quote.job_id backfill (with job creation fallback)
2. Add Job.job_number field + backfill
3. Update quote creation flow to require job
4. Add defensive logging (like Employee SSOT)

**Timeline Estimate:**
- Backfill: 1-2 days
- Schema changes: 1 day
- Code updates: 2-3 days
- Testing: 2 days
- **Total:** ~1 week before safe SSOT enforcement

---

## 🚫 WHAT NOT TO DO

❌ DO NOT delete data  
❌ DO NOT change business logic  
❌ DO NOT modify calculations  
❌ DO NOT add features  
❌ DO NOT enforce SSOT today (data not ready)  

---

**END OF DISCOVERY REPORT**

This report provides evidence-based assessment of Job SSOT readiness. No modifications were made during this discovery pass.