import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createHash } from 'node:crypto';

/**
 * TASK #1: FINANCIAL DETERMINISM ENGINE
 * 
 * Calculates quote totals server-side with:
 * - Permission scoping
 * - Deterministic hashing (rule versions included)
 * - Calculation versioning
 * - Idempotency checking
 * - Audit logging
 * 
 * Response is authoritative. Frontend must accept.
 */

function calculateQuoteHash(inputs, ruleVersions) {
  const data = JSON.stringify({
    items: inputs.items,
    customer_id: inputs.customer_id,
    tax_rate: inputs.tax_rate,
    margin_rule_version: ruleVersions.margin_version || 'v1.0',
    commission_rule_version: ruleVersions.commission_version || 'v1.0',
    tax_config_version: ruleVersions.tax_version || 'v1.0',
    pricing_config_version: ruleVersions.pricing_version || 'v1.0'
  });

  return createHash('sha256').update(data).digest('hex');
}

function calculateLineTotals(items) {
  let subtotal = 0;
  items.forEach(item => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    subtotal += lineTotal;
  });
  return subtotal;
}

function calculateTotals(items, taxRate) {
  const subtotal = calculateLineTotals(items);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
}

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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { quote_id, items, tax_rate = 0, request_id } = body;

    // PERMISSION CHECK
    if (!quote_id && user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If quote_id provided, verify user has access
    if (quote_id) {
      const quote = await base44.entities.Quote.filter({ id: quote_id });
      if (quote.length === 0) {
        return new Response(JSON.stringify({ error: 'Quote not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const quoteData = quote[0];
      // Check ownership or supervisor
      if (quoteData.created_by_user_id !== user.id && user.role !== 'admin') {
        // Check if supervisor
        const isOwner = await base44.auth.me();
        if (quoteData.assigned_to_user_id !== isOwner.id) {
          return new Response(JSON.stringify({ error: 'Forbidden' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    }

    // IDEMPOTENCY CHECK
    if (request_id) {
      const existing = await base44.entities.IdempotencyRecord.filter({
        request_id: request_id
      });

      if (existing.length > 0 && existing[0].status === 'completed') {
        // Return cached result
        return new Response(JSON.stringify({
          status: 'cached',
          result: existing[0].cached_result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // DETERMINISTIC CALCULATION
    const ruleVersions = {
      margin_version: 'v1.0',
      commission_version: 'v1.0',
      tax_version: 'v1.0',
      pricing_version: 'v1.0'
    };

    const inputHash = calculateQuoteHash({ items, tax_rate }, ruleVersions);
    const totals = calculateTotals(items, tax_rate);
    const outputHash = createHash('sha256').update(JSON.stringify(totals)).digest('hex');

    // SNAPSHOT
    const snapshot = {
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      breakdown: `Subtotal: $${totals.subtotal} + Tax (${tax_rate}%): $${totals.tax_amount} = Total: $${totals.total}`,
      rule_versions: ruleVersions
    };

    // SAVE CALCULATION VERSION
    const calcVersion = await base44.entities.CalculationVersion.create({
      entity_type: 'Quote',
      entity_id: quote_id || 'temp',
      calculation_version: 1,
      calculation_input_hash: inputHash,
      calculation_output_hash: outputHash,
      backend_totals_snapshot: snapshot,
      recalculated_at: new Date().toISOString(),
      calculated_by_user_id: user.id,
      reason_for_recalculation: 'initial_creation',
      is_current: true
    });

    const result = {
      calculation_version_id: calcVersion.id,
      version: 1,
      input_hash: inputHash,
      output_hash: outputHash,
      backend_totals_snapshot: snapshot,
      totals: totals,
      recalculated_at: new Date().toISOString()
    };

    // SAVE IDEMPOTENCY RECORD
    if (request_id) {
      await base44.entities.IdempotencyRecord.create({
        request_id: request_id,
        mutation_id: inputHash,
        mutation_type: 'update_quote',
        user_id: user.id,
        entity_type: 'Quote',
        entity_id: quote_id || 'temp',
        cached_result: result,
        created_at: new Date().toISOString(),
        is_permanent: false,
        status: 'completed'
      });
    }

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Financial Engine Error:', error);

    // SAFE FAILURE: No silent fallback
    return new Response(JSON.stringify({
      error: 'Financial calculation failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});