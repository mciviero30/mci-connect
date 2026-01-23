/**
 * DOCUMENT NUMBERING VALIDATION & UTILITIES
 * ✅ Consistent formats across system
 * ✅ PDF naming conventions enforced
 * ✅ No duplicates allowed
 */

/**
 * Validate invoice number format
 * @param {string} invoiceNumber - Number to validate
 * @returns {boolean} True if valid format
 */
export const isValidInvoiceNumber = (invoiceNumber) => {
  return /^INV-\d{5}$/.test(invoiceNumber);
};

/**
 * Validate quote number format
 * @param {string} quoteNumber - Number to validate
 * @returns {boolean} True if valid format
 */
export const isValidQuoteNumber = (quoteNumber) => {
  return /^(EST-|QT-)\d{5}$/.test(quoteNumber);
};

/**
 * Generate PDF filename for invoice
 * Format: Invoice-INV-00012-Customer-Name.pdf
 * @param {object} invoice - Invoice data
 * @returns {string} Sanitized filename
 */
export const generateInvoicePDFName = (invoice) => {
  if (!invoice?.invoice_number) {
    throw new Error('Invoice number required for PDF naming');
  }

  const customerName = (invoice.customer_name || 'Unknown')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .slice(0, 30)
    .replace(/\s+/g, '-');

  return `Invoice-${invoice.invoice_number}-${customerName}.pdf`.toLowerCase();
};

/**
 * Generate PDF filename for quote
 * Format: Quote-EST-00008-Customer-Name.pdf
 * @param {object} quote - Quote data
 * @returns {string} Sanitized filename
 */
export const generateQuotePDFName = (quote) => {
  if (!quote?.quote_number) {
    throw new Error('Quote number required for PDF naming');
  }

  const customerName = (quote.customer_name || 'Unknown')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .slice(0, 30)
    .replace(/\s+/g, '-');

  return `Quote-${quote.quote_number}-${customerName}.pdf`.toLowerCase();
};

/**
 * Extract number from document string
 * @param {string} docNumber - Document number (INV-00012, EST-00008)
 * @returns {number} Extracted sequence number
 */
export const extractSequenceNumber = (docNumber) => {
  const match = docNumber?.match(/\d+$/);
  return match ? parseInt(match[0], 10) : 0;
};

/**
 * Check if document would create duplicate filename
 * @param {string} existingNames - Array of existing filenames
 * @param {string} newName - New filename to check
 * @returns {boolean} True if duplicate detected
 */
export const hasDuplicateFilename = (existingNames, newName) => {
  return existingNames.some(name => name.toLowerCase() === newName.toLowerCase());
};