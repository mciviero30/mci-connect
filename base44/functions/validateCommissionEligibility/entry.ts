import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * COMMISSION ELIGIBILITY VALIDATOR (Phase C1.2)
 * 
 * Pre-flight checks before commission calculation
 * Used for UI feedback and validation
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, user_id, rule_id } = await req.json();

    if (!invoice_id || !user_id) {
      return Response.json({ 
        error: 'Missing required parameters: invoice_id, user_id' 
      }, { status: 400 });
    }

    // ===========================
    // FETCH ENTITIES
    // ===========================
    const [invoice, targetUser] = await Promise.all([
      base44.asServiceRole.entities.Invoice.get(invoice_id),
      base44.asServiceRole.entities.User.get(user_id)
    ]);

    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }
    if (!targetUser) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Find active rules for user
    let applicableRules = [];

    if (rule_id) {
      const rule = await base44.asServiceRole.entities.CommissionRule.get(rule_id);
      if (rule) applicableRules.push(rule);
    } else {
      // Find all active rules
      const allRules = await base44.asServiceRole.entities.CommissionRule.filter({
        is_active: true
      });

      applicableRules = allRules.filter(rule => {
        // Check if user matches rule
        if (rule.applicable_user_ids && rule.applicable_user_ids.length > 0) {
          return rule.applicable_user_ids.includes(user_id);
        }
        if (rule.applicable_roles && rule.applicable_roles.length > 0) {
          return rule.applicable_roles.includes(targetUser.role);
        }
        return false;
      });
    }

    if (applicableRules.length === 0) {
      return Response.json({
        eligible: false,
        reason: 'no_applicable_rules',
        checks: {
          has_commission_rule: false
        }
      });
    }

    // ===========================
    // RUN ELIGIBILITY CHECKS
    // ===========================
    const results = [];

    for (const rule of applicableRules) {
      const checks = {
        invoice_paid: invoice.status === 'paid',
        user_active: targetUser.employment_status === 'active' || !targetUser.employment_status,
        rule_active: rule.is_active === true,
        rule_date_valid: isRuleDateValid(invoice.payment_date || invoice.invoice_date, rule),
        invoice_has_job: !!invoice.job_id
      };

      // Check for duplicate
      const existing = await base44.asServiceRole.entities.CommissionRecord.filter({
        trigger_entity_id: invoice.id,
        user_id: user_id,
        rule_id: rule.id
      });
      checks.not_duplicate = existing.length === 0;

      // Calculate profit (lightweight - no full cost aggregation)
      const estimatedProfit = invoice.total * 0.3; // Rough estimate (30% margin)
      checks.positive_profit = estimatedProfit > 0;
      checks.min_profit_threshold = estimatedProfit >= (rule.min_profit_threshold || 100);

      const eligible = Object.values(checks).every(v => v === true);

      results.push({
        rule_id: rule.id,
        rule_name: rule.rule_name,
        eligible: eligible,
        checks: checks,
        estimated_commission: eligible ? estimatedProfit * (rule.rate || 0) : 0
      });
    }

    // Return best match (first eligible rule)
    const eligibleRule = results.find(r => r.eligible);

    return Response.json({
      eligible: !!eligibleRule,
      applicable_rules: results,
      recommended_rule: eligibleRule || null,
      invoice_status: invoice.status,
      invoice_total: invoice.total,
      user_status: targetUser.employment_status
    });

  } catch (error) {
    console.error('[validateCommissionEligibility] Error:', error);
    return Response.json({ 
      error: error.message,
      }, { status: 500 });
  }
});

// ===========================
// HELPERS
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