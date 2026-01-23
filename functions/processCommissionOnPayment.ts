import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COMMISSION AUTOMATION ENGINE (Phase C1.3)
 * 
 * Triggered by: Invoice entity update (status → 'paid')
 * Creates: CommissionRecords for eligible users
 * Idempotent: Checks for duplicates before creation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Entity automation payload
    const { event, data, old_data } = await req.json();

    // ===========================
    // 1. VALIDATE TRIGGER
    // ===========================
    if (event.type !== 'update') {
      console.log('[processCommission] Skipped: Not an update event');
      return Response.json({ skipped: 'not_update_event' });
    }

    if (!old_data || !data) {
      console.log('[processCommission] Skipped: Missing old_data or data');
      return Response.json({ skipped: 'missing_data' });
    }

    // Check status transition: not-paid → paid
    const statusChanged = old_data.status !== 'paid' && data.status === 'paid';
    
    if (!statusChanged) {
      console.log('[processCommission] Skipped: Status did not transition to paid', {
        old_status: old_data.status,
        new_status: data.status
      });
      return Response.json({ skipped: 'no_status_change_to_paid' });
    }

    console.log('[processCommission] Invoice paid!', {
      invoice_id: data.id,
      invoice_number: data.invoice_number,
      total: data.total
    });

    // ===========================
    // 2. FETCH ACTIVE RULES
    // ===========================
    const activeRules = await base44.asServiceRole.entities.CommissionRule.filter({
      is_active: true,
      trigger_event: 'invoice_paid'
    });

    if (activeRules.length === 0) {
      console.log('[processCommission] No active commission rules found');
      return Response.json({ 
        success: true,
        processed: 0,
        reason: 'no_active_rules'
      });
    }

    console.log(`[processCommission] Found ${activeRules.length} active rules`);

    // ===========================
    // 3. IDENTIFY ELIGIBLE USERS
    // ===========================
    const eligibleUsers = await findEligibleUsers(base44, data, activeRules);

    if (eligibleUsers.length === 0) {
      console.log('[processCommission] No eligible users found');
      return Response.json({ 
        success: true,
        processed: 0,
        reason: 'no_eligible_users'
      });
    }

    console.log(`[processCommission] Found ${eligibleUsers.length} eligible user-rule pairs`);

    // ===========================
    // 4. PROCESS EACH USER-RULE PAIR
    // ===========================
    const results = {
      created: [],
      skipped: [],
      errors: []
    };

    for (const { user, rule } of eligibleUsers) {
      try {
        // Check duplicate (idempotency)
        const existing = await base44.asServiceRole.entities.CommissionRecord.filter({
          trigger_entity_id: data.id,
          user_id: user.id,
          rule_id: rule.id
        });

        if (existing.length > 0) {
          console.log(`[processCommission] Duplicate found for user ${user.email}`, {
            existing_record_id: existing[0].id
          });
          results.skipped.push({
            user_id: user.id,
            user_email: user.email,
            rule_id: rule.id,
            reason: 'duplicate'
          });
          continue;
        }

        // Calculate commission (call backend function)
        const calcResult = await calculateCommissionForUser(base44, data, user, rule);

        if (!calcResult.success || !calcResult.eligible) {
          console.log(`[processCommission] User ${user.email} not eligible`, {
            reason: calcResult.blocked_reason,
            checks: calcResult.eligibility_checks
          });
          results.skipped.push({
            user_id: user.id,
            user_email: user.email,
            rule_id: rule.id,
            reason: calcResult.blocked_reason || 'not_eligible',
            checks: calcResult.eligibility_checks
          });
          continue;
        }

        if (calcResult.commission_amount <= 0) {
          console.log(`[processCommission] User ${user.email} commission is $0`, {
            reason: 'zero_amount'
          });
          results.skipped.push({
            user_id: user.id,
            user_email: user.email,
            rule_id: rule.id,
            reason: 'zero_amount'
          });
          continue;
        }

        // Create CommissionRecord
        const payload = calcResult.payload;
        const record = await base44.asServiceRole.entities.CommissionRecord.create(payload);

        console.log(`[processCommission] ✅ Created commission for ${user.email}`, {
          record_id: record.id,
          amount: calcResult.commission_amount,
          formula: calcResult.formula
        });

        results.created.push({
          record_id: record.id,
          user_id: user.id,
          user_email: user.email,
          rule_id: rule.id,
          amount: calcResult.commission_amount,
          formula: calcResult.formula
        });

      } catch (error) {
        console.error(`[processCommission] Error processing user ${user.email}:`, error);
        results.errors.push({
          user_id: user.id,
          user_email: user.email,
          rule_id: rule.id,
          error: error.message
        });
      }
    }

    // ===========================
    // 5. RETURN SUMMARY
    // ===========================
    console.log('[processCommission] Processing complete', {
      created: results.created.length,
      skipped: results.skipped.length,
      errors: results.errors.length
    });

    return Response.json({
      success: true,
      invoice_id: data.id,
      invoice_number: data.invoice_number,
      results: results
    });

  } catch (error) {
    console.error('[processCommission] Fatal error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});

// ===========================
// FIND ELIGIBLE USERS
// ===========================
async function findEligibleUsers(base44, invoice, rules) {
  const eligiblePairs = [];

  // Get all users
  const allUsers = await base44.asServiceRole.entities.User.list();

  for (const rule of rules) {
    // Check date validity
    if (!isRuleDateValid(invoice.payment_date || invoice.invoice_date, rule)) {
      console.log(`[findEligibleUsers] Rule ${rule.rule_name} not valid for invoice date`);
      continue;
    }

    // Find users matching this rule
    let matchingUsers = [];

    if (rule.applicable_user_ids && rule.applicable_user_ids.length > 0) {
      // Specific users
      matchingUsers = allUsers.filter(u => rule.applicable_user_ids.includes(u.id));
    } else if (rule.applicable_roles && rule.applicable_roles.length > 0) {
      // By role
      matchingUsers = allUsers.filter(u => rule.applicable_roles.includes(u.role));
    }

    // Filter active users only
    matchingUsers = matchingUsers.filter(u => 
      u.employment_status === 'active' || !u.employment_status
    );

    // Add to eligible pairs
    for (const user of matchingUsers) {
      eligiblePairs.push({ user, rule });
    }
  }

  return eligiblePairs;
}

// ===========================
// CALCULATE COMMISSION (INLINE)
// ===========================
async function calculateCommissionForUser(base44, invoice, user, rule) {
  try {
    // Validate eligibility
    const eligibility = await validateEligibility(base44, invoice, user, rule);

    if (!eligibility.eligible) {
      return {
        success: false,
        eligible: false,
        commission_amount: 0,
        eligibility_checks: eligibility.checks,
        blocked_reason: Object.entries(eligibility.checks)
          .find(([key, value]) => value === false)?.[0] || 'unknown'
      };
    }

    // Aggregate costs
    const costs = await aggregateJobCosts(base44, invoice.job_id, invoice.invoice_date);
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
    const cappedCommission = applyCommissionCaps(rawCommission, calculation_inputs, rule);
    const formula = generateFormulaText(calculation_inputs, rule, rawCommission, cappedCommission);

    // Build payload
    const payload = {
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      rule_id: rule.id,
      rule_snapshot: rule,
      trigger_entity_type: 'Invoice',
      trigger_entity_id: invoice.id,
      trigger_entity_number: invoice.invoice_number,
      calculation_date: new Date().toISOString(),
      commission_amount: cappedCommission,
      calculation_inputs: calculation_inputs,
      calculation_formula: formula,
      status: 'pending',
      payout_period_id: null,
      calculated_by_system: true
    };

    return {
      success: true,
      eligible: true,
      commission_amount: cappedCommission,
      raw_commission: rawCommission,
      capped: rawCommission !== cappedCommission,
      payload: payload,
      formula: formula
    };

  } catch (error) {
    console.error('[calculateCommissionForUser] Error:', error);
    throw error;
  }
}

// Copy calculation logic from calculateCommission.js
async function validateEligibility(base44, invoice, user, rule) {
  const checks = {
    invoice_paid: invoice.status === 'paid',
    user_active: user.employment_status === 'active' || !user.employment_status,
    rule_active: rule.is_active === true,
    rule_date_valid: isRuleDateValid(invoice.payment_date || invoice.invoice_date, rule),
    invoice_has_job: !!invoice.job_id
  };

  const costs = await aggregateJobCosts(base44, invoice.job_id, invoice.invoice_date);
  const profit = invoice.total - costs.total_cost;

  checks.positive_profit = profit > 0;
  checks.min_profit_threshold = profit >= (rule.min_profit_threshold || 100);

  const eligible = Object.values(checks).every(v => v === true);

  return { eligible, checks, profit };
}

async function aggregateJobCosts(base44, jobId, invoiceDate) {
  if (!jobId) {
    return { labor_cost: 0, material_cost: 0, other_expenses: 0, total_cost: 0 };
  }

  const timeEntries = await base44.asServiceRole.entities.TimeEntry.filter({
    job_id: jobId,
    date: { $lte: invoiceDate }
  });

  const expenses = await base44.asServiceRole.entities.Expense.filter({
    job_id: jobId,
    date: { $lte: invoiceDate }
  });

  const laborCost = await calculateLaborCost(base44, timeEntries);
  const materialCost = expenses
    .filter(e => e.account_category === 'expense_materials')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);
  const otherExpenses = expenses
    .filter(e => e.account_category !== 'expense_materials')
    .reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return {
    labor_cost: laborCost,
    material_cost: materialCost,
    other_expenses: otherExpenses,
    total_cost: laborCost + materialCost + otherExpenses
  };
}

async function calculateLaborCost(base44, timeEntries) {
  let totalLaborCost = 0;
  for (const entry of timeEntries) {
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

function applyCommissionFormula(inputs, rule) {
  const formulas = {
    percentage_profit: (inputs, rule) => {
      const profit = inputs.profit;
      if (profit <= 0) return 0;
      return profit * (rule.rate || 0);
    },
    flat_amount: (inputs, rule) => rule.flat_amount || 0,
    tiered: (inputs, rule) => {
      const profit = inputs.profit;
      if (profit <= 0) return 0;
      if (!rule.tiers || rule.tiers.length === 0) return 0;
      const tier = rule.tiers.find(t => {
        const meetsMin = profit >= (t.min_profit || 0);
        const meetsMax = !t.max_profit || profit < t.max_profit;
        return meetsMin && meetsMax;
      });
      if (!tier) return 0;
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
      if (profit <= 0) return baseAmount;
      const bonusAmount = profit * (rule.bonus_rate || 0);
      return baseAmount + bonusAmount;
    }
  };
  const handler = formulas[rule.commission_model];
  if (!handler) throw new Error(`Unknown commission model: ${rule.commission_model}`);
  return handler(inputs, rule);
}

function applyCommissionCaps(amount, inputs, rule) {
  const minCommission = rule.min_commission || 10;
  if (amount < minCommission) return 0;
  const maxPercent = rule.max_commission_percent_of_profit || 30;
  const maxByProfit = inputs.profit * (maxPercent / 100);
  if (amount > maxByProfit) amount = maxByProfit;
  return Math.round(amount * 100) / 100;
}

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