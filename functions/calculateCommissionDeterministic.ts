import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createDeterminismEngine } from './FinancialDeterminismFactory.js';

// ============================================================
// PHASE 0 HARD FREEZE — FINANCIAL RESET IN PROGRESS
// Disabled: 2026-02-21
// ============================================================
Deno.serve(async (req) => {
  return Response.json({ error: 'COMMISSION SYSTEM DISABLED — FINANCIAL RESET IN PROGRESS' }, { status: 503 });
});

/**
 * TASK #1: COMMISSION CALCULATION ENGINE (Unified Pattern)
 * 
 * Uses FinancialDeterminismFactory for:
 * - Deterministic hashing (canonical item sorting)
 * - Atomic version increment (DB constraint-based)
 * - Concurrency-safe retries
 * - Permission scoping
 * - Idempotency deduplication
 */

const engine = createDeterminismEngine('Commission');

// Calculate commission from profit amount
const calculateCommission = (profitAmount, commissionRule) => {
  if (!commissionRule) {
    return {
      profit_amount: profitAmount,
      commission_type: 'fixed',
      commission_amount: 0,
      commission_percentage: 0
    };
  }

  let commissionAmount = 0;
  let commissionPercentage = 0;

  if (commissionRule.type === 'percentage') {
    commissionPercentage = commissionRule.value || 0;
    commissionAmount = profitAmount * (commissionPercentage / 100);
  } else if (commissionRule.type === 'fixed') {
    commissionAmount = commissionRule.value || 0;
    commissionPercentage = profitAmount > 0 ? (commissionAmount / profitAmount) * 100 : 0;
  } else if (commissionRule.type === 'tiered') {
    // Tiered: find appropriate bracket
    const tiers = commissionRule.tiers || [];
    for (let i = tiers.length - 1; i >= 0; i--) {
      if (profitAmount >= tiers[i].min_profit) {
        commissionPercentage = tiers[i].percentage;
        break;
      }
    }
    commissionAmount = profitAmount * (commissionPercentage / 100);
  }

  return {
    profit_amount: profitAmount,
    commission_type: commissionRule.type,
    commission_amount: Math.round(commissionAmount * 100) / 100,
    commission_percentage: commissionPercentage
  };
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        code: '401_NO_AUTH'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { 
      commission_record_id, 
      profit_amount,
      commission_rule,
      request_id,
      employee_id
    } = body;

    // PERMISSION CHECK
    if (!commission_record_id && user.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        code: '403_NO_RECORD_ID'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If commission_record_id provided, verify user has access
    if (commission_record_id) {
      const record = await base44.entities.CommissionRecord.filter({ id: commission_record_id });
      if (record.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Commission record not found',
          code: '404_RECORD_NOT_FOUND'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const recordData = record[0];
      // Check ownership or admin
      if (recordData.created_by_user_id !== user.id && user.role !== 'admin') {
        return new Response(JSON.stringify({ 
          error: 'Forbidden',
          code: '403_NOT_OWNER'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // IDEMPOTENCY CHECK - Return cached result if exists
    const cachedResult = await engine.checkIdempotency(base44, request_id);
    if (cachedResult) {
      return new Response(JSON.stringify({
        status: 'cached',
        result: cachedResult
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ============================================
    // DETERMINISTIC CALCULATION (All server-side)
    // ============================================
    const ruleVersions = {
      margin_version: 'v1.0',
      commission_version: commissionRule?.version || 'v1.0',
      tax_version: 'v1.0',
      pricing_version: 'v1.0'
    };

    // Hash inputs (deterministic, canonical sorted, no timestamps)
    const inputHash = engine.calculateHash({ 
      profit_amount,
      commission_rule_type: commissionRule?.type || 'fixed',
      commission_rule_value: commissionRule?.value || 0,
      employee_id,
      customer_id: null,
      tax_rate: 0 // Commission doesn't use tax
    }, ruleVersions);
    
    // Calculate commission (server authority)
    const commissionData = calculateCommission(profit_amount, commissionRule);
    const outputHash = engine.calculateOutputHash(commissionData);

    // Snapshot for audit trail
    const snapshot = {
      profit_amount: commissionData.profit_amount,
      commission_type: commissionData.commission_type,
      commission_percentage: commissionData.commission_percentage,
      commission_amount: commissionData.commission_amount,
      breakdown: `${commissionData.commission_type === 'percentage' ? commissionData.commission_percentage + '%' : '$' + commissionData.commission_amount} of $${profit_amount} profit = $${commissionData.commission_amount}`,
      rule_versions: ruleVersions
    };

    // ============================================
    // CONCURRENCY-SAFE VERSION CREATION
    // (Uses DB constraints + retry logic, not transactions)
    // ============================================
    
    const entityId = commission_record_id || 'temp';
    
    // Get next version number (with retry for race conditions)
    const { nextVersion } = await engine.getNextVersionNumber(base44, entityId);

    // Create version record (will retry on UNIQUE constraint violation)
    const calcVersion = await engine.createVersionWithRetry(base44, entityId, {
      entity_type: 'Commission',
      entity_id: entityId,
      calculation_version: nextVersion,
      calculation_input_hash: inputHash,
      calculation_output_hash: outputHash,
      backend_totals_snapshot: snapshot,
      recalculated_at: new Date().toISOString(),
      calculated_by_user_id: user.id,
      reason_for_recalculation: 'manual_edit',
      is_current: true
    });

    const result = {
      calculation_version_id: calcVersion.id,
      version: nextVersion,
      input_hash: inputHash,
      output_hash: outputHash,
      backend_totals_snapshot: snapshot,
      commission_data: commissionData,
      recalculated_at: new Date().toISOString()
    };

    // SAVE IDEMPOTENCY RECORD for future deduplication
    await engine.saveIdempotency(base44, request_id, inputHash, entityId, result, true); // permanent for commissions

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Commission Financial Engine Error:', error);

    // SAFE FAILURE: No silent fallback, explicit error
    return new Response(JSON.stringify({
      error: 'Commission calculation failed',
      code: '500_CALC_FAILURE',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});