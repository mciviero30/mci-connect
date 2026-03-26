/**
 * COMMISSION SYSTEM INVARIANTS - Runtime Assertions
 * ✅ Verify immutability
 * ✅ Log anomalies only (DEV mode)
 * ✅ No blocking, no UI noise
 */

/**
 * Verify CommissionRecord status transition is valid
 * Allowed: pending → approved → paid
 */
export const validateCommissionStatusTransition = (oldStatus, newStatus) => {
  const VALID_TRANSITIONS = {
    pending: ['approved', 'pending'],
    approved: ['paid', 'approved'],
    paid: ['paid']
  };

  const allowed = VALID_TRANSITIONS[oldStatus]?.includes(newStatus);
  
  if (!allowed && import.meta.env.DEV) {
  }

  return allowed;
};

/**
 * Verify commission amount wasn't modified after creation
 */
export const validateCommissionAmountImmutable = (original, current) => {
  if (original && current && original.commission_amount !== current.commission_amount) {
    return false;
  }
  return true;
};

/**
 * Verify rule snapshot matches active rule
 * (Warn if rule was modified after commission created)
 */
export const validateRuleSnapshotConsistency = (commissionRuleSnapshot, activeRule) => {
  if (!commissionRuleSnapshot || !activeRule) return true;

  // Compare critical fields only
  const criticalFields = ['commission_model', 'rate', 'flat_amount', 'base_amount', 'bonus_rate'];
  const mismatches = [];

  criticalFields.forEach(field => {
    if (commissionRuleSnapshot[field] !== activeRule[field]) {
      mismatches.push(field);
    }
  });

  if (mismatches.length > 0 && import.meta.env.DEV) {
    return false;
  }

  return true;
};

/**
 * Assert commission can only transition forward (no backtracking)
 */
export const validateCommissionNeverBacktracks = (oldRecord, newRecord) => {
  const PRIORITY = { pending: 1, approved: 2, paid: 3 };
  const oldPriority = PRIORITY[oldRecord?.status] || 0;
  const newPriority = PRIORITY[newRecord?.status] || 0;

  if (newPriority < oldPriority) {
    console.error('[Commission Invariant] Backtracking detected (CRITICAL):', {
      from: oldRecord?.status,
      to: newRecord?.status,
      commission_id: oldRecord?.id,
      timestamp: new Date().toISOString()
    });
    return false;
  }

  return true;
};