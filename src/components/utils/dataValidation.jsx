/**
 * DATA NORMALIZATION & VALIDATION
 * Ensures data integrity before create/update operations
 * 
 * MIGRATED TO USE DOCUMENT CONTRACT
 * Quote e Invoice ahora comparten estructura base garantizada
 */

import { calculateQuoteTotals, calculateInvoiceTotals, normalizeQuoteItems, normalizeInvoiceItems } from './quoteCalculations';
import { normalizeDocument, validateDocument } from '../core/DocumentContract';

/**
 * Normalize and validate quote data before saving
 * NOW USES DOCUMENT CONTRACT
 * 
 * @param {Object} quoteData - Raw quote data from form
 * @returns {Object} - Clean, validated quote data ready for DB
 */
export function normalizeQuoteForSave(quoteData) {
  // Use unified document normalization
  const normalized = normalizeDocument(quoteData, 'quote');
  
  // Validate against contract
  validateDocument(normalized, 'quote');
  
  return normalized;
}

/**
 * Normalize and validate invoice data before saving
 * NOW USES DOCUMENT CONTRACT
 * 
 * @param {Object} invoiceData - Raw invoice data from form
 * @returns {Object} - Clean, validated invoice data ready for DB
 */
export function normalizeInvoiceForSave(invoiceData) {
  // Use unified document normalization
  const normalized = normalizeDocument(invoiceData, 'invoice');
  
  // Validate against contract
  validateDocument(normalized, 'invoice');
  
  return normalized;
}

/**
 * Validate quote before sending to customer
 * NOW USES DOCUMENT CONTRACT
 */
export function validateQuoteForSend(quote) {
  const { validateForSend } = require('../core/DocumentContract');
  return validateForSend(quote, 'quote');
}

/**
 * Validate invoice before sending
 * NOW USES DOCUMENT CONTRACT
 */
export function validateInvoiceForSend(invoice) {
  const { validateForSend } = require('../core/DocumentContract');
  return validateForSend(invoice, 'invoice');
}