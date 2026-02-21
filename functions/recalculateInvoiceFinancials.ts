import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// ============================================================
// PHASE 0 HARD FREEZE — FINANCIAL RESET IN PROGRESS
// Disabled: 2026-02-21
// ============================================================
Deno.serve(async (req) => {
  return Response.json({ error: 'INVOICE FINANCIAL RECALCULATION DISABLED — FINANCIAL RESET IN PROGRESS' }, { status: 503 });
});

/**
 * ============================================================================
 * BACKEND REAL-TIME INVOICE FINANCIAL RECALCULATION
 * ============================================================================
 * 
 * SSOT: Backend is source of truth
 * - Recalculates on: items change, cost changes, tax changes, discount changes
 * - No locks, no freezing, profit & commission ALWAYS recalculate
 * - Commission visible only if commission_visible=true AND user is admin/ceo
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id } = await req.json();

    // STEP 1: Fetch invoice
    const invoice = await base44.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log(`[Recalc] Invoice ${invoice.invoice_number}: recalculating profit & commission`);

    // STEP 2: Calculate profit (SSOT: total - total_cost)
    const total = invoice.total || 0;
    const total_cost = invoice.total_cost || 0;
    const profit_real = Number((total - total_cost).toFixed(2));

    // STEP 3: Calculate commission (SSOT: profit × percentage)
    const commission_percentage = invoice.commission_percentage || 10;
    const commission_amount = Number((profit_real * commission_percentage / 100).toFixed(2));

    // STEP 4: Check if values changed
    const profit_changed = invoice.profit_real !== profit_real;
    const commission_changed = invoice.commission_amount !== commission_amount;

    if (!profit_changed && !commission_changed) {
      console.log('[Recalc] No changes detected');
      return Response.json({
        status: 'no_change',
        message: 'Profit and commission already correct',
        values: { profit_real, commission_amount }
      });
    }

    console.log('[Recalc] Changes detected:', { profit_changed, commission_changed });
    console.log('[Recalc] New values:', { profit_real, commission_amount });

    // STEP 5: Update invoice with recalculated values
    const updated = await base44.entities.Invoice.update(invoice_id, {
      profit_real,
      commission_amount,
      financial_last_recalculated_at: new Date().toISOString()
    });

    console.log('[Recalc] Invoice updated successfully');

    return Response.json({
      status: 'success',
      message: 'Financial data recalculated',
      changes: { profit_changed, commission_changed },
      new_values: {
        profit_real,
        commission_amount,
        commission_percentage
      },
      previous_values: {
        profit_real: invoice.profit_real,
        commission_amount: invoice.commission_amount
      }
    });
  } catch (error) {
    console.error('[Recalc] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});