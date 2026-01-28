import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * COMMISSION RECALCULATION ON PAYMENT
 * 
 * PHASE 2 FIX: Calculate commission at PAYMENT TIME, not invoice creation
 * 
 * Triggered when Invoice status changes to 'paid' or 'partial'
 * Recalculates based on:
 * - Actual payment amount
 * - Job costs at payment date (not invoice date)
 * 
 * Handles:
 * - Partial payments (proportional commission)
 * - Additional expenses added after invoice creation
 * - Commission adjustments with audit trail
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    // Only process Invoice updates where payment status changed
    if (event.type !== 'update' || event.entity_name !== 'Invoice') {
      return Response.json({ success: true, message: 'Not an invoice update' });
    }

    const invoice = data;
    const oldStatus = old_data?.status;
    const newStatus = invoice.status;

    // Trigger on payment (draft/sent → paid/partial)
    const isPaymentEvent = (oldStatus !== 'paid' && oldStatus !== 'partial') && 
                          (newStatus === 'paid' || newStatus === 'partial');

    if (!isPaymentEvent) {
      return Response.json({ success: true, message: 'Not a payment event' });
    }

    console.log('[COMMISSION RECALC] Payment detected', {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      old_status: oldStatus,
      new_status: newStatus,
      amount_paid: invoice.amount_paid,
      total: invoice.total
    });

    // Skip if no job_id
    if (!invoice.job_id) {
      console.log('[COMMISSION RECALC] No job_id, skipping');
      return Response.json({ success: true, message: 'No job associated' });
    }

    // Find active commission rules that apply to this invoice
    const allRules = await base44.asServiceRole.entities.CommissionRule.filter({
      is_active: true
    });

    if (allRules.length === 0) {
      console.log('[COMMISSION RECALC] No active commission rules');
      return Response.json({ success: true, message: 'No active rules' });
    }

    // Aggregate job costs AS OF PAYMENT DATE (not invoice date)
    const paymentDate = invoice.payment_date || new Date().toISOString().split('T')[0];
    const costs = await aggregateJobCosts(base44, invoice.job_id, paymentDate);

    // Calculate ACTUAL profit based on payment received
    const amountPaid = invoice.amount_paid || invoice.total;
    const paymentRatio = amountPaid / invoice.total;
    const proportionalCosts = costs.total_cost * paymentRatio;
    const actualProfit = amountPaid - proportionalCosts;

    console.log('[COMMISSION RECALC] Financial snapshot', {
      invoice_total: invoice.total,
      amount_paid: amountPaid,
      payment_ratio: paymentRatio,
      total_costs: costs.total_cost,
      proportional_costs: proportionalCosts,
      actual_profit: actualProfit
    });

    // For each applicable rule, calculate commission
    for (const rule of allRules) {
      // Check if rule applies (by role, user, date range)
      const applicableUsers = await findApplicableUsers(base44, rule);
      
      for (const targetUser of applicableUsers) {
        // Check if commission already exists
        const existing = await base44.asServiceRole.entities.CommissionRecord.filter({
          trigger_entity_id: invoice.id,
          user_id: targetUser.id
        });

        if (existing.length > 0) {
          // Update existing commission with new calculation
          const record = existing[0];
          
          const newCalculation = await calculateCommission(base44, {
            invoice,
            user: targetUser,
            rule,
            actual_profit: actualProfit,
            payment_date: paymentDate,
            costs
          });

          await base44.asServiceRole.entities.CommissionRecord.update(record.id, {
            commission_amount: newCalculation.commission_amount,
            calculation_inputs: newCalculation.calculation_inputs,
            calculation_formula: newCalculation.formula,
            recalculated_at: new Date().toISOString(),
            recalculation_reason: `Payment received: $${amountPaid} (${(paymentRatio * 100).toFixed(1)}% of invoice)`,
            status: 'pending' // Reset to pending for admin review
          });

          console.log('[COMMISSION RECALC] ✅ Updated commission', {
            record_id: record.id,
            user_email: targetUser.email,
            old_amount: record.commission_amount,
            new_amount: newCalculation.commission_amount
          });
        } else {
          // Create new commission record
          const newCalculation = await calculateCommission(base44, {
            invoice,
            user: targetUser,
            rule,
            actual_profit: actualProfit,
            payment_date: paymentDate,
            costs
          });

          await base44.asServiceRole.entities.CommissionRecord.create({
            ...newCalculation.payload,
            calculated_at_payment: true,
            payment_ratio: paymentRatio
          });

          console.log('[COMMISSION RECALC] ✅ Created commission', {
            user_email: targetUser.email,
            amount: newCalculation.commission_amount
          });
        }
      }
    }

    return Response.json({
      success: true,
      invoice_id: invoice.id,
      actual_profit: actualProfit,
      commissions_processed: allRules.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[COMMISSION RECALC] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Helper: Aggregate job costs up to payment date
async function aggregateJobCosts(base44, jobId, paymentDate) {
  const [timeEntries, expenses] = await Promise.all([
    base44.asServiceRole.entities.TimeEntry.filter({
      job_id: jobId,
      date: { $lte: paymentDate },
      status: 'approved'
    }),
    base44.asServiceRole.entities.Expense.filter({
      job_id: jobId,
      date: { $lte: paymentDate },
      status: 'approved'
    })
  ]);

  let laborCost = 0;
  for (const entry of timeEntries) {
    // Get employee rate from EmployeeDirectory (SSOT)
    let employee = null;
    if (entry.user_id) {
      const emps = await base44.asServiceRole.entities.EmployeeDirectory.filter({ user_id: entry.user_id });
      employee = emps[0];
    }
    
    if (!employee && entry.employee_email) {
      const emps = await base44.asServiceRole.entities.EmployeeDirectory.filter({ employee_email: entry.employee_email });
      employee = emps[0];
    }

    // Get rate from User (for now, until rates move to EmployeeDirectory)
    let rate = 25; // default
    if (employee?.user_id) {
      const users = await base44.asServiceRole.entities.User.filter({ id: employee.user_id });
      if (users[0]) rate = users[0].hourly_rate || 25;
    }

    laborCost += (entry.hours_worked || 0) * rate;
  }

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

// Helper: Find users eligible for this commission rule
async function findApplicableUsers(base44, rule) {
  if (rule.applicable_user_ids && rule.applicable_user_ids.length > 0) {
    const users = await Promise.all(
      rule.applicable_user_ids.map(id => 
        base44.asServiceRole.entities.User.filter({ id }).catch(() => [])
      )
    );
    return users.flat();
  }

  if (rule.applicable_roles && rule.applicable_roles.length > 0) {
    const allUsers = await base44.asServiceRole.entities.User.list();
    return allUsers.filter(u => rule.applicable_roles.includes(u.role));
  }

  return [];
}

// Helper: Calculate commission with new inputs
async function calculateCommission(base44, { invoice, user, rule, actual_profit, payment_date, costs }) {
  // Use existing calculation logic
  const calculation_inputs = {
    invoice_id: invoice.id,
    invoice_number: invoice.invoice_number,
    invoice_total: invoice.total,
    amount_paid: invoice.amount_paid,
    invoice_date: invoice.invoice_date,
    payment_date: payment_date,
    job_id: invoice.job_id,
    job_name: invoice.job_name,
    labor_cost: costs.labor_cost,
    material_cost: costs.material_cost,
    other_expenses: costs.other_expenses,
    total_costs: costs.total_cost,
    profit: actual_profit,
    profit_margin_percent: invoice.amount_paid > 0 ? (actual_profit / invoice.amount_paid) * 100 : 0,
    model_used: rule.commission_model,
    rate_applied: rule.rate || null
  };

  // Apply formula
  let commission = 0;
  if (rule.commission_model === 'percentage_profit') {
    commission = Math.max(0, actual_profit * (rule.rate || 0));
  } else if (rule.commission_model === 'flat_amount') {
    commission = rule.flat_amount || 0;
  }

  // Apply caps
  const minCommission = rule.min_commission || 10;
  if (commission < minCommission) commission = 0;

  const maxPercent = rule.max_commission_percent_of_profit || 30;
  const maxByProfit = actual_profit * (maxPercent / 100);
  if (commission > maxByProfit) commission = maxByProfit;

  commission = Math.round(commission * 100) / 100;

  const formula = `($${invoice.amount_paid.toFixed(2)} - $${costs.total_cost.toFixed(2)}) × ${(rule.rate * 100).toFixed(1)}% = $${commission.toFixed(2)}`;

  return {
    commission_amount: commission,
    calculation_inputs,
    formula,
    payload: {
      user_id: user.id,
      employee_email: user.email,
      employee_name: user.full_name,
      rule_id: rule.id,
      rule_snapshot: rule,
      trigger_entity_type: 'Invoice',
      trigger_entity_id: invoice.id,
      trigger_entity_number: invoice.invoice_number,
      calculation_date: new Date().toISOString(),
      commission_amount: commission,
      calculation_inputs,
      calculation_formula: formula,
      status: 'pending',
      calculated_by_system: true,
      calculated_at_payment: true
    }
  };
}