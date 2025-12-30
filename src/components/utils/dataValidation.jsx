/**
 * DATA NORMALIZATION & VALIDATION
 * Ensures data integrity before create/update operations
 */

import { calculateQuoteTotals, calculateInvoiceTotals, normalizeQuoteItems, normalizeInvoiceItems } from './quoteCalculations';

/**
 * Normalize and validate quote data before saving
 * @param {Object} quoteData - Raw quote data from form
 * @returns {Object} - Clean, validated quote data ready for DB
 */
export function normalizeQuoteForSave(quoteData) {
  // Normalize items first
  const normalizedItems = normalizeQuoteItems(quoteData.items || []);
  
  // Filter out empty/invalid items (keep item_name requirement)
  const validItems = normalizedItems.filter(item => 
    item.quantity > 0 &&
    (item.description?.trim() || item.item_name?.trim())
  );

  if (validItems.length === 0) {
    throw new Error('Quote must have at least one valid item');
  }

  // Recalculate totals from normalized items
  const totals = calculateQuoteTotals(validItems, quoteData.tax_rate || 0);

  // Build clean quote object
  const normalized = {
    // Customer info
    customer_id: quoteData.customer_id || '',
    customer_name: (quoteData.customer_name || '').trim(),
    customer_email: (quoteData.customer_email || '').trim(),
    customer_phone: (quoteData.customer_phone || '').trim(),
    
    // Job info
    job_name: (quoteData.job_name || '').trim(),
    job_id: quoteData.job_id || '',
    job_address: (quoteData.job_address || '').trim(),
    
    // Team info (support multiple teams)
    team_ids: quoteData.team_ids || [],
    team_names: quoteData.team_names || [],
    team_id: quoteData.team_ids?.[0] || '',
    team_name: quoteData.team_names?.[0] || '',
    
    // Dates
    quote_date: quoteData.quote_date || new Date().toISOString().split('T')[0],
    valid_until: quoteData.valid_until || '',
    install_date: quoteData.install_date || '',
    
    // Items (normalized)
    items: validItems,
    
    // Calculated totals (from centralizeCalculations)
    ...totals,
    tax_rate: parseFloat(quoteData.tax_rate) || 0,
    
    // Additional fields
    notes: quoteData.notes || '',
    terms: quoteData.terms || '',
    out_of_area: quoteData.out_of_area || false,
    
    // Preserve existing metadata if updating
    status: quoteData.status || 'draft',
    assigned_to: quoteData.assigned_to || '',
    assigned_to_name: quoteData.assigned_to_name || '',
    version: quoteData.version || 1,
    parent_quote_id: quoteData.parent_quote_id || '',
  };

  // Validate required fields
  if (!normalized.customer_name || !normalized.job_name) {
    throw new Error('Customer name and job name are required');
  }

  return normalized;
}

/**
 * Normalize and validate invoice data before saving
 * @param {Object} invoiceData - Raw invoice data from form
 * @returns {Object} - Clean, validated invoice data ready for DB
 */
export function normalizeInvoiceForSave(invoiceData) {
  // Normalize items first
  const normalizedItems = normalizeInvoiceItems(invoiceData.items || []);
  
  // Filter out empty/invalid items (keep item_name requirement)
  const validItems = normalizedItems.filter(item => 
    item.quantity > 0 &&
    (item.description?.trim() || item.item_name?.trim())
  ).map(item => ({
    ...item,
    item_name: item.item_name || '', // CRITICAL: Explicitly preserve item_name
    description: item.description || ''
  }));

  if (validItems.length === 0) {
    throw new Error('Invoice must have at least one valid item');
  }

  // Recalculate totals from normalized items
  const totals = calculateInvoiceTotals(
    validItems, 
    invoiceData.tax_rate || 0,
    invoiceData.amount_paid || 0
  );

  // Build clean invoice object
  const normalized = {
    // Quote reference
    quote_id: invoiceData.quote_id || '',
    
    // Customer info
    customer_id: invoiceData.customer_id || '',
    customer_name: (invoiceData.customer_name || '').trim(),
    customer_email: (invoiceData.customer_email || '').trim(),
    customer_phone: (invoiceData.customer_phone || '').trim(),
    
    // Job info
    job_name: (invoiceData.job_name || '').trim(),
    job_id: invoiceData.job_id || '',
    job_address: (invoiceData.job_address || '').trim(),
    
    // Team info
    team_id: invoiceData.team_id || '',
    team_name: invoiceData.team_name || '',
    
    // Dates
    invoice_date: invoiceData.invoice_date || new Date().toISOString().split('T')[0],
    due_date: invoiceData.due_date || '',
    payment_date: invoiceData.payment_date || '',
    
    // Items (normalized)
    items: validItems,
    
    // Calculated totals (from centralizedCalculations)
    ...totals,
    tax_rate: parseFloat(invoiceData.tax_rate) || 0,
    
    // Additional fields
    notes: invoiceData.notes || '',
    terms: invoiceData.terms || '',
    
    // Preserve existing metadata if updating
    status: invoiceData.status || 'draft',
    transaction_id: invoiceData.transaction_id || '',
  };

  // Validate required fields
  if (!normalized.customer_name || !normalized.job_name) {
    throw new Error('Customer name and job name are required');
  }

  return normalized;
}

/**
 * Validate quote before sending to customer
 */
export function validateQuoteForSend(quote) {
  const errors = [];

  if (!quote.customer_email || !quote.customer_email.includes('@')) {
    errors.push('Valid customer email is required');
  }

  if (!quote.items || quote.items.length === 0) {
    errors.push('Quote must have at least one item');
  }

  if (!quote.total || quote.total <= 0) {
    errors.push('Quote total must be greater than 0');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return true;
}

/**
 * Validate invoice before sending
 */
export function validateInvoiceForSend(invoice) {
  const errors = [];

  if (!invoice.customer_email || !invoice.customer_email.includes('@')) {
    errors.push('Valid customer email is required');
  }

  if (!invoice.items || invoice.items.length === 0) {
    errors.push('Invoice must have at least one item');
  }

  if (!invoice.total || invoice.total <= 0) {
    errors.push('Invoice total must be greater than 0');
  }

  if (!invoice.invoice_number) {
    errors.push('Invoice number is required');
  }

  if (errors.length > 0) {
    throw new Error(errors.join('; '));
  }

  return true;
}