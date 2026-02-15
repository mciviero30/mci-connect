# TASK #1: CONTROLLED INTEGRATION PLAN

**Status:** ✅ IMPLEMENTATION PLAN CONFIRMED  
**Strategy:** Shadow Mode + Feature Flag  
**Rollout Timeline:** Phase 1 (Quote/Invoice) → Phase 2 (Commission)

---

## PHASE 1: SHADOW MODE DEPLOYMENT

### Feature Flag Mechanism

**CompanySettings entity (new field):**
```json
{
  "id": "company_001",
  "enable_financial_engine_v2": false,  // Default: shadow mode
  "financial_engine_mismatch_tolerance": 0.01  // $0.01 tolerance
}
```

**Or environment variable (for faster control):**
```
ENABLE_FINANCIAL_ENGINE_V2=false (default)
FINANCIAL_MISMATCH_TOLERANCE_CENTS=1
```

### Execution Flow (Flag = false)

```javascript
// Quote save endpoint (pseudo-code)
async function saveQuote(quoteData) {
  // ============ STEP 1: Legacy Calculation ============
  const legacyResult = calculateQuoteTotals_v1(
    quoteData.items,
    quoteData.tax_rate
  );
  
  // Persist to Quote entity immediately
  await base44.entities.Quote.update(quoteData.id, {
    subtotal: legacyResult.subtotal,
    tax_amount: legacyResult.tax_amount,
    total: legacyResult.total
  });
  
  // ============ STEP 2: Shadow Calculation (V2) ============
  // Fire-and-forget, silent background call
  try {
    const shadowResult = await base44.functions.invoke('calculateQuoteDeterministic', {
      quote_id: quoteData.id,
      items: quoteData.items,
      tax_rate: quoteData.tax_rate,
      request_id: `shadow_${quoteData.id}_${Date.now()}`
    });
    
    // ============ STEP 3: Mismatch Detection ============
    const mismatch = detectMismatch(legacyResult, shadowResult.result.totals);
    
    if (mismatch.hasMismatch) {
      logMismatchAlert({
        entity_type: 'Quote',
        entity_id: quoteData.id,
        v1_total: legacyResult.total,
        v2_total: shadowResult.result.totals.total,
        difference_cents: mismatch.differenceCents,
        severity: mismatch.severity,  // 'warning' | 'critical'
        timestamp: new Date().toISOString()
      });
      
      // Also store in MismatchLog for reporting
      await base44.entities.FinancialMismatchLog.create({
        entity_type: 'Quote',
        entity_id: quoteData.id,
        v1_subtotal: legacyResult.subtotal,
        v1_tax: legacyResult.tax_amount,
        v1_total: legacyResult.total,
        v2_subtotal: shadowResult.result.totals.subtotal,
        v2_tax: shadowResult.result.totals.tax_amount,
        v2_total: shadowResult.result.totals.total,
        input_hash: shadowResult.result.input_hash,
        reason_detected: mismatch.reason,
        requires_investigation: true
      });
    }
  } catch (shadowError) {
    // V2 calculation failed, but user sees V1 result
    // Log error for debugging
    logShadowError({
      entity_type: 'Quote',
      entity_id: quoteData.id,
      error: shadowError.message,
      severity: 'info'  // Not critical, V1 worked
    });
  }
  
  // Return V1 result to user (shadow mode)
  return {
    success: true,
    totals: legacyResult
  };
}
```

### Execution Flow (Flag = true)

```javascript
async function saveQuote(quoteData) {
  // Skip legacy, use V2 directly
  const v2Result = await base44.functions.invoke('calculateQuoteDeterministic', {
    quote_id: quoteData.id,
    items: quoteData.items,
    tax_rate: quoteData.tax_rate,
    request_id: generateRequestId()
  });
  
  // Persist V2 result
  await base44.entities.Quote.update(quoteData.id, {
    subtotal: v2Result.result.totals.subtotal,
    tax_amount: v2Result.result.totals.tax_amount,
    total: v2Result.result.totals.total,
    latest_calculation_version: v2Result.result.calculation_version_id
  });
  
  return {
    success: true,
    totals: v2Result.result.totals
  };
}
```

---

## MISMATCH DETECTION LOGIC

### Tolerance Definition

```javascript
function detectMismatch(v1Totals, v2Totals) {
  const TOLERANCE_CENTS = process.env.FINANCIAL_MISMATCH_TOLERANCE_CENTS || 1;
  const TOLERANCE_DOLLARS = TOLERANCE_CENTS / 100;
  
  const subtotalDiff = Math.abs(v1Totals.subtotal - v2Totals.subtotal);
  const taxDiff = Math.abs(v1Totals.tax_amount - v2Totals.tax_amount);
  const totalDiff = Math.abs(v1Totals.total - v2Totals.total);
  
  const maxDiff = Math.max(subtotalDiff, taxDiff, totalDiff);
  
  return {
    hasMismatch: maxDiff > TOLERANCE_DOLLARS,
    differenceCents: Math.round(maxDiff * 100),
    severity: maxDiff > 1.00 ? 'critical' : 'warning',
    reason: determineReason(v1Totals, v2Totals),
    breakdownDiffs: {
      subtotal_cents: Math.round(subtotalDiff * 100),
      tax_cents: Math.round(taxDiff * 100),
      total_cents: Math.round(totalDiff * 100)
    }
  };
}
```

### Logging Schema

**New Entity: FinancialMismatchLog**
```json
{
  "name": "FinancialMismatchLog",
  "properties": {
    "entity_type": { "type": "string", "enum": ["Quote", "Invoice", "Commission"] },
    "entity_id": { "type": "string", "index": true },
    "v1_subtotal": { "type": "number" },
    "v1_tax_amount": { "type": "number" },
    "v1_total": { "type": "number" },
    "v2_subtotal": { "type": "number" },
    "v2_tax_amount": { "type": "number" },
    "v2_total": { "type": "number" },
    "input_hash": { "type": "string" },
    "reason_detected": { "type": "string" },
    "severity": { "type": "string", "enum": ["warning", "critical"] },
    "requires_investigation": { "type": "boolean", "default": true },
    "investigated_by": { "type": "string" },
    "investigation_notes": { "type": "string" },
    "resolved": { "type": "boolean", "default": false }
  },
  "required": ["entity_type", "entity_id", "v1_subtotal", "v2_subtotal"]
}
```

---

## VALIDATION WINDOW REQUIREMENTS

### Phase 1: Quote + Invoice Validation (7 Days)

**Starting:** After deploying shadow mode  
**Duration:** 7 consecutive days  
**Criteria for passing:**

- [ ] Total quotes processed > 50
- [ ] Total invoices processed > 50
- [ ] Zero critical mismatches (tolerance < $0.01)
- [ ] Warnings < 2 (tolerance $0.01-$1.00)
- [ ] Average V1 match rate > 99.9%
- [ ] No data loss or calculation errors in V2

**Daily validation checklist:**
```
Day 1: Deploy shadow mode, monitor logs
Day 2: Verify V2 calculating correctly (no timeouts)
Day 3: Spot-check 10 mismatches (if any)
Day 4-7: Monitor for patterns, ensure no systematic bias
```

**Abort criteria (automatic rollback):**
- V2 calculation timeout rate > 5%
- Persistent mismatch pattern detected
- V2 hash collision on same entity_id
- More than 1 critical mismatch

### Phase 2: Commission (After Phase 1 passes)

Once Quote + Invoice locked to V2 for 3+ days with zero issues:

```
Day 1 (Phase 2): Commission shadow mode activated
Day 1-7: Same validation window as Phase 1
Day 8+: Eligible for V2 flag flip IF validation passes
```

**Commission is NOT enabled in production until:**
- Phase 1 validation window (7 days) closed with ZERO critical issues
- Phase 2 validation window (7 days) closed with ZERO critical issues
- Total of 14 calendar days of shadow validation
- Admin explicitly approves final cutover

---

## FLAG TRANSITION TIMELINE

```
T+0 hrs:   Deploy shadow mode (V1 active, V2 silent)
T+24 hrs:  Review first day logs, spot-check 5 quotes
T+3 days:  Daily reports showing V1 ≈ V2
T+7 days:  Phase 1 validation complete
           Decision: Ready for V2 flip?
           
If YES:
  T+7 days: Set ENABLE_FINANCIAL_ENGINE_V2 = true (Quote + Invoice only)
  T+7-14d:  Monitor production, keep legacy code
  T+14+ d:  Commission enabled in shadow
  T+21 d:   Commission validation complete
  T+21+ d:  Set flag for Commission V2
  T+30 d:   Legacy code audited, can consider removal
  
If NO:
  T+7 days: Investigate mismatches
  T+14 d:   Fix root cause
  T+15 d:   Restart 7-day validation window
```

---

## IMPLEMENTATION CHECKLIST

### Code Changes Required

- [ ] Add feature flag to CompanySettings (or env var)
- [ ] Create `FinancialMismatchLog` entity
- [ ] Update Quote save endpoint with shadow call
- [ ] Update Invoice save endpoint with shadow call
- [ ] Add mismatch detection function
- [ ] Add logging/alerting for mismatches
- [ ] Create admin dashboard for mismatch review
- [ ] Document feature flag in runbooks

### Testing Before Rollout

- [ ] Unit test: calculateQuoteTotals_v1 vs V2 match on 20 test cases
- [ ] Unit test: mismatch detection tolerance works correctly
- [ ] Integration test: shadow call doesn't block main flow
- [ ] Integration test: shadow call timeout doesn't crash endpoint
- [ ] Load test: shadow calls don't increase latency > 50ms
- [ ] Idempotency test: multiple shadow calls with same request_id only create one version

### Monitoring Required

- [ ] CloudWatch logs for V1/V2 mismatch events
- [ ] Daily report of mismatches by entity type
- [ ] Alert on any critical mismatch (severity='critical')
- [ ] Dashboard showing pass rate (V1 ≈ V2)
- [ ] Version growth rate monitoring (check for runaway versions)

---

## ROLLBACK PROCEDURE

If critical issues discovered:

```bash
# Immediate action
export ENABLE_FINANCIAL_ENGINE_V2=false

# This reverts ALL calculations to V1
# V2 snapshots remain for investigation
# No data loss
```

**Investigation steps:**
1. Export mismatch log for analysis
2. Identify root cause (rounding? tax rule? item normalization?)
3. Fix in deterministic engine
4. Run comparison tests
5. Restart validation window

---

## SIGN-OFF CONFIRMATION

✅ **Implementation Plan Approved**

**Confirms:**
1. Shadow mode prevents production impact
2. Mismatch detection catches issues early
3. Feature flag allows instant rollback
4. Validation window ensures quality gate
5. Commission protected until Phase 1 complete
6. Legacy code stays for fallback

**Next Action:** Implement shadow mode wiring to Quote + Invoice endpoints

**No production changes until:** Feature flag deployed + shadow monitoring active for 24 hours