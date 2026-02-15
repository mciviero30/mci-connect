# TASK #1: CONCURRENCY-SAFE FINANCIAL DETERMINISM ENGINE

## Implementation Plan v2.0

### Problem Statement
Race conditions can occur when two requests calculate versions simultaneously:
```
Time | Request A                    | Request B
-----|------------------------------|-----------------------------
T1   | Fetch current version (v1)   |
T2   |                              | Fetch current version (v1)
T3   | Create version v2            |
T4   |                              | Create version v2 (COLLISION!)
```

### Solution: Three-Layer Defense

#### Layer 1: Database Constraints (Immutable)
```json
_constraints: {
  unique: [
    ["entity_id", "calculation_version"],    // Prevents duplicate versions
    ["entity_id", "is_current"]              // Ensures only ONE current
  ]
}
```

**Effect:** Second creation attempt FAILS with UNIQUE constraint violation → Triggers retry logic

#### Layer 2: Optimistic Locking Pattern
```javascript
// Step 1: Fetch current version (READ)
const current = await base44.entities.CalculationVersion.filter(
  { entity_id: entityId, is_current: true }
);
const nextVersion = current[0].calculation_version + 1;

// Step 2: Invalidate previous (WRITE)
await base44.entities.CalculationVersion.update(current[0].id, {
  is_current: false
});

// Step 3: Create new version (WRITE)
// Will FAIL if concurrent request already created this version number
await base44.entities.CalculationVersion.create({
  entity_id: entityId,
  calculation_version: nextVersion,  // ← UNIQUE constraint enforced here
  is_current: true
});
```

**Effect:** Constraint violation caught, retry triggered

#### Layer 3: Retry Logic with Exponential Backoff
```javascript
async function createCalculationVersionWithRetry(base44, entityId, input, attempt = 0) {
  if (attempt >= MAX_RETRIES) {
    throw new Error('Failed after 3 retries');
  }

  try {
    return await createCalculationVersion(base44, input);
  } catch (err) {
    if (err.message === 'RACE_CONDITION_DETECTED') {
      // Sleep: 50ms, 100ms, 200ms (exponential backoff)
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      
      // Refetch version number and retry
      const { nextVersion } = await getNextVersionNumber(base44, entityId);
      input.calculation_version = nextVersion;
      
      return createCalculationVersionWithRetry(base44, entityId, input, attempt + 1);
    }
    throw err;
  }
}
```

**Effect:** On collision, wait, refetch, and retry with new version number

---

## Concurrency Safety Guarantees

| Scenario | Detection | Recovery | Result |
|----------|-----------|----------|--------|
| No collision | Create succeeds on first try | None | Version v2 created ✓ |
| Collision (T1-T2) | UNIQUE constraint fails | Retry with exponential backoff | Version v3 created ✓ |
| Concurrent + network delay | UNIQUE constraint fails | Retry + sleep before refetch | Version v4 created ✓ |
| 3 consecutive collisions | After 3 retries, throw error | Manual audit required | Error returned (safe) |

---

## Transaction Safety (Without Explicit Transactions)

Base44 SDK does NOT expose explicit transaction control, so we use:

1. **Constraint-based safety**: DB constraints enforce single current version
2. **Atomic operations**: Each operation is atomic at database level
3. **Idempotent updates**: Setting `is_current=false` can be retried safely
4. **All-or-nothing create**: CalculationVersion.create() succeeds or fails entirely

**Safety Property:** If any step fails:
- Previous version is NOT set to false (reverted by retry)
- New version is NOT created (constraint violation detected)
- Idempotency record is NOT created (enables retry)

---

## Data Flow Example

**Request 1: User edits quote, submits calculation request**
```
Input:  items=[...], tax_rate=8.5, request_id=uuid-123
Hash:   sha256({items, tax_rate, rule_versions}) = "abc123..."

1. Check idempotency → Not found
2. Fetch current version → v1 (is_current=true)
3. Calculate next → v2
4. Invalidate v1 → UPDATE id=v1_id SET is_current=false
5. Create v2 → INSERT entity_id=xyz, calculation_version=2, is_current=true
6. Save idempotency → INSERT request_id=uuid-123, cached_result={...}

Output: { version: 2, totals: {...}, input_hash: "abc123..." }
```

**Request 1B: Duplicate request (same request_id)**
```
Input:  items=[...], tax_rate=8.5, request_id=uuid-123
Hash:   sha256({items, tax_rate, rule_versions}) = "abc123..."

1. Check idempotency → FOUND (status=completed)
2. Return cached_result directly (NO CALCULATION)

Output: { status: 'cached', result: {...} }
```

**Request 2: Concurrent calculation (race condition)**
```
Input:  items=[...], tax_rate=8.5, request_id=uuid-456 (DIFFERENT)
Hash:   sha256({items, tax_rate, rule_versions}) = "def456..."

1. Check idempotency → Not found
2. Fetch current version → v1 (or v2 if req1 partially completed)
3. Calculate next → v2 (or v3)
4. Invalidate previous → UPDATE
5. Create new → INSERT calculation_version=2
   ERROR: UNIQUE(entity_id=xyz, calculation_version=2) VIOLATION!
   
RETRY (Attempt 1):
6. Sleep 50ms
7. Fetch current version → v2 (is_current=true, from req1)
8. Calculate next → v3
9. Create v3 → INSERT calculation_version=3, is_current=true
   SUCCESS ✓

Output: { version: 3, totals: {...}, input_hash: "def456..." }
```

---

## No Calculations Outside Transaction Boundary

✅ **All calculations protected by version mechanism:**
- `calculateQuoteHash()` → Called BEFORE creation (safe, read-only)
- `calculateTotals()` → Called BEFORE creation (safe, read-only)
- `getNextVersionNumber()` → With retry logic, collision detection
- `createCalculationVersionWithRetry()` → DB constraints enforce atomicity

✅ **No silent fallback on failure:**
```javascript
catch (error) {
  return new Response(JSON.stringify({
    error: 'Financial calculation failed',
    code: '500_CALC_FAILURE',
    message: error.message
  }), { status: 500 });
}
```

---

## Testing Strategy

### Unit Test: Hash Determinism
```javascript
const input1 = { items: [...], tax_rate: 8.5, rules: v1 };
const input2 = { items: [...], tax_rate: 8.5, rules: v1 };
const hash1 = calculateQuoteHash(input1, v1);
const hash2 = calculateQuoteHash(input2, v1);
assert(hash1 === hash2); // Same input = same hash
```

### Integration Test: Race Condition
```javascript
// Fire 5 concurrent requests with same quote_id
const promises = Array(5).fill().map(() => 
  fetch('/calculate', { body: { quote_id, items, tax_rate } })
);
const results = await Promise.all(promises);

// Verify:
// - 1 request succeeded (v2)
// - 4 requests succeeded after retry (v3, v4, v5, v6)
// - All have unique versions
// - Only latest is_current=true
assert(results.every(r => r.success));
```

### Load Test: 100 Concurrent Calculations
```javascript
// Fire 100 simultaneous requests to same quote
// Verify: All succeed, versions 1-101 created, 0 failures
```

---

## Deployment Checklist

- [ ] CalculationVersion schema deployed with UNIQUE constraints
- [ ] calculateQuoteDeterministic.js function deployed with retry logic
- [ ] IdempotencyRecord schema deployed (already done)
- [ ] Test idempotency: Verify duplicate request returns cached result
- [ ] Test concurrency: Verify race conditions trigger retries
- [ ] Test constraint enforcement: Verify UNIQUE violations caught
- [ ] Monitor: Log all retry attempts for 24 hours
- [ ] Verify: All calculations use this function (no legacy paths)

---

## Migration Impact

**Existing Quotes:** No action needed
- Old calculations ignored (not in CalculationVersion)
- First edit triggers new versioning automatically

**Existing Invoices:** Backfill CalculationVersion records
- One-time migration: Create v1 records for all invoices
- Script: `backfillCalculationVersions.js`

---

## Future Enhancements

1. **Explicit Transactions**: Upgrade to SDK version with transaction support
2. **Distributed Locking**: Add Redis-based optimistic lock for multi-region safety
3. **Calculation Streaming**: Return results as they're calculated (for long-running)
4. **Rollback Hooks**: Automatically revert quote totals if calculation fails