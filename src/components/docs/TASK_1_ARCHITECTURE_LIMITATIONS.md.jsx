# TASK #1: ARCHITECTURE LIMITATIONS & SAFETY GUARANTEES

## Critical Finding: Transaction Boundary Limitations

### The Issue
Base44 SDK does **NOT** expose explicit transaction support. Our implementation cannot use:
```javascript
BEGIN TRANSACTION
  INSERT CalculationVersion
  UPDATE previous is_current = false
COMMIT
```

### Current Safety Model: Constraint-Based (NOT ACID)

Instead, we use a **constraint-based safety** model:

```javascript
// Step 1: SET PREVIOUS TO NOT CURRENT (separate operation)
await base44.entities.CalculationVersion.update(previous.id, {
  is_current: false
});

// Step 2: CREATE NEW VERSION (separate operation)
const newVersion = await base44.entities.CalculationVersion.create({
  entity_id: entityId,
  calculation_version: nextVersion,
  is_current: true
  // DB constraint enforces: UNIQUE(entity_id, is_current=true)
});
```

**What if Step 1 succeeds but Step 2 fails?**
- Previous version: `is_current = false` ✓
- New version: NOT created
- Result: Entity has no current version (safe state)
- Recovery: Retry creates new version

**What if Step 2 succeeds but update fails to propagate?**
- New version: `is_current = true` ✓
- DB constraint violations would be caught on next read
- Query for current version would find both (UNIQUE violation alerts)
- Recovery: Manual audit identifies which one actually latest

### Safety Guarantee Provided
✅ **UNIQUE(entity_id, is_current = true) constraint is enforced at DB level**
- Only ONE version can be current per entity
- DB rejects any second insert with is_current=true for same entity
- This is enforced regardless of our application logic

### What We DON'T Have
❌ Atomicity: Steps are not in same transaction
❌ Isolation: Concurrent readers might see intermediate states
❌ Consistency: Constraint enforcement is reactive, not preventative
❌ Durability: Crashes between steps could leave orphaned updates

### Risk Assessment

| Scenario | Probability | Impact | Mitigation |
|----------|-------------|--------|-----------|
| Step 1 succeeds, Step 2 fails | Very low | Entity has no current version | Retry logic auto-fixes |
| Concurrent creation race | Medium | Both attempt v2 | UNIQUE constraint catches, retry allocates v3 |
| Network partition during Step 1 | Low | Previous not updated | Idempotency check prevents duplicate |
| DB constraint violation | Very low | System should reject | Error returned to client (safe) |

### Recommendation

**For Phase A (current):** This is ACCEPTABLE because:
1. Retry logic handles race conditions
2. UNIQUE constraint is database-enforced
3. Constraint violations are caught and retried
4. Worst case: Audit trail shows discrepancy

**For Phase B (future):** Upgrade to transaction support when:
1. Base44 SDK adds explicit transaction support, OR
2. Migrate to database with native transaction API, OR
3. Implement Redis-based distributed locking

---

## Hash Determinism: Item Reordering Fixed

### The Problem
```javascript
items = [
  { id: 'A', qty: 2 },
  { id: 'B', qty: 3 }
];

// vs

items = [
  { id: 'B', qty: 3 },
  { id: 'A', qty: 2 }
];

// Without sorting, these produce different hashes!
```

### The Solution: Canonical Sorting
```javascript
function canonicalSort(items) {
  return [...items].sort((a, b) => {
    const keyA = (a.id || a.item_name || JSON.stringify(a)).toString();
    const keyB = (b.id || b.item_name || JSON.stringify(b)).toString();
    return keyA.localeCompare(keyB);
  });
}

// Now both orderings produce SAME hash
```

**Implemented in:** `FinancialDeterminismFactory.js` line 25-37

### Verification
```
Input 1: { items: [A, B], tax_rate: 8 }
Input 2: { items: [B, A], tax_rate: 8 }

hash1 = sha256(JSON.stringify({ items: [A, B], tax_rate: 8 }))
hash2 = sha256(JSON.stringify({ items: [A, B], tax_rate: 8 })) // Sorted!

hash1 === hash2 ✓
```

---

## Code Reuse: Single Engine Pattern

### Before (AVOIDED)
```
calculateQuoteDeterministic.js
calculateInvoiceDeterministic.js
calculateCommissionDeterministic.js

// 3 separate implementations
// 3x maintenance burden
// Possible divergence
```

### After (IMPLEMENTED)
```
FinancialDeterminismFactory.js
├─ createDeterminismEngine('Quote')
├─ createDeterminismEngine('Invoice')
└─ createDeterminismEngine('Commission')

// 1 implementation
// All use same:
// - Versioning logic
// - Idempotency layer
// - Permission scoping
// - Concurrency retry logic
// - Hash calculation (with canonical sorting)
```

### Usage Pattern
```javascript
// In any calculation function:
import { createDeterminismEngine } from './FinancialDeterminismFactory.js';

const engine = createDeterminismEngine('Quote');

// Calculate hash (deterministic, order-independent)
const hash = engine.calculateHash({ items, tax_rate }, ruleVersions);

// Get next version (race-condition safe)
const { nextVersion } = await engine.getNextVersionNumber(base44, quoteId);

// Check permission (same rules for all entities)
await engine.checkPermission(base44, user, entity, 'write');

// Check idempotency (same deduplication for all)
const cached = await engine.checkIdempotency(base44, requestId);
if (cached) return cached;

// Create version with retry (same concurrency handling)
const version = await engine.createVersionWithRetry(base44, quoteId, input);

// Save for future deduplication
await engine.saveIdempotency(base44, requestId, hash, quoteId, result);
```

---

## Architecture Invariants

### MUST BE TRUE at all times:
1. ✅ Only ONE CalculationVersion per entity has `is_current=true`
2. ✅ Same inputs → Same calculation_input_hash (deterministic)
3. ✅ Duplicate request_id → Same cached_result (idempotent)
4. ✅ All permission checks use same engine method
5. ✅ All retries use same exponential backoff (50ms → 100ms → 200ms)
6. ✅ No calculations execute outside retry boundary

### MUST NOT HAPPEN:
1. ❌ Two versions with is_current=true for same entity
2. ❌ Hash changes if items array is reordered
3. ❌ Different permission logic between entity types
4. ❌ Calculations without versioning
5. ❌ Idempotency records created without concurrent protection

---

## Next Steps: Invoice + Commission Extensions

With factory pattern in place:

1. **calculateInvoiceDeterministic.js** uses `createDeterminismEngine('Invoice')`
2. **calculateCommissionDeterministic.js** uses `createDeterminismEngine('Commission')`
3. All share same versioning, idempotency, permissions, concurrency logic
4. Only calculation logic differs (invoice totals vs commission splits)

No duplication, no divergence risk.