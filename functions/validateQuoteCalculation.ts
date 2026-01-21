import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * QUOTE BACKEND VALIDATION - Autoridad Final
 * 
 * FASE 7 - QUOTES & INVOICES BACKEND AUTHORITY
 * 
 * Triggered automatically when Quote is created or updated (draft/pending)
 * Recalcula totales desde line items
 * Marca discrepancias sin bloquear generación
 * 
 * Principios:
 * - Backend = single source of truth
 * - NO bloquea quote
 * - Solo audita y marca flags
 */

/**
 * Calculate quote totals from line items (backend authority)
 */
function calculateQuoteTotals(items, taxRate = 0) {
  let subtotal = 0;

  // Sum all line items
  for (const item of items) {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unit_price) || 0;
    const itemTotal = quantity * unitPrice;
    subtotal += itemTotal;
  }

  // Calculate tax
  const taxAmount = subtotal * (taxRate / 100);

  // Calculate total
  const total = subtotal + taxAmount;

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    tax_amount: parseFloat(taxAmount.toFixed(2)),
    total: parseFloat(total.toFixed(2))
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process create or update events for draft/pending quotes
    if (event.type === 'update' && !['draft', 'sent'].includes(data.status)) {
      return Response.json({ 
        success: true, 
        message: 'Quote not draft/sent, skipping validation' 
      });
    }

    const quote = data;
    
    // Skip validation if quote has no items
    if (!quote.items || quote.items.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No items - cannot validate' 
      });
    }

    // BACKEND RE-CALCULATION (authority) - DO NOT trust frontend values
    const backendTotals = calculateQuoteTotals(quote.items, quote.tax_rate || 0);

    // Frontend values (as submitted)
    const frontendTotals = {
      subtotal: parseFloat(quote.subtotal) || 0,
      tax_amount: parseFloat(quote.tax_amount) || 0,
      total: parseFloat(quote.total) || 0
    };

    // DISCREPANCY DETECTION
    const TOLERANCE = 0.01; // 1 cent tolerance
    const subtotalMatch = Math.abs(backendTotals.subtotal - frontendTotals.subtotal) <= TOLERANCE;
    const taxMatch = Math.abs(backendTotals.tax_amount - frontendTotals.tax_amount) <= TOLERANCE;
    const totalMatch = Math.abs(backendTotals.total - frontendTotals.total) <= TOLERANCE;
    
    const hasDiscrepancy = !subtotalMatch || !taxMatch || !totalMatch;

    // Build discrepancy reason
    let discrepancyReason = null;
    if (hasDiscrepancy) {
      const reasons = [];
      if (!subtotalMatch) {
        reasons.push(`Subtotal: FE=$${frontendTotals.subtotal}, BE=$${backendTotals.subtotal}`);
      }
      if (!taxMatch) {
        reasons.push(`Tax: FE=$${frontendTotals.tax_amount}, BE=$${backendTotals.tax_amount}`);
      }
      if (!totalMatch) {
        reasons.push(`Total: FE=$${frontendTotals.total}, BE=$${backendTotals.total}`);
      }
      discrepancyReason = reasons.join(' | ');
    }

    // UPDATE FLAGS (backend authority) - NO BLOCKING
    const updatePayload = {
      financial_validated_backend: !hasDiscrepancy,
      financial_discrepancy: hasDiscrepancy,
      financial_discrepancy_reason: discrepancyReason,
      backend_totals: hasDiscrepancy ? backendTotals : null
    };

    await base44.asServiceRole.entities.Quote.update(quote.id, updatePayload);

    // TELEMETRY: Log if discrepancy found
    if (hasDiscrepancy) {
      console.log('[🎯 Geofence Telemetry]', {
        event_type: 'financial_backend_discrepancy',
        user_email: quote.created_by || 'unknown',
        job_id: quote.job_id || null,
        source: 'backend',
        timestamp: new Date().toISOString(),
        metadata: {
          document_type: 'quote',
          quote_id: quote.id,
          quote_number: quote.quote_number,
          customer_name: quote.customer_name,
          frontend_totals: frontendTotals,
          backend_totals: backendTotals,
          discrepancy_reason: discrepancyReason
        }
      });
    }

    // LOG RESULTS (for audit trail)
    console.log('[Quote Backend Validation]', {
      quoteId: quote.id,
      quoteNumber: quote.quote_number,
      customerName: quote.customer_name,
      itemsCount: quote.items.length,
      frontendTotals,
      backendTotals,
      hasDiscrepancy,
      discrepancyReason,
      validated: !hasDiscrepancy
    });

    return Response.json({ 
      success: true,
      validated: !hasDiscrepancy,
      hasDiscrepancy,
      discrepancyReason,
      backendTotals,
      frontendTotals
    });

  } catch (error) {
    console.error('[Quote Validation Error]', error.message);
    
    // CRITICAL: DO NOT block quote creation on validation error
    // Just log and continue
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});