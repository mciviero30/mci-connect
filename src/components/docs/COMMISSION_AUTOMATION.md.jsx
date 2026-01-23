# COMMISSION AUTOMATION — Phase C1.3

**Date:** 2026-01-23  
**Architect:** Senior Automation Architect  
**Status:** ✅ IMPLEMENTED

---

## Automation Created

### ✅ Entity Automation: Invoice Update → Commission Processing

**Trigger:** Invoice entity update  
**Condition:** `old_data.status !== 'paid' && data.status === 'paid'`  
**Function:** `processCommissionOnPayment`

---

## Workflow

```
Invoice.status → 'paid'
        ↓
Entity Automation Triggered
        ↓
processCommissionOnPayment
        ↓
1. Validate trigger (status change)
2. Fetch active CommissionRules (trigger_event = 'invoice_paid')
3. Find eligible users (by role / user_ids)
4. For each user-rule pair:
   ├─ Check duplicate (idempotency)
   ├─ Validate eligibility (8 checks)
   ├─ Calculate commission (inline)
   ├─ Create CommissionRecord (status: 'pending')
   └─ Log result (created/skipped/error)
        ↓
Return summary (created: X, skipped: Y, errors: Z)
```

---

## Idempotency Guarantees

### ✅ Duplicate Prevention:

```javascript
// Before creating CommissionRecord
const existing = await CommissionRecord.filter({
  trigger_entity_id: invoice.id,
  user_id: user.id,
  rule_id: rule.id
});

if (existing.length > 0) {
  skip('duplicate');
}
```

**Result:** Safe to run multiple times (e.g., webhook retry)

---

### ✅ Status Transition Check:

```javascript
// Only trigger if status changed TO 'paid'
const statusChanged = old_data.status !== 'paid' && data.status === 'paid';

if (!statusChanged) {
  skip('no_status_change_to_paid');
}
```

**Result:** Won't create duplicates on re-saves

---

## Eligibility Validation (8 Checks)

1. **invoice_paid** — Invoice status = 'paid'
2. **user_active** — User employment_status = 'active'
3. **rule_active** — Rule is_active = true
4. **rule_date_valid** — Payment date within rule effective range
5. **invoice_has_job** — Invoice has job_id
6. **positive_profit** — Profit > 0
7. **min_profit_threshold** — Profit >= rule.min_profit_threshold
8. **not_duplicate** — No existing CommissionRecord

**All must pass** ✅

---

## User Eligibility Logic

### **Matching Users to Rules:**

```javascript
// For each active rule:
if (rule.applicable_user_ids.length > 0) {
  // Specific users (override)
  matchingUsers = allUsers.filter(u => 
    rule.applicable_user_ids.includes(u.id)
  );
} else if (rule.applicable_roles.length > 0) {
  // By role
  matchingUsers = allUsers.filter(u => 
    rule.applicable_roles.includes(u.role)
  );
}

// Filter active only
matchingUsers = matchingUsers.filter(u => 
  u.employment_status === 'active'
);
```

**Example:**
- Rule 1: `applicable_roles: ['sales_rep']` → All active sales reps
- Rule 2: `applicable_user_ids: ['user_123']` → Specific user only

---

## Logging Strategy

### **Outcome Categories:**

1. **Created** — CommissionRecord successfully created
   ```javascript
   {
     record_id: 'rec_xyz',
     user_email: 'john@example.com',
     amount: 150.00,
     formula: '($10,000 - $7,000) × 5% = $150.00'
   }
   ```

2. **Skipped** — User not eligible / duplicate / zero amount
   ```javascript
   {
     user_email: 'jane@example.com',
     reason: 'not_eligible',
     checks: {
       invoice_paid: true,
       min_profit_threshold: false // ❌ Blocking
     }
   }
   ```

3. **Errors** — Unexpected failure
   ```javascript
   {
     user_email: 'bob@example.com',
     error: 'EmployeeDirectory not found'
   }
   ```

---

### **Console Output:**

```
[processCommission] Invoice paid! { invoice_id: 'inv_123', invoice_number: 'INV-00045', total: 10000 }
[processCommission] Found 2 active rules
[processCommission] Found 3 eligible user-rule pairs
[processCommission] ✅ Created commission for john@example.com { record_id: 'rec_1', amount: 150 }
[processCommission] User jane@example.com not eligible { reason: 'min_profit_threshold' }
[processCommission] Duplicate found for bob@example.com { existing_record_id: 'rec_2' }
[processCommission] Processing complete { created: 1, skipped: 2, errors: 0 }
```

---

## Response Payload

### **Success Response:**

```json
{
  "success": true,
  "invoice_id": "inv_123",
  "invoice_number": "INV-00045",
  "results": {
    "created": [
      {
        "record_id": "rec_1",
        "user_id": "user_456",
        "user_email": "john@example.com",
        "rule_id": "rule_789",
        "amount": 150.00,
        "formula": "($10,000 - $7,000) × 5% = $150.00"
      }
    ],
    "skipped": [
      {
        "user_id": "user_789",
        "user_email": "jane@example.com",
        "rule_id": "rule_789",
        "reason": "min_profit_threshold",
        "checks": {
          "invoice_paid": true,
          "user_active": true,
          "positive_profit": true,
          "min_profit_threshold": false
        }
      }
    ],
    "errors": []
  }
}
```

---

### **Skipped Response (No Rules):**

```json
{
  "success": true,
  "processed": 0,
  "reason": "no_active_rules"
}
```

---

## Testing Scenarios

### **Scenario 1: Happy Path**

**Setup:**
- Invoice: `{ status: 'sent', total: 10000, job_id: 'job1' }`
- User: `{ id: 'u1', role: 'sales_rep', employment_status: 'active' }`
- Rule: `{ commission_model: 'percentage_profit', rate: 0.05, applicable_roles: ['sales_rep'] }`

**Action:** Update Invoice: `{ status: 'paid' }`

**Expected:**
- ✅ 1 CommissionRecord created
- Amount: $150
- Status: 'pending'
- Log: "✅ Created commission for user@example.com"

---

### **Scenario 2: Duplicate Protection**

**Setup:**
- Same as Scenario 1
- Existing CommissionRecord: `{ trigger_entity_id: 'inv_123', user_id: 'u1' }`

**Action:** Update Invoice: `{ status: 'paid' }` (again)

**Expected:**
- ⏭️ 0 CommissionRecords created
- Log: "Duplicate found for user@example.com"
- Result: `{ skipped: [{ reason: 'duplicate' }] }`

---

### **Scenario 3: Ineligible User**

**Setup:**
- Invoice: `{ status: 'sent', total: 5000, job_id: 'job1' }`
- Costs: $4950 (profit = $50)
- Rule: `{ min_profit_threshold: 100 }`

**Action:** Update Invoice: `{ status: 'paid' }`

**Expected:**
- ⏭️ 0 CommissionRecords created
- Log: "User not eligible { reason: 'min_profit_threshold' }"
- Result: `{ skipped: [{ reason: 'min_profit_threshold', checks: {...} }] }`

---

### **Scenario 4: Zero Commission**

**Setup:**
- Invoice: `{ total: 10000 }`
- Costs: $9950 (profit = $50)
- Rule: `{ rate: 0.05, min_commission: 10 }`
- Raw commission: $50 × 0.05 = $2.50

**Action:** Update Invoice: `{ status: 'paid' }`

**Expected:**
- ⏭️ 0 CommissionRecords created (below min $10 → $0)
- Log: "User commission is $0 { reason: 'zero_amount' }"
- Result: `{ skipped: [{ reason: 'zero_amount' }] }`

---

### **Scenario 5: Multiple Users**

**Setup:**
- Invoice: `{ total: 20000, job_id: 'job1' }`
- Rule 1: `{ applicable_roles: ['sales_rep'], rate: 0.05 }`
- Rule 2: `{ applicable_roles: ['project_manager'], rate: 0.02 }`
- Users: 1 sales_rep, 2 project_managers (all active)

**Action:** Update Invoice: `{ status: 'paid' }`

**Expected:**
- ✅ 3 CommissionRecords created
- Sales rep: $300 (5%)
- PM 1: $120 (2%)
- PM 2: $120 (2%)
- Log: "Processing complete { created: 3, skipped: 0, errors: 0 }"

---

### **Scenario 6: Status Re-Save (No Trigger)**

**Setup:**
- Invoice: `{ status: 'paid' }` (already paid)

**Action:** Update Invoice: `{ total: 11000 }` (status unchanged)

**Expected:**
- ⏭️ Skipped: "no_status_change_to_paid"
- Result: `{ skipped: 'no_status_change_to_paid' }`

---

## Error Handling

### **Graceful Degradation:**

```javascript
// Per-user try/catch
for (const { user, rule } of eligibleUsers) {
  try {
    // Calculate and create
  } catch (error) {
    console.error(`Error processing user ${user.email}:`, error);
    results.errors.push({
      user_id: user.id,
      user_email: user.email,
      error: error.message
    });
    // Continue processing other users
  }
}
```

**Result:** One user's error doesn't block others

---

### **Fatal Errors:**

```javascript
// Top-level try/catch
try {
  // Entire automation
} catch (error) {
  console.error('[processCommission] Fatal error:', error);
  return Response.json({ error: error.message }, { status: 500 });
}
```

**Result:** Returns 500, entity automation retries later

---

## Performance Considerations

### **Query Optimization:**

- ✅ Single query for all active rules
- ✅ Single query for all users (cached in memory)
- ✅ Duplicate check per user-rule pair (indexed query)
- ✅ TimeEntry/Expense queries per job (unavoidable)

**Estimated Time:**
- 1-3 users: < 2 seconds
- 10 users: < 5 seconds
- 50+ users: Consider batching (future optimization)

---

### **Potential Bottlenecks:**

1. **Large job histories** (many TimeEntry/Expense records)
   - Solution: Add date filters (already implemented)

2. **Many rules × many users**
   - Solution: Parallelize calculations (future optimization)

3. **Missing EmployeeDirectory records**
   - Solution: Default hourly_rate = $0 (already handled)

---

## Security

### **Service Role Usage:**

```javascript
// Automation runs as service role (no user context)
const base44 = createClientFromRequest(req);

// All queries use asServiceRole
base44.asServiceRole.entities.CommissionRule.filter(...);
base44.asServiceRole.entities.CommissionRecord.create(...);
```

**Result:** No permission issues, full access

---

### **Validation:**

- ✅ Only triggers on 'paid' status
- ✅ Checks user active status
- ✅ Validates rule effective dates
- ✅ Prevents duplicates

---

## Monitoring & Observability

### **Key Metrics to Track:**

```javascript
{
  invoice_id: string,
  invoice_number: string,
  total_eligible_pairs: number,
  created_count: number,
  skipped_count: number,
  error_count: number,
  total_commission_amount: number,
  processing_time_ms: number
}
```

**Dashboard Potential:**
- Commissions per invoice
- Average commission amount
- Success/skip/error rates
- Processing time trends

---

## Future Enhancements (Not Implemented)

### **Phase C1.4: Notifications**
- Email to user: "You earned $150 commission!"
- Email to admin: "3 commissions pending approval"

### **Phase C1.5: Payroll Integration**
- Link CommissionRecord → WeeklyPayroll
- Display in payroll UI
- Mark as paid when payroll closes

### **Phase C2: Advanced Features**
- Batch processing (process N invoices at once)
- Retroactive recalculation (if rule changes)
- Dispute workflow (employee challenges amount)

---

## ✅ DELIVERABLE CHECKLIST

- [x] ✅ Backend function: processCommissionOnPayment
- [x] ✅ Entity automation: Invoice update trigger
- [x] ✅ Idempotency: Duplicate check before creation
- [x] ✅ Status validation: Only 'paid' transitions
- [x] ✅ User eligibility: Role + user_id matching
- [x] ✅ Inline calculation: Full commission logic
- [x] ✅ Logging: Created/skipped/error tracking
- [x] ✅ Error handling: Graceful per-user failures
- [x] ✅ Testing scenarios: 6 documented cases
- [x] ✅ No UI changes (backend only)
- [x] ✅ No notifications yet (future phase)
- [x] ✅ No payroll integration yet (future phase)

---

**PHASE C1.3 COMPLETE** — Commission automation live and safe.