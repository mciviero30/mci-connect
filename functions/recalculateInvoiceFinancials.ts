import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { 
  recalculateInvoiceFinancials, 
  lockInvoiceOnSent, 
  validateFinancialLocks 
} from '../components/domain/financials/invoiceProfitCalculations.js';

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