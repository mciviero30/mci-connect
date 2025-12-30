/**
 * DOCUMENT CONTRACT - Unified structure for Quote and Invoice
 * 
 * This contract defines the core structure that both Quote and Invoice share.
 * It does NOT replace existing entities - it ensures consistency and reduces duplication.
 * 
 * Common Fields (both Quote and Invoice):
 * - customer_name, customer_email, customer_phone
 * - job_name, job_address
 * - items[] (array of LineItems)
 * - subtotal, tax_rate, tax_amount, total
 * - notes, terms, status
 * - created_date, updated_date
 * 
 * Quote-specific fields (preserved):
 * - quote_number, quote_date, valid_until
 * - estimated_hours, estimated_cost, profit_margin
 * - team_id, team_name, etc.
 * 
 * Invoice-specific fields (preserved):
 * - invoice_number, invoice_date, due_date
 * - amount_paid, balance, payment_date, etc.
 */

import { normalizeLineItem } from './LineItemContract';

/**
 * Core Document structure (common fields)
 */
export const DocumentContract = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  job_name: '',
  job_address: '',
  items: [],
  subtotal: 0,
  tax_rate: 0,
  tax_amount: 0,
  total: 0,
  notes: '',
  terms: '',
  status: 'draft'
};

/**
 * Normalize common document fields
 * CRITICAL: Preserves ALL existing fields using spread operator
 */
export function normalizeDocumentBase(data) {
  if (!data) return { ...DocumentContract };
  
  // CRITICAL: Preserve ALL existing fields first
  const normalized = { ...data };
  
  // Ensure core string fields exist
  if (normalized.customer_name === undefined) normalized.customer_name = '';
  if (normalized.customer_email === undefined) normalized.customer_email = '';
  if (normalized.customer_phone === undefined) normalized.customer_phone = '';
  if (normalized.job_name === undefined) normalized.job_name = '';
  if (normalized.job_address === undefined) normalized.job_address = '';
  if (normalized.notes === undefined) normalized.notes = '';
  if (normalized.terms === undefined) normalized.terms = '';
  if (normalized.status === undefined) normalized.status = 'draft';
  
  // Ensure numeric fields are numbers
  normalized.subtotal = Number(normalized.subtotal) || 0;
  normalized.tax_rate = Number(normalized.tax_rate) || 0;
  normalized.tax_amount = Number(normalized.tax_amount) || 0;
  normalized.total = Number(normalized.total) || 0;
  
  // Round to 2 decimals
  normalized.subtotal = Math.round(normalized.subtotal * 100) / 100;
  normalized.tax_amount = Math.round(normalized.tax_amount * 100) / 100;
  normalized.total = Math.round(normalized.total * 100) / 100;
  
  // Normalize items array
  if (Array.isArray(normalized.items)) {
    normalized.items = normalized.items.map(item => normalizeLineItem(item));
  } else {
    normalized.items = [];
  }
  
  return normalized;
}

/**
 * Validate common document fields
 */
export function validateDocument(data) {
  if (!data) return { valid: false, errors: ['Document data is missing'] };
  
  const errors = [];
  
  if (!data.customer_name || data.customer_name.trim() === '') {
    errors.push('Customer name is required');
  }
  
  if (!data.job_name || data.job_name.trim() === '') {
    errors.push('Job name is required');
  }
  
  if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
    errors.push('At least one item is required');
  }
  
  if (data.total === undefined || data.total <= 0) {
    errors.push('Total must be greater than 0');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Extract common fields from a document
 * Useful for comparing or syncing Quote <-> Invoice
 */
export function extractDocumentBase(data) {
  if (!data) return { ...DocumentContract };
  
  return {
    customer_name: data.customer_name || '',
    customer_email: data.customer_email || '',
    customer_phone: data.customer_phone || '',
    job_name: data.job_name || '',
    job_address: data.job_address || '',
    items: data.items || [],
    subtotal: Number(data.subtotal) || 0,
    tax_rate: Number(data.tax_rate) || 0,
    tax_amount: Number(data.tax_amount) || 0,
    total: Number(data.total) || 0,
    notes: data.notes || '',
    terms: data.terms || '',
    status: data.status || 'draft'
  };
}