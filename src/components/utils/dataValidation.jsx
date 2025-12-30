/**
 * DATA NORMALIZATION & VALIDATION
 * Ensures data integrity before create/update operations
 * 
 * MIGRATED TO USE DOCUMENT CONTRACT
 * Quote e Invoice ahora comparten estructura base garantizada
 */

import { calculateQuoteTotals, calculateInvoiceTotals, normalizeQuoteItems, normalizeInvoiceItems } from './quoteCalculations';
import { normalizeDocumentBase, validateDocument } from '../core/DocumentContract';

/**
 * Normalize and validate quote data before saving
 * NOW USES DOCUMENT CONTRACT for common fields
 * 
 * @param {Object} quoteData - Raw quote data from form
 * @returns {Object} - Clean, validated quote data ready for DB
 */
export function normalizeQuoteForSave(quoteData) {
  // Step 1: Normalize common document fields (preserves ALL fields)
  const normalized = normalizeDocumentBase(quoteData);
  
  // Step 2: Normalize items using quote-specific logic
  normalized.items = normalizeQuoteItems(normalized.items);
  
  // Step 3: Recalculate totals
  const totals = calculateQuoteTotals(normalized.items, normalized.tax_rate);
  normalized.subtotal = totals.subtotal;
  normalized.tax_amount = totals.tax_amount;
  normalized.total = totals.total;
  normalized.estimated_hours = totals.estimated_hours;
  normalized.estimated_cost = totals.estimated_cost;
  
  // Step 4: Validate (throws if invalid)
  const validation = validateDocument(normalized);
  if (!validation.valid) {
    throw new Error(`Quote validation failed: ${validation.errors.join(', ')}`);
  }
  
  return normalized;
}

/**
 * Normalize and validate invoice data before saving
 * NOW USES DOCUMENT CONTRACT for common fields
 * 
 * @param {Object} invoiceData - Raw invoice data from form
 * @returns {Object} - Clean, validated invoice data ready for DB
 */
export function normalizeInvoiceForSave(invoiceData) {
  // Step 1: Normalize common document fields (preserves ALL fields)
  const normalized = normalizeDocumentBase(invoiceData);
  
  // Step 2: Normalize items using invoice-specific logic
  normalized.items = normalizeInvoiceItems(normalized.items);
  
  // Step 3: Recalculate totals (invoice-specific with amount_paid)
  const totals = calculateInvoiceTotals(
    normalized.items, 
    normalized.tax_rate,
    normalized.amount_paid || 0
  );
  normalized.subtotal = totals.subtotal;
  normalized.tax_amount = totals.tax_amount;
  normalized.total = totals.total;
  normalized.amount_paid = totals.amount_paid;
  normalized.balance = totals.balance;
  
  // Step 4: Validate (throws if invalid)
  const validation = validateDocument(normalized);
  if (!validation.valid) {
    throw new Error(`Invoice validation failed: ${validation.errors.join(', ')}`);
  }
  
  return normalized;
}

/**
 * Validate quote before sending to customer
 */
export function validateQuoteForSend(quote) {
  const validation = validateDocument(quote);
  if (!validation.valid) {
    throw new Error(`Cannot send quote: ${validation.errors.join(', ')}`);
  }
  
  // Additional send-specific validation
  if (!quote.quote_number) {
    throw new Error('Quote number is required before sending');
  }
  
  return true;
}

/**
 * Validate invoice before sending
 */
export function validateInvoiceForSend(invoice) {
  const validation = validateDocument(invoice);
  if (!validation.valid) {
    throw new Error(`Cannot send invoice: ${validation.errors.join(', ')}`);
  }
  
  // Additional send-specific validation
  if (!invoice.invoice_number) {
    throw new Error('Invoice number is required before sending');
  }
  
  return true;
}