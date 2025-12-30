/**
 * GENERATE INVOICE PDF
 * Professional invoice PDF generation with MCI branding
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
import { COLORS, FONTS } from './pdfConfig';

/**
 * Generate and download Invoice PDF
 * @param {Object} invoice - Invoice data
 * @returns {jsPDF} - PDF document
 */
export function generateInvoicePDF(invoice) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  let y = 0;

  // Header with PAID stamp if applicable
  const headerText = invoice.status === 'paid' ? 'INVOICE - PAID' : 'INVOICE';
  y = addHeader(doc, headerText);

  // Add PAID watermark if paid
  if (invoice.status === 'paid') {
    doc.setFont(FONTS.bold);
    doc.setFontSize(60);
    doc.setTextColor(COLORS.status.paid);
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.text('PAID', 105, 150, { 
      align: 'center',
      angle: 45 
    });
    doc.setGState(new doc.GState({ opacity: 1 }));
  }

  // Company Info
  y = addCompanyInfo(doc, y);

  // Customer Info
  y = addCustomerInfo(doc, {
    name: invoice.customer_name,
    email: invoice.customer_email,
    phone: invoice.customer_phone,
  }, y);

  // Document Info (right side)
  addDocumentInfo(doc, {
    numberLabel: 'Invoice #:',
    number: invoice.invoice_number || 'N/A',
    date: invoice.invoice_date,
    secondDateLabel: 'Due Date:',
    secondDate: invoice.due_date,
  }, y - 12);

  y += 10;

  // Job Details
  y = addJobDetails(doc, {
    name: invoice.job_name,
    address: invoice.job_address,
  }, y);

  // Items Table
  y = addItemsTable(doc, invoice.items || [], y);

  // Totals (includes amount paid and balance)
  y = addTotals(doc, {
    subtotal: invoice.subtotal,
    tax_amount: invoice.tax_amount,
    tax_rate: invoice.tax_rate,
    total: invoice.total,
    amount_paid: invoice.amount_paid,
    balance: invoice.balance,
  }, y);

  // Notes
  if (invoice.notes) {
    y += 10;
    y = addNotes(doc, invoice.notes, y);
  }

  // Terms
  y += 10;
  addTerms(doc, invoice.terms, y);

  return doc;
}

/**
 * Download Invoice PDF
 */
export function downloadInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice);
  const filename = `Invoice_${invoice.invoice_number || 'draft'}.pdf`;
  doc.save(filename);
}

/**
 * Get Invoice PDF as blob
 */
export function getInvoicePDFBlob(invoice) {
  const doc = generateInvoicePDF(invoice);
  return doc.output('blob');
}

/**
 * Get Invoice PDF as data URI
 */
export function getInvoicePDFDataURI(invoice) {
  const doc = generateInvoicePDF(invoice);
  return doc.output('dataurlstring');
}