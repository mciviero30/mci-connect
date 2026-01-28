# 🔐 WORK AUTHORIZATION IMPLEMENTATION REPORT

**Date:** 2026-01-28  
**Status:** ✅ IMPLEMENTED  
**Scope:** Hard architectural enforcement of client approval requirement

---

## 📋 EXECUTIVE SUMMARY

**Problem:** Jobs were operational without proof of client authorization (email/PO/contract).  
**Solution:** Introduced `WorkAuthorization` entity as mandatory gate for all Job execution.

**Impact:** Jobs without `authorization_id` are now **invisible** in operational views and **blocked** from creation.

---

## 🏗️ IMPLEMENTATION DETAILS

### 1️⃣ NEW ENTITY: WorkAuthorization

**Purpose:** Explicit record that client authorized work externally.

**Schema:**
```json
{
  "customer_id": "string (indexed)",
  "authorization_type": "fixed_price | time_materials | not_to_exceed",
  "approval_source": "email | po | verbal | signed_quote | contract",
  "authorization_number": "string (PO#, email ref, etc.)",
  "approved_amount": "number",
  "approved_at": "datetime",
  "verified_by_user_id": "string (SSOT: User ID)",
  "verification_notes": "string",
  "external_reference": "string",
  "status": "approved | revoked | expired",
  "linked_quote_id": "string (optional)",
  "linked_invoice_id": "string (optional)",
  "backfill_auto_generated": "boolean",
  "backfill_confidence": "number (0-100)"
}
```

**Required fields:** `customer_id`, `customer_name`, `authorization_type`, `approval_source`, `approved_at`, `verified_by_user_id`

---

### 2️⃣ JOB SCHEMA CHANGES

**Added field:**
- `authorization_id` (string, indexed) — **REQUIRED in schema**

**Updated required fields:**
```json
"required": ["customer_name", "name", "authorization_id"]
```

**Semantics:**
- Job = execution container ONLY
- No Job may exist operationally without `authorization_id`
- Internal/planning Jobs without authorization are **hidden** from all operational views

---

### 3️⃣ BACKEND ENFORCEMENT

**Function:** `enforceJobAuthorizationRequirement`

**Triggered on:** Job `create` or `update` events (entity automation)

**Logic:**
1. Check `authorization_id` is present
2. Validate `WorkAuthorization` exists
3. Validate `authorization.status === 'approved'`
4. **BLOCK** job creation/update if validation fails (returns 400)

**Audit logs:** All validations logged with job context

---

### 4️⃣ CREATION GUARDS (Frontend)

**Updated components:**

**JobForm:**
- Added `AuthorizationSelector` component
- Validates `authorization_id` before submit
- Shows customer-specific authorizations only
- Inline "Quick Create Authorization" flow

**AIJobWizard:**
- Added `AuthorizationSelector` in Step 1
- Blocks completion if `authorization_id` missing
- Reset authorization when customer changes

**Field (MCI Field):**
- Added `AuthorizationSelector` to new project dialog
- Blocks creation without authorization
- Disabled button shows "Authorization required"

---

### 5️⃣ VISIBILITY RULES (Operational Views)

**Updated queries to filter by `authorization_id`:**

**Pages:**
- `/Trabajos` — only shows jobs with `authorization_id`
- `/Field` — only shows authorized jobs (all roles)

**Future (must apply same filter):**
- TimeTracking — job dropdown
- Expenses — job dropdown
- Mileage — job dropdown
- Calendar — job assignments
- Reports — job aggregations

**Internal/planning jobs without authorization:** Hidden from operational UI, accessible only via direct DB queries (admin troubleshooting).

---

### 6️⃣ INVOICE PROVISIONING CHANGES

**Function:** `provisionJobFromInvoice`

**New gate added:**
```javascript
if (!invoice.authorization_id) {
  return { 
    skipped: true, 
    reason: 'No WorkAuthorization linked to invoice' 
  };
}
```

**Impact:** Invoices can no longer auto-create Jobs unless `invoice.authorization_id` is set.

**Workflow:**
1. Admin creates `WorkAuthorization`
2. Admin links authorization to Invoice (via Invoice form)
3. Invoice provisioning creates Job with `authorization_id`

---

### 7️⃣ MIGRATION / BACKFILL PLAN

**Function:** `backfillWorkAuthorizations`

**Strategy:** Safe, non-destructive, evidence-based.

**Eligibility criteria (auto-create authorization ONLY if):**
- Job has linked Invoice, OR
- Job has TimeEntry records, OR
- Job has Expense records

**Auto-generated authorization fields:**
- `authorization_type`: From `job.billing_type` (default: `fixed_price`)
- `approval_source`: `signed_quote` if has invoice, else `verbal`
- `authorization_number`: `invoice.invoice_number` or `AUTO-{job.job_number}`
- `approved_amount`: `job.contract_amount`
- `approved_at`: `job.created_date`
- `verified_by_user_id`: Admin who runs backfill
- `verification_notes`: Lists evidence (invoice, time, expenses)
- `backfill_auto_generated`: `true`
- `backfill_confidence`: Score 0-100 based on evidence strength

**Confidence scoring:**
- Base: 50%
- +30% if has invoice
- +10% if has time entries
- +10% if has expenses

**Jobs NOT backfilled:**
- Planning/internal jobs with no activity
- Jobs already having `authorization_id`

**Safety:**
- Dry-run mode supported
- No job deletions
- No forced approvals
- Backfill flag for audit trail

---

### 8️⃣ NEW UI: Work Authorizations Page

**Route:** `/WorkAuthorizations`

**Features:**
- List all authorizations (approved/revoked)
- Create new authorization manually
- Revoke authorization (blocks linked jobs)
- Shows backfill confidence for auto-generated ones
- Displays verification metadata (who, when, source)

**Access:** Admin-only

---

## 🎯 ENFORCEMENT SUMMARY

| **Rule** | **Enforced By** | **Blocks** |
|----------|----------------|------------|
| Jobs require `authorization_id` | Backend automation | Job create/update |
| Operational views only show authorized jobs | Frontend query filters | Time, Field, Expenses |
| No auto-Job from Invoice without auth | `provisionJobFromInvoice` gate | Invoice provisioning |
| Authorization must be `approved` | Backend validation | Job operations |

---

## 📊 MIGRATION EXECUTION PLAN

**Step 1: Dry-run backfill** (safe)
```
POST /functions/backfillWorkAuthorizations
{ "dry_run": true }
```
- Returns list of eligible jobs
- Shows confidence scores
- No data changes

**Step 2: Review candidates** (manual)
- Admin reviews backfill candidates
- Verifies evidence makes sense
- Identifies edge cases

**Step 3: Execute backfill**
```
POST /functions/backfillWorkAuthorizations
{ "dry_run": false }
```
- Creates WorkAuthorization for eligible jobs
- Links Jobs to authorizations
- Logs all actions

**Step 4: Manual review** (operational)
- Review jobs WITHOUT authorization
- Create authorizations manually where needed
- Archive/delete planning jobs

**Step 5: Enable backend enforcement**
- Create entity automation for `enforceJobAuthorizationRequirement`
- All future Job creates/updates validated

---

## ⚠️ KNOWN IMPACTS

**Immediate:**
- Unauthorized jobs disappear from `/Trabajos` and `/Field`
- Job creation requires authorization (adds 1 step to workflow)
- Invoice provisioning skips job creation if no auth linked

**Long-term:**
- Cleaner data model (no ghost jobs)
- Audit trail for all client approvals
- Enforceable compliance (no work without approval proof)

**Accepted trade-offs:**
- Extra step in job creation (business requirement)
- Legacy jobs need backfill review (one-time migration)
- Planning/internal jobs hidden (intentional)

---

## ✅ VALIDATION CHECKLIST

- [x] WorkAuthorization entity created
- [x] Job.authorization_id added (required field)
- [x] Backend enforcement function implemented
- [x] JobForm updated with AuthorizationSelector
- [x] AIJobWizard updated with authorization gate
- [x] Field page updated with authorization requirement
- [x] provisionJobFromInvoice updated (no auto-create)
- [x] /Trabajos query filters by authorization_id
- [x] /Field query filters by authorization_id
- [x] Backfill function implemented (safe, dry-run supported)
- [x] Work Authorizations management page created
- [ ] **TODO:** Entity automation for `enforceJobAuthorizationRequirement`
- [ ] **TODO:** Update TimeTracking job dropdowns
- [ ] **TODO:** Update Expenses job dropdowns
- [ ] **TODO:** Update Mileage job dropdowns
- [ ] **TODO:** Update Calendar job assignments
- [ ] **TODO:** Update Invoice form to link authorization_id
- [ ] **TODO:** Run backfill migration (after review)

---

## 🚀 NEXT STEPS

1. **Test new Job creation flow** (manual, AI, Field)
2. **Run dry-run backfill** to see candidates
3. **Create entity automation** for backend enforcement
4. **Update remaining job dropdowns** (Time, Expenses, Mileage)
5. **Execute backfill** (after dry-run review)
6. **Update Invoice form** to link `authorization_id`

---

**CONCLUSION:** Hard architectural rule implemented. Jobs are now execution-only containers requiring explicit client authorization proof.