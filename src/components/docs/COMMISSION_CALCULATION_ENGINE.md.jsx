# COMMISSION CALCULATION ENGINE — Phase C1.2

**Date:** 2026-01-23  
**Architect:** Senior Backend Systems Architect  
**Status:** ✅ IMPLEMENTED

---

## Backend Functions Created

### ✅ 1. calculateCommission
**File:** `functions/calculateCommission.js`

**Purpose:** Pure calculation engine - deterministic and reproducible

**API:**
```javascript
POST /functions/calculateCommission
{
  "invoice_id": "inv_123",
  "user_id": "user_456",
  "rule_id": "rule_789"
}
```

**Response (Success):**
```json
{
  "success": true,
  "eligible": true,
  "commission_amount": 150.00,
  "raw_commission": 150.00,
  "capped": false,
  "payload": { 
    // Ready-to-insert CommissionRecord
    "user_id": "user_456",
    "rule_id": "rule_789",
    "trigger_entity_type": "Invoice",
    "commission_amount": 150.00,
    "calculation_inputs": { /* full snapshot */ },
    "calculation_formula": "($10,000 - $7,000) × 5% = $150.00",
    "status": "pending"
  },
  "calculation_inputs": { /* detailed inputs */ },
  "formula": "($10,000 - $7,000) × 5% = $150.00"
}
```

**Response (Ineligible):**
```json
{
  "success": false,
  "eligible": false,
  "commission_amount": 0,
  "eligibility_checks": {
    "invoice_paid": false,  // ❌ Blocking reason
    "user_active": true,
    "positive_profit": true
  },
  "blocked_reason": "invoice_paid"
}
```

**Does NOT:**
- ❌ Create CommissionRecord
- ❌ Send notifications
- ❌ Trigger on events

**Workflow:**
1. Validate inputs (invoice, user, rule exist)
2. Check eligibility (8 validation checks)
3. Aggregate job costs (TimeEntry + Expense)
4. Apply formula (percentage/flat/tiered/hybrid)
5. Apply caps (min $10, max 30% of profit)
6. Generate formula text
7. Return payload (for manual/automated creation)

---

### ✅ 2. aggregateJobCosts
**File:** `functions/aggregateJobCosts.js`

**Purpose:** Calculate total job costs from TimeEntry + Expense

**API:**
```javascript
POST /functions/aggregateJobCosts
{
  "job_id": "job_abc",
  "as_of_date": "2026-01-20" // Optional (defaults to today)
}
```

**Response:**
```json
{
  "job_id": "job_abc",
  "as_of_date": "2026-01-20",
  "labor_cost": 5000.00,
  "material_cost": 1500.00,
  "other_expenses": 500.00,
  "total_cost": 7000.00,
  "breakdown": {
    "time_entries_count": 12,
    "total_hours": 100,
    "labor_details": [
      {
        "entry_id": "entry_1",
        "date": "2026-01-15",
        "employee_name": "John Tech",
        "hours": 8,
        "hourly_rate": 50,
        "cost": 400
      }
    ],
    "material_expenses_count": 5,
    "other_expenses_count": 3
  }
}
```

**Logic:**
- **Labor Cost:** `Σ (TimeEntry.hours_worked × EmployeeDirectory.hourly_rate)`
- **Material Cost:** `Σ Expense.amount WHERE account_category = 'expense_materials'`
- **Other Expenses:** `Σ Expense.amount WHERE account_category ≠ 'expense_materials'`

**User Resolution:**
- Prefers `user_id` → EmployeeDirectory lookup
- Falls back to `employee_email` → EmployeeDirectory lookup

**Filters:** Only entries/expenses up to `as_of_date`

---

### ✅ 3. validateCommissionEligibility
**File:** `functions/validateCommissionEligibility.js`

**Purpose:** Pre-flight validation (before calculation)

**API:**
```javascript
POST /functions/validateCommissionEligibility
{
  "invoice_id": "inv_123",
  "user_id": "user_456",
  "rule_id": "rule_789" // Optional (finds all applicable)
}
```

**Response:**
```json
{
  "eligible": true,
  "applicable_rules": [
    {
      "rule_id": "rule_789",
      "rule_name": "Sales Rep 5%",
      "eligible": true,
      "checks": {
        "invoice_paid": true,
        "user_active": true,
        "rule_active": true,
        "rule_date_valid": true,
        "invoice_has_job": true,
        "not_duplicate": true,
        "positive_profit": true,
        "min_profit_threshold": true
      },
      "estimated_commission": 150.00
    }
  ],
  "recommended_rule": { /* best match */ },
  "invoice_status": "paid",
  "invoice_total": 10000,
  "user_status": "active"
}
```

**Use Cases:**
- UI feedback (before calculation)
- Batch processing (filter eligible invoices)
- Audit checks

---

## 🧮 FORMULA HANDLERS

### **1. Percentage of Profit**
```javascript
percentage_profit: (inputs, rule) => {
  const profit = inputs.profit;
  if (profit <= 0) return 0;
  return profit * rule.rate;
}

// Example:
// Profit: $3,000, Rate: 5%
// Commission: $3,000 × 0.05 = $150
```

---

### **2. Flat Amount**
```javascript
flat_amount: (inputs, rule) => {
  return rule.flat_amount || 0;
}

// Example:
// Flat: $500
// Commission: $500 (regardless of profit)
```

---

### **3. Tiered**
```javascript
tiered: (inputs, rule) => {
  const profit = inputs.profit;
  if (profit <= 0) return 0;
  
  // Find tier where profit fits
  const tier = rule.tiers.find(t => {
    const meetsMin = profit >= t.min_profit;
    const meetsMax = !t.max_profit || profit < t.max_profit;
    return meetsMin && meetsMax;
  });
  
  if (!tier) return 0;
  return profit * tier.rate;
}

// Example tiers:
// [
//   { min_profit: 0, max_profit: 5000, rate: 0.03 },
//   { min_profit: 5000, max_profit: 10000, rate: 0.05 },
//   { min_profit: 10000, max_profit: null, rate: 0.07 }
// ]
//
// Profit $8,000 → Tier 2 (5%) → $400
```

---

### **4. Hybrid**
```javascript
hybrid: (inputs, rule) => {
  const profit = inputs.profit;
  const baseAmount = rule.base_amount || 0;
  
  if (profit <= 0) return baseAmount; // Base only
  
  const bonusAmount = profit * rule.bonus_rate;
  return baseAmount + bonusAmount;
}

// Example:
// Base: $200, Profit: $3,000, Bonus Rate: 2%
// Commission: $200 + ($3,000 × 0.02) = $260
```

---

## 🛡️ CAPS & THRESHOLDS

### **Applied in Order:**

1. **Minimum Commission:**
   ```javascript
   if (amount < rule.min_commission) return 0;
   // Default: $10
   ```

2. **Maximum % of Profit:**
   ```javascript
   const maxByProfit = profit × (rule.max_commission_percent_of_profit / 100);
   if (amount > maxByProfit) amount = maxByProfit;
   // Default: 30%
   ```

3. **Round to Cents:**
   ```javascript
   return Math.round(amount × 100) / 100;
   ```

**Example:**
- Raw commission: $4,500
- Profit: $10,000
- Max 30% cap: $3,000
- **Final:** $3,000 (capped)

---

## ✅ VALIDATION CHECKS

### **8 Eligibility Checks:**

| Check | Logic | Blocking? |
|-------|-------|-----------|
| `invoice_paid` | `invoice.status === 'paid'` | ✅ Yes |
| `user_active` | `user.employment_status === 'active'` | ✅ Yes |
| `rule_active` | `rule.is_active === true` | ✅ Yes |
| `rule_date_valid` | Payment date within rule effective range | ✅ Yes |
| `user_has_role` | User role in `applicable_roles` or `applicable_user_ids` | ✅ Yes |
| `invoice_has_job` | `invoice.job_id` exists | ✅ Yes |
| `positive_profit` | `profit > 0` | ✅ Yes |
| `min_profit_threshold` | `profit >= rule.min_profit_threshold` | ✅ Yes |
| `not_duplicate` | No existing CommissionRecord for same invoice+user | ✅ Yes |

**All must pass** for commission to be calculated

---

## 📊 COST AGGREGATION LOGIC

### **Labor Cost:**
```javascript
// For each TimeEntry:
const employee = await EmployeeDirectory.filter({ user_id: entry.user_id });
const cost = entry.hours_worked × employee.hourly_rate;
laborCost += cost;
```

**User Resolution:**
1. Try `user_id` → EmployeeDirectory
2. Fallback to `employee_email` → EmployeeDirectory
3. Default to $0 if no employee found

---

### **Material Cost:**
```javascript
const materialExpenses = Expense.filter({
  job_id: jobId,
  account_category: 'expense_materials',
  date: { $lte: invoiceDate }
});
materialCost = Σ materialExpenses.amount;
```

---

### **Other Expenses:**
```javascript
const otherExpenses = Expense.filter({
  job_id: jobId,
  account_category: { $ne: 'expense_materials' },
  date: { $lte: invoiceDate }
});
otherCost = Σ otherExpenses.amount;
```

---

## 🔬 TESTING EXAMPLES

### **Test Case 1: Simple Percentage**
```javascript
// INPUT
{
  invoice: { total: 10000, status: 'paid', job_id: 'job1' },
  user: { id: 'u1', role: 'sales_rep', employment_status: 'active' },
  rule: { 
    commission_model: 'percentage_profit', 
    rate: 0.05,
    applicable_roles: ['sales_rep']
  }
}

// MOCK COSTS
labor_cost: 5000
material_cost: 1500
other_expenses: 500
total_cost: 7000

// CALCULATION
profit = 10000 - 7000 = 3000
commission = 3000 × 0.05 = 150

// OUTPUT
{
  success: true,
  commission_amount: 150,
  formula: "($10,000.00 - $7,000.00) × 5.0% = $150.00"
}
```

---

### **Test Case 2: Tiered Model**
```javascript
// RULE
tiers: [
  { min_profit: 0, max_profit: 5000, rate: 0.03 },
  { min_profit: 5000, max_profit: 10000, rate: 0.05 },
  { min_profit: 10000, max_profit: null, rate: 0.07 }
]

// PROFIT: $8,000
// Matches Tier 2 (5000-10000 @ 5%)
commission = 8000 × 0.05 = 400

// OUTPUT
{
  commission_amount: 400,
  formula: "Profit $8,000.00 → Tier 5% = $400.00"
}
```

---

### **Test Case 3: Cap Applied**
```javascript
// RAW COMMISSION: $4,500
// PROFIT: $10,000
// MAX CAP: 30% of profit = $3,000

commission = Math.min(4500, 3000) = 3000

// OUTPUT
{
  commission_amount: 3000,
  raw_commission: 4500,
  capped: true,
  formula: "... = $4,500.00 → Capped to $3,000.00"
}
```

---

### **Test Case 4: Ineligible (Invoice Not Paid)**
```javascript
// INPUT
invoice.status = 'sent' // NOT 'paid'

// OUTPUT
{
  success: false,
  eligible: false,
  commission_amount: 0,
  eligibility_checks: {
    invoice_paid: false, // ❌
    user_active: true,
    positive_profit: true
  },
  blocked_reason: "invoice_paid"
}
```

---

## 🔄 CALCULATION WORKFLOW

```
┌─────────────────────────────────────────┐
│ 1. Validate Inputs                      │
│    - Invoice exists?                    │
│    - User exists?                       │
│    - Rule exists?                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Check Eligibility                    │
│    - 8 validation checks                │
│    - Return early if any fail           │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Aggregate Costs                      │
│    - Query TimeEntry (labor)            │
│    - Query Expense (materials/other)    │
│    - Sum with breakdown                 │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Calculate Profit                     │
│    profit = invoice.total - total_cost  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 5. Apply Formula                        │
│    - percentage_profit                  │
│    - flat_amount                        │
│    - tiered                             │
│    - hybrid                             │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 6. Apply Caps                           │
│    - Min $10                            │
│    - Max 30% of profit                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 7. Generate Formula Text                │
│    "($10,000 - $7,000) × 5% = $150"     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 8. Build Payload                        │
│    - CommissionRecord ready to insert   │
│    - Snapshots included                 │
│    - Formula stored                     │
└─────────────────────────────────────────┘
              ↓
         RETURN (do not write)
```

---

## 🔐 SECURITY

**Permissions:** Admin/Finance only (enforced)

**Service Role Usage:**
- ✅ Uses `base44.asServiceRole` for entity queries
- ✅ Admin identity verified via `base44.auth.me()`
- ✅ No user-scoped writes (calculation only)

**Data Access:**
- Reads Invoice, User, CommissionRule, TimeEntry, Expense
- Does NOT write anything

---

## 🧪 TESTABILITY

### **Pure Function Characteristics:**

✅ **Deterministic:** Same inputs = same output  
✅ **No side effects:** Does not write to database  
✅ **Reproducible:** All inputs in calculation_inputs snapshot  
✅ **Isolated:** Can test without database (mock inputs)

---

### **Test Invocation:**
```javascript
// Via Base44 test tool
const result = await base44.functions.invoke('calculateCommission', {
  invoice_id: 'inv_test_123',
  user_id: 'user_test_456',
  rule_id: 'rule_test_789'
});

console.log(result.commission_amount); // Verify calculation
console.log(result.formula); // Verify formula text
console.log(result.payload); // Verify payload structure
```

---

## 📐 CALCULATION REPRODUCIBILITY

### **Snapshot Guarantee:**

Every calculation stores:
1. **All inputs** → `calculation_inputs` (frozen)
2. **Rule used** → `rule_snapshot` (frozen)
3. **Formula** → `calculation_formula` (human-readable)

**Result:** Anyone can verify calculation months later

**Example Verification:**
```javascript
// 6 months later, audit asks: "Why did John get $150?"

// Pull CommissionRecord
const record = CommissionRecord.get('rec_xyz');

// Read snapshot
console.log(record.calculation_formula);
// → "($10,000.00 - $7,000.00) × 5.0% = $150.00"

console.log(record.calculation_inputs);
// → { invoice_total: 10000, total_costs: 7000, profit: 3000, rate_applied: 0.05 }

console.log(record.rule_snapshot);
// → { rule_name: "Sales Rep 5%", rate: 0.05, ... }

// ✅ Calculation verified
```

---

## 🚀 NEXT STEPS (NOT IMPLEMENTED YET)

### **Phase C1.3:** Automation
- Entity automation: `Invoice.status` → `'paid'` triggers calculation
- Backend function: `processCommissionOnPayment`
- Automatic CommissionRecord creation

### **Phase C1.4:** UI
- Admin: Commission Rules manager
- Employee: My Commissions view
- Admin: Approval queue

### **Phase C1.5:** Payout Integration
- Link CommissionRecord → WeeklyPayroll
- Display in payroll UI
- Mark as paid when payroll closes

---

## ✅ DELIVERABLE CHECKLIST

- [x] ✅ calculateCommission function (pure calculation)
- [x] ✅ validateEligibility function (8 checks)
- [x] ✅ aggregateJobCosts function (TimeEntry + Expense)
- [x] ✅ Formula handlers (4 models: percentage, flat, tiered, hybrid)
- [x] ✅ Caps applied (min $10, max 30% profit)
- [x] ✅ Thresholds enforced (min profit $100)
- [x] ✅ Snapshot logic (inputs + rule frozen)
- [x] ✅ Formula text generator (human-readable)
- [x] ✅ Duplicate detection (prevent double-pay)
- [x] ✅ Admin-only security (403 for non-admin)
- [x] ✅ Returns payload (does NOT create record)
- [x] ✅ Fully testable (no side effects)

---

**PHASE C1.2 COMPLETE** — Calculation engine ready for automation layer.