# COMMISSION SYSTEM ENTITIES — Phase C1.1

**Date:** 2026-01-23  
**Architect:** Senior Data Architect  
**Status:** ✅ IMPLEMENTED

---

## Entities Created

### ✅ 1. CommissionRule
**File:** `entities/CommissionRule.json`

**Purpose:** Define commission calculation rules (admin-configured)

**Key Fields:**
- `rule_name` — Display name
- `applicable_roles` — Array of roles (e.g., ['sales_rep'])
- `applicable_user_ids` — Override for specific users
- `commission_model` — Model type (percentage_profit, flat_amount, tiered, hybrid)
- `trigger_event` — When to calculate (invoice_paid, job_completed, quote_approved)
- `rate`, `flat_amount`, `tiers`, `base_amount`, `bonus_rate` — Model-specific params
- `is_active` — Never delete, only deactivate
- `effective_date`, `end_date` — Time validity
- `version`, `previous_rule_id` — Versioning chain
- `min_commission`, `max_commission_percent_of_profit`, `min_profit_threshold` — Guardrails

**Immutability:** 
- ✅ Rules NEVER deleted (only `is_active` = false)
- ✅ Changes create new version with `previous_rule_id` link
- ✅ Historical calculations reference correct rule version

**Permissions:** Admin/CEO only (enforced in UI layer)

---

### ✅ 2. CommissionRecord
**File:** `entities/CommissionRecord.json`

**Purpose:** Individual commission calculations (system-generated, immutable)

**Key Fields:**
- `user_id` — Recipient (indexed)
- `rule_id` — CommissionRule used (indexed)
- `rule_snapshot` — Entire rule object frozen at calculation time
- `trigger_entity_type`, `trigger_entity_id`, `trigger_entity_number` — What triggered (indexed)
- `calculation_date` — When calculated
- `commission_amount` — Final amount earned
- `calculation_inputs` — Frozen snapshot (invoice_total, costs, profit, etc.)
- `calculation_formula` — Human-readable (e.g., "($10,000 - $7,000) × 5%")
- `status` — Lifecycle (pending → approved → paid / cancelled / clawed_back)
- `payout_period_id` — PayoutPeriod FK (indexed)
- `paid_date`, `paid_in_payroll_id`, `paid_via_method` — Payment tracking
- `approved_by`, `approved_at` — Approval workflow
- `cancelled_by`, `cancelled_at`, `cancellation_reason` — Cancellation audit
- `clawback_reason`, `clawback_date`, `clawback_by` — Clawback tracking
- `is_disputed`, `dispute_reason`, `dispute_resolved_by` — Dispute resolution
- `calculated_by_system` — True if auto, false if manual override

**Immutability:**
- ✅ NEVER edited after creation
- ✅ Cancellation/clawback = status change only
- ✅ Disputes logged but don't modify amounts
- ✅ All actions timestamped + user attributed

**Indexes:**
- `user_id` — Fast user commission queries
- `trigger_entity_id` — Prevent duplicates per invoice
- `payout_period_id` — Period aggregation

**Permissions:** System-create only (no manual creation)

---

### ✅ 3. PayoutPeriod
**File:** `entities/PayoutPeriod.json`

**Purpose:** Batch commissions into payout cycles

**Key Fields:**
- `period_name` — Display name
- `period_type` — Frequency (weekly, biweekly, monthly, quarterly)
- `period_start`, `period_end` — Date range
- `status` — Lifecycle (open → closed → paid)
- `total_commissions`, `total_recipients`, `total_records` — Aggregations
- `breakdown_by_model` — Totals per commission model
- `breakdown_by_trigger` — Totals per trigger event
- `closed_by`, `closed_at` — Close audit
- `paid_date`, `paid_by`, `payment_method`, `payment_reference` — Payment audit
- `reopened`, `reopened_by`, `reopened_at`, `reopen_reason` — Reopen tracking

**Lifecycle:**
1. `open` — Accepting new commissions
2. `closed` — Locked for review (no new commissions)
3. `paid` — Payouts distributed

**Aggregations:** Pre-calculated totals (updated by backend)

**Permissions:** Admin/Finance only

---

## 🔐 PERMISSIONS DESIGN

### **CommissionRule:**
- **Create:** Admin/CEO only
- **Edit:** None (create new version instead)
- **Deactivate:** Admin/CEO only
- **View:** Admin/Finance only (employees don't see rules)

### **CommissionRecord:**
- **Create:** System only (via backend automation)
- **Edit:** None (immutable)
- **Cancel:** Admin/Finance only (creates cancellation audit)
- **View:** 
  - Employee: Own records only
  - Admin/Finance: All records

### **PayoutPeriod:**
- **Create:** Admin/Finance only (or automated)
- **Close:** Admin/Finance only
- **Mark Paid:** Admin/Finance only
- **Reopen:** CEO only (emergency only)
- **View:** Admin/Finance only

**Enforcement:** UI-level (roleRules) + backend validation

---

## 📊 DATA RELATIONSHIPS

```
CommissionRule (1) ─────▶ (N) CommissionRecord
                              │
                              │ (N)
                              ↓
                         PayoutPeriod (1)
                              │
                              │ (N)
                              ↓
                         WeeklyPayroll (optional link)

Invoice (1) ─────▶ (N) CommissionRecord (trigger)
Job (1) ─────▶ (N) CommissionRecord (trigger)
Quote (1) ─────▶ (N) CommissionRecord (trigger)

User (1) ─────▶ (N) CommissionRecord (recipient)
```

**Foreign Keys:**
- `CommissionRecord.rule_id` → `CommissionRule.id`
- `CommissionRecord.user_id` → `User.id`
- `CommissionRecord.trigger_entity_id` → `Invoice.id` / `Job.id` / `Quote.id`
- `CommissionRecord.payout_period_id` → `PayoutPeriod.id`
- `CommissionRecord.paid_in_payroll_id` → `WeeklyPayroll.id` (optional)

---

## 🔍 INDEXES STRATEGY

### **CommissionRecord Indexes:**
```javascript
{
  user_id: true,              // Fast "my commissions" queries
  trigger_entity_id: true,    // Prevent duplicate per invoice
  payout_period_id: true,     // Period aggregation
  status: false,              // Filter in app (not heavy traffic)
  calculation_date: false     // Sort in app
}
```

**Query Patterns:**
- User dashboard: `filter({ user_id, status: 'paid' })`
- Admin review: `filter({ status: 'pending' })`
- Period close: `filter({ payout_period_id })`

---

## 🛡️ GUARDRAILS IMPLEMENTATION

### **Validation Logic (Backend):**

```javascript
// Pseudo-code for backend function
const validateCommissionEligibility = (invoice, user, rule) => {
  return {
    invoice_paid: invoice.status === 'paid',
    user_active: user.employment_status === 'active',
    positive_profit: (invoice.total - invoice.costs) > 0,
    min_profit: (invoice.total - invoice.costs) >= rule.min_profit_threshold,
    not_duplicate: !existingCommission(invoice.id, user.id),
    rule_active: rule.is_active && isDateInRange(invoice.payment_date, rule),
    below_monthly_cap: userMonthlyTotal(user.id) < 50000
  };
};
```

**Stored In:** `CommissionRecord.calculation_inputs.validation_checks`

---

### **Cap Enforcement:**

```javascript
const applyCommissionCaps = (amount, inputs, rule) => {
  // Min cap
  if (amount < rule.min_commission) return 0;
  
  // Max % of profit cap
  const maxByProfit = inputs.profit × (rule.max_commission_percent_of_profit / 100);
  if (amount > maxByProfit) {
    amount = maxByProfit;
  }
  
  return amount;
};
```

**Audit:** Original amount + capped amount both stored

---

## 📝 AUDIT TRAIL DESIGN

### **Snapshot Strategy:**

**At calculation time:**
1. Freeze `CommissionRule` → `rule_snapshot`
2. Freeze all inputs → `calculation_inputs`
3. Generate formula text → `calculation_formula`
4. Store validation checks → `calculation_inputs.validation_checks`

**Result:** 100% reproducible calculation

---

### **Immutability Guarantees:**

```javascript
// Frontend/Backend enforcement
const updateCommissionRecord = (id, data) => {
  throw new Error('CommissionRecords are immutable. Create new record or cancel existing.');
};
```

**Only Allowed Changes:**
- `status` field (pending → approved → paid)
- Audit fields (approved_by, paid_date, etc.)

**Never Allowed:**
- `commission_amount`
- `calculation_inputs`
- `rule_id`

---

## 🔄 STATUS LIFECYCLE

### **CommissionRecord States:**

```
pending ──────▶ approved ──────▶ paid
   │               │
   │               │
   ▼               ▼
cancelled      cancelled
   │
   ▼
clawed_back (if paid invoice refunded)
```

**Transitions:**
- `pending` → `approved`: Admin reviews, approves
- `approved` → `paid`: Included in payout, marked paid
- `pending` → `cancelled`: Admin cancels (before approval)
- `approved` → `cancelled`: Admin cancels (before payment)
- `paid` → `clawed_back`: Invoice refunded, commission reversed

---

### **PayoutPeriod States:**

```
open ──────▶ closed ──────▶ paid
              │               │
              │               │
              ▼               ▼
           reopened ────────▶ closed (again)
```

**Transitions:**
- `open` → `closed`: Admin closes period for review
- `closed` → `paid`: Payouts distributed
- `closed` → `reopened`: Emergency reopening (CEO only)

---

## 📐 CALCULATION REPRODUCIBILITY

### **Example Snapshot:**

```json
{
  "commission_amount": 150,
  "calculation_formula": "($10,000 - $7,000) × 5% = $150",
  "calculation_inputs": {
    "invoice_total": 10000,
    "invoice_costs": 7000,
    "labor_cost": 5000,
    "material_cost": 1500,
    "other_expenses": 500,
    "profit": 3000,
    "profit_margin_percent": 30,
    "model_used": "percentage_profit",
    "rate_applied": 0.05,
    "invoice_number": "INV-00045",
    "job_id": "job_abc123",
    "job_name": "ABC Corp Project",
    "payment_date": "2026-01-20",
    "validation_checks": {
      "invoice_paid": true,
      "positive_profit": true,
      "min_profit": true,
      "not_duplicate": true,
      "rule_active": true
    }
  },
  "rule_snapshot": {
    "rule_name": "Sales Rep 5% Profit",
    "commission_model": "percentage_profit",
    "rate": 0.05,
    "min_commission": 10,
    "max_commission_percent_of_profit": 30,
    "effective_date": "2026-01-01"
  }
}
```

**Result:** Anyone can verify `$150` is correct by inspecting snapshot

---

## 🚫 ANTI-PATTERNS PREVENTED

### **What We're NOT Doing:**

❌ **Manual commission editing** → System-calculated only  
❌ **Hidden formulas** → All stored as human-readable text  
❌ **Payroll duplication** → Separate entities, linked for display  
❌ **Deleteable records** → Immutable, cancellation via status  
❌ **Speculative commissions** → Only on paid invoices (cash basis)  
❌ **Missing audit trail** → Every input/output logged

---

## ✅ FUTURE-PROOFING

### **Extensibility Points:**

1. **New Commission Models:**
   - Add to `commission_model` enum
   - Add model-specific fields (e.g., `custom_formula_json`)
   - Backward compatible (old records use `rule_snapshot`)

2. **New Trigger Events:**
   - Add to `trigger_event` enum
   - Entity automation handles new triggers
   - No schema migration needed

3. **Multi-Currency:**
   - Add `currency` field to `CommissionRecord`
   - Add `exchange_rate` to `calculation_inputs`

4. **Team Commissions:**
   - Add `team_commission` boolean to `CommissionRule`
   - Add `split_recipients` array to `CommissionRecord`

---

## 📊 QUERY PERFORMANCE

### **Expected Query Patterns:**

```javascript
// User dashboard (frequent)
CommissionRecord.filter({ 
  user_id: currentUser.id, 
  status: 'paid' 
}, '-calculation_date', 50);
// Index: user_id ✅

// Admin review queue (frequent)
CommissionRecord.filter({ 
  status: 'pending' 
}, 'calculation_date');
// No index, acceptable for admin queries

// Period aggregation (infrequent)
CommissionRecord.filter({ 
  payout_period_id: period.id 
});
// Index: payout_period_id ✅

// Duplicate check (critical)
CommissionRecord.filter({ 
  trigger_entity_id: invoice.id,
  user_id: user.id
});
// Composite check via indexes ✅
```

**Performance:** Optimized for frequent user/admin queries

---

## 🔗 INTEGRATION POINTS

### **Existing Entities (No Modification):**

| Entity | Relationship | Used For |
|--------|--------------|----------|
| **Invoice** | Trigger entity | Total, payment_date, job_id |
| **Job** | Cost aggregation | Sum TimeEntry + Expense |
| **TimeEntry** | Labor cost source | hours × hourly_rate |
| **Expense** | Material cost source | Sum by account_category |
| **User** | Recipient | ID, role, employment_status |
| **WeeklyPayroll** | Display link | Show commission in payroll |

**No schema changes needed** ✅

---

## 📋 VALIDATION CHECKLIST

- [x] ✅ CommissionRule created (18 fields, versioning, guardrails)
- [x] ✅ CommissionRecord created (31 fields, immutable, indexed)
- [x] ✅ PayoutPeriod created (20 fields, lifecycle, aggregations)
- [x] ✅ Indexes defined (user_id, trigger_entity_id, payout_period_id)
- [x] ✅ Status enums defined (pending/approved/paid/cancelled/clawed_back)
- [x] ✅ Audit fields included (all actions timestamped + user attributed)
- [x] ✅ Snapshot fields (rule_snapshot, calculation_inputs)
- [x] ✅ Human-readable formula (calculation_formula)
- [x] ✅ Guardrail fields (caps, thresholds, validation_checks)
- [x] ✅ No calculations in entities (pure data)
- [x] ✅ No automations yet (entities only)
- [x] ✅ No UI changes (data layer only)

---

## 🎯 READY FOR NEXT PHASE

**Phase C1.1:** ✅ COMPLETE — Data model ready  
**Phase C1.2:** Calculation engine (backend functions)  
**Phase C1.3:** Automation (entity triggers)  
**Phase C1.4:** UI (admin rules manager, employee view)

---

**DELIVERABLE:** Entities are production-ready, auditable, and future-proof.