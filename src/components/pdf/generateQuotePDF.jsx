/**
 * GENERATE QUOTE PDF
 * Professional quote PDF generation with MCI branding
 */

import { jsPDF } from 'jspdf';
import {
  addHeader,
  addCompanyInfo,
  addCustomerInfo,
  addDocumentInfo,
  addJobDetails,
  addItemsTable,
  addTotals,
  addNotes,
  addTerms,
} from './pdfHelpers';

/**
 * Generate and download Quote PDF
 * @param {Object} quote - Quote data
 * @returns {jsPDF} - PDF document
 */
export function generateQuotePDF(quote) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 0;

  // Header
  y = addHeader(doc, 'QUOTE');

  // Company Info
  y = addCompanyInfo(doc, y);

  // Customer Info
  y = addCustomerInfo(doc, {
    name: quote.customer_name,
    email: quote.customer_email,
    phone: quote.customer_phone,
  }, y);

  // Document Info (right side)
  addDocumentInfo(doc, {
    numberLabel: 'Quote #:',
    number: quote.quote_number || 'N/A',
    date: quote.quote_date,
    secondDateLabel: 'Valid Until:',
    secondDate: quote.valid_until,
  }, y - 12);

  y += 10;

  // Job Details
  y = addJobDetails(doc, {
    name: quote.job_name,
    address: quote.job_address,
  }, y);

  // Items Table
  y = addItemsTable(doc, quote.items || [], y);

  // Totals
  y = addTotals(doc, {
    subtotal: quote.subtotal,
    tax_amount: quote.tax_amount,
    tax_rate: quote.tax_rate,
    total: quote.total,
  }, y);

  // Notes
  if (quote.notes) {
    y += 10;
    y = addNotes(doc, quote.notes, y);
  }

  // Terms
  y += 10;
  addTerms(doc, quote.terms, y);

  return doc;
}

/**
 * Download Quote PDF
 */
export function downloadQuotePDF(quote) {
  const doc = generateQuotePDF(quote);
  const filename = `Quote_${quote.quote_number || 'draft'}.pdf`;
  doc.save(filename);
}

/**
 * Get Quote PDF as blob
 */
export function getQuotePDFBlob(quote) {
  const doc = generateQuotePDF(quote);
  return doc.output('blob');
}

/**
 * Get Quote PDF as data URI
 */
export function getQuotePDFDataURI(quote) {
  const doc = generateQuotePDF(quote);
  return doc.output('dataurlstring');
}