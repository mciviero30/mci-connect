import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { createDeterminismEngine } from './FinancialDeterminismFactory.js';

/**
 * TASK #1: INVOICE CALCULATION ENGINE (Unified Pattern)
 * 
 * Uses FinancialDeterminismFactory for:
 * - Deterministic hashing (canonical item sorting)
 * - Atomic version increment (DB constraint-based)
 * - Concurrency-safe retries
 * - Permission scoping
 * - Idempotency deduplication
 */

const engine = createDeterminismEngine('Invoice');

// Calculate invoice totals (server authority, no frontend values accepted)
const calculateInvoiceTotals = (items, taxRate, billableTimeEntries = [], billableExpenses = []) => {
  let subtotal = 0;
  
  // Line items
  items.forEach(item => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    subtotal += lineTotal;
  });
  
  // T&M: Time entries (if billing_type = 'tm')
  billableTimeEntries.forEach(entry => {
    const rate = entry.rate_snapshot || entry.hourly_rate || 0;
    const labor = entry.hours_worked * rate;
    subtotal += labor;
  });
  
  // T&M: Expenses (if billing_type = 'tm')
  billableExpenses.forEach(expense => {
    const markup = expense.markup || 0;
    const expenseWithMarkup = expense.amount * (1 + markup / 100);
    subtotal += expenseWithMarkup;
  });
  
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax_amount: Math.round(taxAmount * 100) / 100,
    total: Math.round(total * 100) / 100
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
      invoice_id, 
      items, 
      tax_rate = 0, 
      request_id,
      billing_type = 'fixed',
      billable_time_entries = [],
      billable_expenses = []
    } = body;

    // PERMISSION CHECK
    if (!invoice_id && user.role !== 'admin') {
      return new Response(JSON.stringify({ 
        error: 'Forbidden',
        code: '403_NO_INVOICE_ID'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If invoice_id provided, verify user has access
    if (invoice_id) {
      const invoice = await base44.entities.Invoice.filter({ id: invoice_id });
      if (invoice.length === 0) {
        return new Response(JSON.stringify({ 
          error: 'Invoice not found',
          code: '404_INVOICE_NOT_FOUND'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const invoiceData = invoice[0];
      // Check ownership or admin
      if (invoiceData.created_by_user_id !== user.id && user.role !== 'admin') {
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
      commission_version: 'v1.0',
      tax_version: 'v1.0',
      pricing_version: 'v1.0'
    };

    // Hash inputs (deterministic, canonical sorted items, no timestamps)
    const inputHash = engine.calculateHash({ 
      items, 
      customer_id: null, 
      tax_rate,
      billing_type,
      time_entries_count: billable_time_entries.length,
      expenses_count: billable_expenses.length
    }, ruleVersions);
    
    // Calculate totals (server authority, frontend values ignored)
    const totals = calculateInvoiceTotals(items, tax_rate, billable_time_entries, billable_expenses);
    const outputHash = engine.calculateOutputHash(totals);

    // Snapshot for audit trail
    const snapshot = {
      subtotal: totals.subtotal,
      tax_amount: totals.tax_amount,
      total: totals.total,
      breakdown: `Subtotal: $${totals.subtotal} + Tax (${tax_rate}%): $${totals.tax_amount} = Total: $${totals.total}`,
      rule_versions: ruleVersions,
      billing_type: billing_type,
      billed_time_entries_count: billable_time_entries.length,
      billed_expenses_count: billable_expenses.length
    };

    // ============================================
    // CONCURRENCY-SAFE VERSION CREATION
    // (Uses DB constraints + retry logic, not transactions)
    // ============================================
    
    const entityId = invoice_id || 'temp';
    
    // Get next version number (with retry for race conditions)
    const { nextVersion } = await engine.getNextVersionNumber(base44, entityId);

    // Create version record (will retry on UNIQUE constraint violation)
    const calcVersion = await engine.createVersionWithRetry(base44, entityId, {
      entity_type: 'Invoice',
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
      totals: totals,
      recalculated_at: new Date().toISOString()
    };

    // SAVE IDEMPOTENCY RECORD for future deduplication
    await engine.saveIdempotency(base44, request_id, inputHash, entityId, result, false);

    return new Response(JSON.stringify({
      success: true,
      result: result
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Invoice Financial Engine Error:', error);

    // SAFE FAILURE: No silent fallback, explicit error
    return new Response(JSON.stringify({
      error: 'Invoice financial calculation failed',
      code: '500_CALC_FAILURE',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});