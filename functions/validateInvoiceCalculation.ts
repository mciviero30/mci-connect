import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * INVOICE BACKEND VALIDATION - Autoridad Final
 * 
 * FASE 7 - QUOTES & INVOICES BACKEND AUTHORITY
 * 
 * Triggered automatically when Invoice is created or updated (draft/pending)
 * Recalcula totales desde line items
 * Marca discrepancias sin bloquear generación
 * 
 * Principios:
 * - Backend = single source of truth
 * - NO bloquea invoice
 * - Solo audita y marca flags
 */

/**
 * Calculate invoice totals from line items (backend authority)
 */
function calculateInvoiceTotals(items, taxRate = 0) {
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

    // Only process create or update events for draft/sent invoices
    if (event.type === 'update' && !['draft', 'sent', 'partial'].includes(data.status)) {
      return Response.json({ 
        success: true, 
        message: 'Invoice not draft/sent/partial, skipping validation' 
      });
    }

    const invoice = data;
    
    // Skip validation if invoice has no items
    if (!invoice.items || invoice.items.length === 0) {
      return Response.json({ 
        success: true, 
        message: 'No items - cannot validate' 
      });
    }

    // BACKEND RE-CALCULATION (authority) - DO NOT trust frontend values
    const backendTotals = calculateInvoiceTotals(invoice.items, invoice.tax_rate || 0);

    // Frontend values (as submitted)
    const frontendTotals = {
      subtotal: parseFloat(invoice.subtotal) || 0,
      tax_amount: parseFloat(invoice.tax_amount) || 0,
      total: parseFloat(invoice.total) || 0
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

    await base44.asServiceRole.entities.Invoice.update(invoice.id, updatePayload);

    // TELEMETRY: Log if discrepancy found
    if (hasDiscrepancy) {
      console.log('[🎯 Geofence Telemetry]', {
        event_type: 'financial_backend_discrepancy',
        user_email: invoice.created_by || 'unknown',
        job_id: invoice.job_id || null,
        source: 'backend',
        timestamp: new Date().toISOString(),
        metadata: {
          document_type: 'invoice',
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          customer_name: invoice.customer_name,
          frontend_totals: frontendTotals,
          backend_totals: backendTotals,
          discrepancy_reason: discrepancyReason
        }
      });
    }

    // LOG RESULTS (for audit trail)
    console.log('[Invoice Backend Validation]', {
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customerName: invoice.customer_name,
      itemsCount: invoice.items.length,
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
    console.error('[Invoice Validation Error]', error.message);
    
    // CRITICAL: DO NOT block invoice creation on validation error
    // Just log and continue
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});