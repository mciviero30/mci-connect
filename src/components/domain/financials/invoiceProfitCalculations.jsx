/**
 * ============================================================================
 * INVOICE PROFIT CALCULATIONS (CAPA 2 - SINGLE SOURCE OF TRUTH)
 * ============================================================================
 * 
 * Real-time profit-based recalculation for invoices.
 * 
 * CRITICAL RULES:
 * 1. Commission = f(actual_invoice_profit)
 * 2. Cost changes → Profit changes → Commission changes
 * 3. On "sent" status: margin_locked = true, commission_locked = true
 * 4. No recalculation when locked
 * 5. Unlock requires explicit admin action
 * 6. All changes create CalculationVersion records
 * 7. INVOICE = FINANCIAL SOURCE OF TRUTH
 */

/**
 * Calculate invoice profit
 * @param {Object} params - { subtotal, tax_amount, cost_amount }
 * @returns {Object} { profit, profit_margin, breakdown }
 */
export function calculateInvoiceProfit(params) {
  const { subtotal = 0, tax_amount = 0, cost_amount = 0 } = params;
  
  // Total revenue = subtotal + tax
  const revenue = subtotal + tax_amount;
  
  // Profit = revenue - cost
  const profit = revenue - cost_amount;
  
  // Profit margin % = (profit / revenue) × 100
  const profit_margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  
  return {
    revenue: Number(revenue.toFixed(2)),
    cost_amount: Number(cost_amount.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    profit_margin: Number(profit_margin.toFixed(2)),
    breakdown: `Revenue: $${revenue.toFixed(2)} - Cost: $${cost_amount.toFixed(2)} = Profit: $${profit.toFixed(2)}`
  };
}

/**
 * Calculate commission based on profit
 * @param {Object} params - { profit, commission_rule_version }
 * @returns {Object} { commission_amount, commission_pct, rule_version }
 */
export function calculateInvoiceCommission(params) {
  const { profit = 0, commission_rule_version = '1.0' } = params;
  
  // RULE 1.0: Default commission structure
  // - Profit > $0: 10% of profit
  // - Profit ≤ $0: $0 commission (no commission on losses)
  
  let commission_pct = 0;
  
  if (profit > 0) {
    commission_pct = 10; // 10% of profit
  }
  
  const commission_amount = (profit * commission_pct) / 100;
  
  return {
    profit: Number(profit.toFixed(2)),
    commission_pct: Number(commission_pct.toFixed(2)),
    commission_amount: Number(commission_amount.toFixed(2)),
    rule_version: commission_rule_version,
    breakdown: `Profit: $${profit.toFixed(2)} × ${commission_pct}% = Commission: $${commission_amount.toFixed(2)}`
  };
}

/**
 * MAIN: Recalculate invoice financials
 * @param {Object} params - { invoice, cost_amount, margin_locked, commission_locked }
 * @returns {Object} {
 *   profit, profit_margin, commission_amount,
 *   can_recalculate, locked_fields,
 *   calculation_hash, version_needed
 * }
 */
export function recalculateInvoiceFinancials(params) {
  const {
    invoice,
    cost_amount,
    margin_locked = false,
    commission_locked = false
  } = params;
  
  // HARD GUARD: Check lock status
  if (margin_locked || commission_locked) {
    return {
      can_recalculate: false,
      locked_fields: {
        margin: margin_locked,
        commission: commission_locked
      },
      reason: 'Invoice is locked. Admin unlock required for recalculation.',
      current_profit: invoice.profit || 0,
      current_commission: invoice.commission_amount || 0
    };
  }
  
  // STEP 1: Calculate profit
  const profitCalc = calculateInvoiceProfit({
    subtotal: invoice.subtotal || 0,
    tax_amount: invoice.tax_amount || 0,
    cost_amount: cost_amount || invoice.cost_amount || 0
  });
  
  // STEP 2: Calculate commission (based on profit)
  const commissionCalc = calculateInvoiceCommission({
    profit: profitCalc.profit,
    commission_rule_version: '1.0'
  });
  
  // STEP 3: Detect changes (for CalculationVersion)
  const changes_detected = {
    profit_changed: invoice.profit !== profitCalc.profit,
    commission_changed: invoice.commission_amount !== commissionCalc.commission_amount,
    cost_changed: invoice.cost_amount !== cost_amount
  };
  
  const any_changes = Object.values(changes_detected).some(v => v === true);
  
  // STEP 4: Create calculation hash (for idempotency)
  const calculation_input = {
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    cost_amount: cost_amount,
    rule_version: '1.0'
  };
  
  const calculation_hash = hashObject(calculation_input);
  
  return {
    can_recalculate: true,
    any_changes,
    changes_detected,
    
    // New financial values
    profit: profitCalc.profit,
    profit_margin: profitCalc.profit_margin,
    revenue: profitCalc.revenue,
    commission_amount: commissionCalc.commission_amount,
    commission_pct: commissionCalc.commission_pct,
    
    // Metadata for CalculationVersion
    calculation_hash,
    version_needed: any_changes,
    breakdown: {
      profit: profitCalc.breakdown,
      commission: commissionCalc.breakdown
    },
    
    // Current state
    current_profit: invoice.profit || 0,
    current_commission: invoice.commission_amount || 0
  };
}

/**
 * Helper: Generate calculation hash
 * @param {Object} obj - Object to hash
 * @returns {string} SHA256 hash
 */
function hashObject(obj) {
  // Simple hash for deterministic calculation identification
  // In production, use crypto.subtle.digest('SHA-256', ...)
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * Lock invoice on "sent" status
 * @param {Object} invoice - Invoice object
 * @returns {Object} Updated invoice with locks
 */
export function lockInvoiceOnSent(invoice) {
  return {
    ...invoice,
    margin_locked: true,
    commission_locked: true,
    locked_at: new Date().toISOString(),
    locked_reason: 'Invoice sent to customer - financial data frozen'
  };
}

/**
 * Admin unlock (requires explicit action)
 * @param {Object} invoice - Invoice object
 * @param {string} unlocked_by_user_id - Admin user ID
 * @param {string} unlock_reason - Reason for unlock
 * @returns {Object} Updated invoice with locks removed
 */
export function unlockInvoiceForEditing(invoice, unlocked_by_user_id, unlock_reason) {
  return {
    ...invoice,
    margin_locked: false,
    commission_locked: false,
    unlocked_at: new Date().toISOString(),
    unlocked_by_user_id,
    unlock_reason,
    unlock_audit: {
      timestamp: new Date().toISOString(),
      user_id: unlocked_by_user_id,
      reason: unlock_reason,
      previous_profit: invoice.profit,
      previous_commission: invoice.commission_amount
    }
  };
}

/**
 * Validate financial lock state
 * @param {Object} invoice - Invoice object
 * @returns {Object} { locked, violations }
 */
export function validateFinancialLocks(invoice) {
  const violations = [];
  
  if (invoice.status === 'sent' && !invoice.margin_locked) {
    violations.push('Invoice sent but margin not locked');
  }
  
  if (invoice.status === 'sent' && !invoice.commission_locked) {
    violations.push('Invoice sent but commission not locked');
  }
  
  if (invoice.margin_locked && !invoice.commission_locked) {
    violations.push('Inconsistent lock state: margin locked but commission unlocked');
  }
  
  return {
    locked: invoice.margin_locked === true && invoice.commission_locked === true,
    violations,
    valid: violations.length === 0
  };
}