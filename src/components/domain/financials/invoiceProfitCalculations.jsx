/**
 * ============================================================================
 * INVOICE PROFIT & COMMISSION (REAL-TIME MODEL - NO LOCKS)
 * ============================================================================
 * 
 * CRITICAL RULES:
 * 1. profit_real = total - total_cost (ALWAYS)
 * 2. commission_amount = profit_real × commission_percentage (ALWAYS)
 * 3. Recalculate on EVERY change: items, quantities, costs, tax, discounts
 * 4. NO locks - financial data always mutable
 * 5. Commission NOT frozen on "sent" status
 * 6. SSOT: invoice.items + commission_percentage
 * 7. Backend enforces, frontend reads
 */

/**
 * Calculate invoice profit (SSOT)
 * @param {Object} params - { total, total_cost }
 * @returns {Object} { profit_real, breakdown }
 */
export function calculateInvoiceProfit(params) {
  const { total = 0, total_cost = 0 } = params;
  
  const profit_real = total - total_cost;
  
  return {
    total: Number(total.toFixed(2)),
    total_cost: Number(total_cost.toFixed(2)),
    profit_real: Number(profit_real.toFixed(2)),
    breakdown: `Revenue: $${total.toFixed(2)} - Cost: $${total_cost.toFixed(2)} = Profit: $${profit_real.toFixed(2)}`
  };
}

/**
 * Calculate commission (SSOT: profit_real × percentage)
 * @param {Object} params - { profit_real, commission_percentage }
 * @returns {Object} { commission_amount, breakdown }
 */
export function calculateInvoiceCommission(params) {
  const { profit_real = 0, commission_percentage = 10 } = params;
  
  // Commission = profit × percentage
  const commission_amount = (profit_real * commission_percentage) / 100;
  
  return {
    profit_real: Number(profit_real.toFixed(2)),
    commission_percentage: Number(commission_percentage.toFixed(2)),
    commission_amount: Number(commission_amount.toFixed(2)),
    breakdown: `Profit: $${profit_real.toFixed(2)} × ${commission_percentage}% = Commission: $${commission_amount.toFixed(2)}`
  };
}

/**
 * MAIN: Recalculate invoice financials in real-time
 * @param {Object} invoice - Full invoice object
 * @returns {Object} { profit_real, commission_amount, changed }
 */
export function recalculateInvoiceFinancials(invoice) {
  // STEP 1: Calculate profit
  const profitCalc = calculateInvoiceProfit({
    total: invoice.total || 0,
    total_cost: invoice.total_cost || 0
  });
  
  // STEP 2: Calculate commission
  const commissionCalc = calculateInvoiceCommission({
    profit_real: profitCalc.profit_real,
    commission_percentage: invoice.commission_percentage || 10
  });
  
  // STEP 3: Detect changes
  const changed = {
    profit: invoice.profit_real !== profitCalc.profit_real,
    commission: invoice.commission_amount !== commissionCalc.commission_amount
  };
  
  return {
    profit_real: profitCalc.profit_real,
    commission_amount: commissionCalc.commission_amount,
    changed: Object.values(changed).some(v => v === true),
    details: {
      profit_changed: changed.profit,
      commission_changed: changed.commission,
      previous_profit: invoice.profit_real || 0,
      previous_commission: invoice.commission_amount || 0
    }
  };
}

/**
 * Validate financial data integrity
 * @param {Object} invoice - Invoice object
 * @returns {Object} { valid, errors }
 */
export function validateFinancialIntegrity(invoice) {
  const errors = [];
  
  // Recalculate to check
  const recalc = recalculateInvoiceFinancials(invoice);
  
  // Check if stored values match calculated values
  if (Math.abs(invoice.profit_real - recalc.profit_real) > 0.01) {
    errors.push(`Profit mismatch: stored ${invoice.profit_real}, calculated ${recalc.profit_real}`);
  }
  
  if (Math.abs(invoice.commission_amount - recalc.commission_amount) > 0.01) {
    errors.push(`Commission mismatch: stored ${invoice.commission_amount}, calculated ${recalc.commission_amount}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    expected: {
      profit_real: recalc.profit_real,
      commission_amount: recalc.commission_amount
    }
  };
}