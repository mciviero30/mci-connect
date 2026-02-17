import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Profit calculation - inline to avoid component imports in backend
function calculateInvoiceProfit(params) {
  const { subtotal = 0, tax_amount = 0, cost_amount = 0 } = params;
  const revenue = subtotal + tax_amount;
  const profit = revenue - cost_amount;
  const profit_margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  return {
    revenue: Number(revenue.toFixed(2)),
    cost_amount: Number(cost_amount.toFixed(2)),
    profit: Number(profit.toFixed(2)),
    profit_margin: Number(profit_margin.toFixed(2))
  };
}

function calculateInvoiceCommission(params) {
  const { profit = 0 } = params;
  const commission_pct = profit > 0 ? 10 : 0;
  const commission_amount = (profit * commission_pct) / 100;
  return {
    profit: Number(profit.toFixed(2)),
    commission_pct: Number(commission_pct.toFixed(2)),
    commission_amount: Number(commission_amount.toFixed(2))
  };
}

function recalculateInvoiceFinancials(params) {
  const { invoice, cost_amount, margin_locked = false, commission_locked = false } = params;
  
  if (margin_locked || commission_locked) {
    return {
      can_recalculate: false,
      locked_fields: { margin: margin_locked, commission: commission_locked },
      reason: 'Invoice is locked. Admin unlock required.',
      current_profit: invoice.profit || 0,
      current_commission: invoice.commission_amount || 0
    };
  }
  
  const profitCalc = calculateInvoiceProfit({
    subtotal: invoice.subtotal || 0,
    tax_amount: invoice.tax_amount || 0,
    cost_amount: cost_amount || invoice.cost_amount || 0
  });
  
  const commissionCalc = calculateInvoiceCommission({ profit: profitCalc.profit });
  
  const changes_detected = {
    profit_changed: invoice.profit !== profitCalc.profit,
    commission_changed: invoice.commission_amount !== commissionCalc.commission_amount,
    cost_changed: invoice.cost_amount !== cost_amount
  };
  
  const any_changes = Object.values(changes_detected).some(v => v === true);
  
  return {
    can_recalculate: true,
    any_changes,
    changes_detected,
    profit: profitCalc.profit,
    profit_margin: profitCalc.profit_margin,
    revenue: profitCalc.revenue,
    commission_amount: commissionCalc.commission_amount,
    commission_pct: commissionCalc.commission_pct,
    version_needed: any_changes,
    current_profit: invoice.profit || 0,
    current_commission: invoice.commission_amount || 0
  };
}

/**
 * ============================================================================
 * REAL-TIME INVOICE PROFIT RECALCULATION
 * ============================================================================
 * 
 * Triggered on:
 * - Cost changes
 * - Status change to "sent" (locks financials)
 * - Admin manual trigger
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoice_id, cost_amount, reason = 'manual_edit' } = await req.json();

    // STEP 1: Fetch invoice
    const invoice = await base44.entities.Invoice.get(invoice_id);
    if (!invoice) {
      return Response.json({ error: 'Invoice not found' }, { status: 404 });
    }

    console.log(`[Recalc] Invoice ${invoice.invoice_number}: cost_amount=${cost_amount}, reason=${reason}`);

    // STEP 2: Check lock status
    const lockValidation = validateFinancialLocks(invoice);
    if (!lockValidation.valid) {
      console.warn('[Recalc] Lock validation failed:', lockValidation.violations);
    }

    // STEP 3: Perform recalculation
    const recalcResult = recalculateInvoiceFinancials({
      invoice,
      cost_amount,
      margin_locked: invoice.margin_locked || false,
      commission_locked: invoice.commission_locked || false
    });

    if (!recalcResult.can_recalculate) {
      console.log('[Recalc] Cannot recalculate - invoice locked');
      return Response.json({
        status: 'locked',
        message: recalcResult.reason,
        current_values: {
          profit: recalcResult.current_profit,
          commission: recalcResult.current_commission
        }
      }, { status: 403 });
    }

    // STEP 4: If no changes, return early
    if (!recalcResult.any_changes) {
      console.log('[Recalc] No changes detected');
      return Response.json({
        status: 'no_changes',
        message: 'Recalculation showed no changes',
        values: {
          profit: recalcResult.profit,
          commission: recalcResult.commission_amount
        }
      });
    }

    console.log('[Recalc] Changes detected:', recalcResult.changes_detected);

    // STEP 5: Create CalculationVersion (audit trail)
    let calculationVersion = null;
    if (recalcResult.version_needed) {
      const existingVersions = await base44.asServiceRole.entities.CalculationVersion.filter(
        { entity_id: invoice_id, entity_type: 'Invoice' }
      );
      
      const nextVersion = (existingVersions.length || 0) + 1;

      calculationVersion = await base44.asServiceRole.entities.CalculationVersion.create({
        entity_type: 'Invoice',
        entity_id: invoice_id,
        calculation_version: nextVersion,
        calculation_input_hash: recalcResult.calculation_hash,
        backend_totals_snapshot: {
          subtotal: invoice.subtotal,
          tax_amount: invoice.tax_amount,
          total: invoice.total,
          cost_amount: cost_amount,
          profit_amount: recalcResult.profit,
          profit_margin: recalcResult.profit_margin,
          commission_amount: recalcResult.commission_amount,
          breakdown: recalcResult.breakdown.profit + '\n' + recalcResult.breakdown.commission,
          rule_versions: {
            margin_rule_version: '1.0',
            commission_rule_version: '1.0'
          }
        },
        recalculated_at: new Date().toISOString(),
        calculated_by_user_id: user.id,
        reason_for_recalculation: reason,
        is_current: true
      });

      // Mark previous version as not current
      if (existingVersions.length > 0) {
        const lastVersion = existingVersions.sort((a, b) => 
          b.calculation_version - a.calculation_version
        )[0];
        
        await base44.asServiceRole.entities.CalculationVersion.update(lastVersion.id, {
          is_current: false
        });
      }

      console.log('[Recalc] CalculationVersion created:', calculationVersion.id);
    }

    // STEP 6: Update invoice with new financial values
    const updatedInvoice = await base44.entities.Invoice.update(invoice_id, {
      cost_amount: cost_amount,
      profit: recalcResult.profit,
      profit_margin: recalcResult.profit_margin,
      commission_amount: recalcResult.commission_amount,
      latest_calculation_version: calculationVersion?.id,
      backend_totals_recalculated_at: new Date().toISOString()
    });

    console.log('[Recalc] Invoice updated:', {
      profit: updatedInvoice.profit,
      commission: updatedInvoice.commission_amount
    });

    return Response.json({
      status: 'success',
      changes_applied: recalcResult.changes_detected,
      new_values: {
        cost_amount,
        profit: recalcResult.profit,
        profit_margin: recalcResult.profit_margin,
        commission_amount: recalcResult.commission_amount
      },
      calculation_version: calculationVersion?.id,
      previous_values: {
        profit: recalcResult.current_profit,
        commission: recalcResult.current_commission
      }
    });
  } catch (error) {
    console.error('[Recalc] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});