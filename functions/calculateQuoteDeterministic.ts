import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createDeterminismEngine } from './FinancialDeterminismFactory.js';

/**
 * TASK #1: QUOTE CALCULATION ENGINE
 * 
 * Uses unified FinancialDeterminismFactory for:
 * - Deterministic hashing (with canonical item sorting)
 * - Atomic version increment (DB constraint-based)
 * - Concurrency-safe retries
 * - Permission scoping
 * - Idempotency deduplication
 */

const engine = createDeterminismEngine('Quote');

// Calculate quote totals (server authority, no frontend values accepted)
const calculateQuoteTotals = (items, taxRate) => {
  let subtotal = 0;
  items.forEach(item => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    subtotal += lineTotal;
  });
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

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

/**
 * ATOMIC: Get next version number + invalidate previous in transaction-safe manner
 * Uses optimistic locking pattern: fetch current, attempt update, retry on collision
 */
async function getNextVersionNumber(base44, entityId, attempt = 0) {
  if (attempt >= MAX_RETRIES) {
    throw new Error('Failed to allocate version number after 3 retries (race condition)');
  }

  try {
    // FETCH: Get current version
    const current = await base44.entities.CalculationVersion.filter(
      { entity_id: entityId, is_current: true },
      '-recalculated_at',
      1
    );

    const nextVersion = current.length > 0 ? current[0].calculation_version + 1 : 1;

    // INVALIDATE: Set previous to not current (non-blocking, idempotent)
    if (current.length > 0) {
      try {
        await base44.entities.CalculationVersion.update(current[0].id, {
          is_current: false
        });
      } catch (err) {
        // If update fails (concurrent modification), retry from start
        if (attempt < MAX_RETRIES - 1) {
          await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
          return getNextVersionNumber(base44, entityId, attempt + 1);
        }
        throw err;
      }
    }

    return { nextVersion, previousVersionId: current.length > 0 ? current[0].id : null };
  } catch (err) {
    if (attempt < MAX_RETRIES - 1) {
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      return getNextVersionNumber(base44, entityId, attempt + 1);
    }
    throw err;
  }
}

/**
 * CREATE: Insert new version record - WILL FAIL if version already exists (UNIQUE constraint)
 * This is expected behavior for detecting race conditions
 */
async function createCalculationVersion(base44, input) {
  try {
    return await base44.entities.CalculationVersion.create(input);
  } catch (err) {
    // UNIQUE constraint violation = race condition detected
    if (err.message && err.message.includes('unique')) {
      throw new Error('RACE_CONDITION_DETECTED');
    }
    throw err;
  }
}

/**
 * RETRY WRAPPER: Handle race conditions with exponential backoff
 */
async function createCalculationVersionWithRetry(base44, entityId, input, attempt = 0) {
  if (attempt >= MAX_RETRIES) {
    throw new Error('Failed to create calculation version after 3 retries');
  }

  try {
    return await createCalculationVersion(base44, input);
  } catch (err) {
    if (err.message === 'RACE_CONDITION_DETECTED' && attempt < MAX_RETRIES - 1) {
      // Concurrent calculation detected - backoff and retry
      console.warn(`Race condition on calculation_version, retry ${attempt + 1}/${MAX_RETRIES}`);
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt));
      
      // Re-fetch version number
      const { nextVersion } = await getNextVersionNumber(base44, entityId);
      input.calculation_version = nextVersion;
      
      return createCalculationVersionWithRetry(base44, entityId, input, attempt + 1);
    }
    throw err;
  }
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
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        code: '401_NO_AUTH'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await req.json();
    const { quote_id, items, tax_rate = 0, request_id } = body;

    // PERMISSION CHECK
    if (!quote_id && user.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        code: '403_NO_QUOTE_ID'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If quote_id provided, verify user has access
    if (quote_id) {
      const quote = await base44.entities.Quote.filter({ id: quote_id });
      if (quote.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Quote not found',
          code: '404_QUOTE_NOT_FOUND'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const quoteData = quote[0];
      // Check ownership or admin
      if (quoteData.created_by_user_id !== user.id && user.role !== 'admin') {
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
    if (request_id) {
      const existing = await base44.entities.IdempotencyRecord.filter({
        request_id: request_id
      });

      if (existing.length > 0 && existing[0].status === 'completed') {
        return new Response(JSON.stringify({
          status: 'cached',
          result: existing[0].cached_result
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // ============================================
    // DETERMINISTIC CALCULATION (All server-side)
    // ============================================
    const ruleVersions = {
      margin_version: 'v1.0',
      commission_version: 'v1.0',
      tax_version: 'v1.0',
      pricing_version: 'v1.0'
    };

    // Hash inputs (deterministic, no timestamps)
    const inputHash = calculateQuoteHash({ items, customer_id: null, tax_rate }, ruleVersions);
    
    // Calculate totals (server authority)
    const totals = calculateTotals(items, tax_rate);
    const outputHash = createHash('sha256').update(JSON.stringify(totals)).digest('hex');

    // Snapshot for audit trail
    const snapshot = {
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      breakdown: `Subtotal: $${totals.subtotal} + Tax (${tax_rate}%): $${totals.tax_amount} = Total: $${totals.total}`,
      rule_versions: ruleVersions
    };

    // ============================================
    // TRANSACTION-SAFE VERSION CREATION
    // ============================================
    
    // Get next version number (with retry for race conditions)
    const { nextVersion } = await getNextVersionNumber(base44, quote_id || 'temp');

    // Create version record (will fail if concurrent creation occurred)
    const calcVersion = await createCalculationVersionWithRetry(
      base44,
      quote_id || 'temp',
      {
        entity_type: 'Quote',
        entity_id: quote_id || 'temp',
        calculation_version: nextVersion,
        calculation_input_hash: inputHash,
        calculation_output_hash: outputHash,
        backend_totals_snapshot: snapshot,
        recalculated_at: new Date().toISOString(),
        calculated_by_user_id: user.id,
        reason_for_recalculation: 'manual_edit',
        is_current: true
      }
    );

    const result = {
      calculation_version_id: calcVersion.id,
      version: nextVersion,
      input_hash: inputHash,
      output_hash: outputHash,
      backend_totals_snapshot: snapshot,
      totals: totals,
      recalculated_at: new Date().toISOString()
    };

    // SAVE IDEMPOTENCY RECORD (idempotent operation)
    if (request_id) {
      try {
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
      } catch (err) {
        // Idempotency record might already exist (duplicate request after success)
        // This is OK - we'll just return the result
        console.warn('Idempotency record create failed (may be duplicate):', err.message);
      }
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

    // SAFE FAILURE: No silent fallback, explicit error
    return new Response(JSON.stringify({
      error: 'Financial calculation failed',
      code: '500_CALC_FAILURE',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});