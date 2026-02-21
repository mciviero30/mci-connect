import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// PHASE 0 HARD FREEZE — FINANCIAL RESET IN PROGRESS
// Disabled: 2026-02-21
// ============================================================
Deno.serve(async (req) => {
  return Response.json({ error: 'COMMISSION SYSTEM DISABLED — FINANCIAL RESET IN PROGRESS' }, { status: 503 });
});

/**
 * COMMISSION CALCULATION ENGINE (Phase C1.2)
 * 
 * Pure calculation function - deterministic and reproducible
 * Does NOT create CommissionRecord (returns payload only)
 * Does NOT trigger on events (manual/test invocation only)
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Admin/Finance only (calculation engine is sensitive)
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { invoice_id, user_id, rule_id } = await req.json();

    if (!invoice_id || !user_id || !rule_id) {
      return Response.json({ 
        error: 'Missing required parameters: invoice_id, user_id, rule_id' 
      }, { status: 400 });
    }

    // ===========================
    // 1. FETCH ENTITIES
    // ===========================
    const [invoice, targetUser, rule] = await Promise.all([
      base44.asServiceRole.entities.Invoice.get(invoice_id),
      base44.asServiceRole.entities.User.get(user_id),
      base44.asServiceRole.entities.CommissionRule.get(rule_id)
    ]);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }
    if (!rule) {
      return Response.json({ error: 'Commission rule not found' }, { status: 404 });
    }

    // ===========================
    // 2. VALIDATE ELIGIBILITY
    // ===========================
    const eligibility = await validateEligibility(base44, invoice, targetUser, rule);

    if (!eligibility.eligible) {
      return Response.json({
        success: false,
        eligible: false,
        commission_amount: 0,
        eligibility_checks: eligibility.checks,
        blocked_reason: Object.entries(eligibility.checks)
          .find(([key, value]) => value === false)?.[0] || 'unknown'
      });
    }

    // ===========================
    // 3. AGGREGATE JOB COSTS
    // ===========================
    const costs = await aggregateJobCosts(base44, invoice.job_id, invoice.invoice_date);

    // ===========================
    // 4. CALCULATE COMMISSION
    // ===========================
    const profit = invoice.total - costs.total_cost;

    const calculation_inputs = {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      invoice_total: invoice.total,
      invoice_date: invoice.invoice_date,
      payment_date: invoice.payment_date,
      job_id: invoice.job_id,
      job_name: invoice.job_name,
      labor_cost: costs.labor_cost,
      material_cost: costs.material_cost,
      other_expenses: costs.other_expenses,
      total_costs: costs.total_cost,
      profit: profit,
      profit_margin_percent: invoice.total > 0 ? (profit / invoice.total) * 100 : 0,
      model_used: rule.commission_model,
      rate_applied: rule.rate || null,
      validation_checks: eligibility.checks
    };

    // Apply formula
    let rawCommission = applyCommissionFormula(calculation_inputs, rule);

    // Apply caps
    const cappedCommission = applyCommissionCaps(rawCommission, calculation_inputs, rule);

    // Generate human-readable formula
    const formula = generateFormulaText(calculation_inputs, rule, rawCommission, cappedCommission);

    // ===========================
    // 5. CHECK DUPLICATE
    // ===========================
    const existing = await base44.asServiceRole.entities.CommissionRecord.filter({
      trigger_entity_id: invoice.id,
      user_id: user_id
    });

    if (existing.length > 0) {
      return Response.json({
        success: false,
        eligible: false,
        commission_amount: 0,
        blocked_reason: 'duplicate_commission',
        existing_record_id: existing[0].id
      });
    }

    // ===========================
    // 6. RETURN PAYLOAD (DO NOT CREATE RECORD)
    // ===========================
    const commissionRecordPayload = {
      user_id: user_id,
      employee_email: targetUser.email,
      employee_name: targetUser.full_name,
      rule_id: rule.id,
      rule_snapshot: rule, // Entire rule frozen
      trigger_entity_type: 'Invoice',
      trigger_entity_id: invoice.id,
      trigger_entity_number: invoice.invoice_number,
      calculation_date: new Date().toISOString(),
      commission_amount: cappedCommission,
      calculation_inputs: calculation_inputs,
      calculation_formula: formula,
      status: 'pending',
      payout_period_id: null, // Assigned later by admin
      calculated_by_system: true
    };

    return Response.json({
      success: true,
      eligible: true,
      commission_amount: cappedCommission,
      raw_commission: rawCommission,
      capped: rawCommission !== cappedCommission,
      payload: commissionRecordPayload,
      calculation_inputs: calculation_inputs,
      formula: formula
    });

  } catch (error) {
    console.error('[calculateCommission] Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

// ===========================
// VALIDATION LOGIC
// ===========================
async function validateEligibility(base44, invoice, user, rule) {
  const checks = {
    invoice_paid: invoice.status === 'paid',
    user_active: user.employment_status === 'active' || !user.employment_status, // Tolerate missing
    rule_active: rule.is_active === true,
    rule_date_valid: isRuleDateValid(invoice.payment_date || invoice.invoice_date, rule),
    user_has_role: userMatchesRule(user, rule),
    invoice_has_job: !!invoice.job_id
  };

  // Calculate profit to check thresholds
  const costs = await aggregateJobCosts(base44, invoice.job_id, invoice.invoice_date);
  const profit = invoice.total - costs.total_cost;

  checks.positive_profit = profit > 0;
  checks.min_profit_threshold = profit >= (rule.min_profit_threshold || 100);

  const eligible = Object.values(checks).every(v => v === true);

  return {
    eligible,
    checks,
    profit
  };
}

// ===========================
// COST AGGREGATION
// ===========================
async function aggregateJobCosts(base44, jobId, invoiceDate) {
  if (!jobId) {
    return {
      labor_cost: 0,
      material_cost: 0,
      other_expenses: 0,
      total_cost: 0
    };
  }

  // Fetch all time entries for this job (up to invoice date)
  const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
    job_id: jobId,
    date: { $lte: invoiceDate }
  });

  // Fetch all expenses for this job (up to invoice date)
  const expenses = await base44.asServiceRole.entities.Expense.filter({
    job_id: jobId,
    date: { $lte: invoiceDate }
  });

  // Calculate labor cost (hours × hourly_rate)
  // NOTE: hourly_rate stored on EmployeeDirectory, not User
  const laborCost = await calculateLaborCost(base44, timeEntries);

  // Calculate material cost
  const materialCost = expenses
    .filter(e => e.account_category === 'expense_materials')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  // Calculate other expenses
  const otherExpenses = expenses
    .filter(e => e.account_category !== 'expense_materials')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  const totalCost = laborCost + materialCost + otherExpenses;

  return {
    labor_cost: laborCost,
    material_cost: materialCost,
    other_expenses: otherExpenses,
    total_cost: totalCost
  };
}

async function calculateLaborCost(base44, timeEntries) {
  let totalLaborCost = 0;

  for (const entry of timeEntries) {
    // Resolve employee from user_id (preferred) or email (fallback)
    let employee = null;
    
    if (entry.user_id) {
      const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({
        user_id: entry.user_id
      });
      employee = employees[0];
    }
    
    if (!employee && entry.employee_email) {
      const employees = await base44.asServiceRole.entities.EmployeeDirectory.filter({
        employee_email: entry.employee_email
      });
      employee = employees[0];
    }

    const hourlyRate = employee?.hourly_rate || 0;
    const hours = entry.hours_worked || 0;
    totalLaborCost += hours * hourlyRate;
  }

  return totalLaborCost;
}

// ===========================
// FORMULA HANDLERS
// ===========================
function applyCommissionFormula(inputs, rule) {
  const formulas = {
    percentage_profit: (inputs, rule) => {
      const profit = inputs.profit;
      if (profit <= 0) return 0;
      return profit * (rule.rate || 0);
    },

    flat_amount: (inputs, rule) => {
      return rule.flat_amount || 0;
    },

    tiered: (inputs, rule) => {
      const profit = inputs.profit;
      if (profit <= 0) return 0;
      if (!rule.tiers || rule.tiers.length === 0) return 0;

      // Find applicable tier
      const tier = rule.tiers.find(t => {
        const meetsMin = profit >= (t.min_profit || 0);
        const meetsMax = !t.max_profit || profit < t.max_profit;
        return meetsMin && meetsMax;
      });

      if (!tier) return 0;
      
      // Store which tier was used
      inputs.tier_applied = {
        min_profit: tier.min_profit,
        max_profit: tier.max_profit,
        rate: tier.rate
      };

      return profit * (tier.rate || 0);
    },

    hybrid: (inputs, rule) => {
      const profit = inputs.profit;
      const baseAmount = rule.base_amount || 0;
      
      if (profit <= 0) {
        return baseAmount; // Base only if no profit
      }
      
      const bonusAmount = profit * (rule.bonus_rate || 0);
      return baseAmount + bonusAmount;
    }
  };

  const handler = formulas[rule.commission_model];
  if (!handler) {
    throw new Error(`Unknown commission model: ${rule.commission_model}`);
  }

  return handler(inputs, rule);
}

// ===========================
// CAPS & THRESHOLDS
// ===========================
function applyCommissionCaps(amount, inputs, rule) {
  const originalAmount = amount;

  // Cap 1: Minimum commission
  const minCommission = rule.min_commission || 10;
  if (amount < minCommission) {
    return 0;
  }

  // Cap 2: Maximum % of profit
  const maxPercent = rule.max_commission_percent_of_profit || 30;
  const maxByProfit = inputs.profit * (maxPercent / 100);
  if (amount > maxByProfit) {
    amount = maxByProfit;
  }

  // Round to 2 decimals
  return Math.round(amount * 100) / 100;
}

// ===========================
// FORMULA TEXT GENERATOR
// ===========================
function generateFormulaText(inputs, rule, rawCommission, finalCommission) {
  let formula = '';

  switch (rule.commission_model) {
    case 'percentage_profit':
      formula = `($${inputs.invoice_total.toFixed(2)} - $${inputs.total_costs.toFixed(2)}) × ${(rule.rate * 100).toFixed(1)}% = $${rawCommission.toFixed(2)}`;
      break;

    case 'flat_amount':
      formula = `Flat amount = $${rawCommission.toFixed(2)}`;
      break;

    case 'tiered':
      const tier = inputs.tier_applied;
      if (tier) {
        formula = `Profit $${inputs.profit.toFixed(2)} → Tier ${tier.rate * 100}% = $${rawCommission.toFixed(2)}`;
      } else {
        formula = `No applicable tier`;
      }
      break;

    case 'hybrid':
      const base = rule.base_amount || 0;
      const bonus = inputs.profit * (rule.bonus_rate || 0);
      formula = `Base $${base.toFixed(2)} + ($${inputs.profit.toFixed(2)} × ${(rule.bonus_rate * 100).toFixed(1)}%) = $${rawCommission.toFixed(2)}`;
      break;

    default:
      formula = `Unknown model`;
  }

  if (rawCommission !== finalCommission) {
    formula += ` → Capped to $${finalCommission.toFixed(2)}`;
  }

  return formula;
}

// ===========================
// HELPER FUNCTIONS
// ===========================
function isRuleDateValid(dateStr, rule) {
  if (!dateStr) return false;
  
  const date = new Date(dateStr);
  const effectiveDate = new Date(rule.effective_date);
  
  if (date < effectiveDate) return false;
  
  if (rule.end_date) {
    const endDate = new Date(rule.end_date);
    if (date > endDate) return false;
  }
  
  return true;
}

function userMatchesRule(user, rule) {
  // Specific users override
  if (rule.applicable_user_ids && rule.applicable_user_ids.length > 0) {
    return rule.applicable_user_ids.includes(user.id);
  }

  // Check roles
  if (rule.applicable_roles && rule.applicable_roles.length > 0) {
    // Get user's role from User.role or EmployeeDirectory.position
    const userRole = user.role; // Can also check EmployeeDirectory if needed
    return rule.applicable_roles.includes(userRole);
  }

  return false;
}