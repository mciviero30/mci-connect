/**
 * GENERATE QUOTE PDF
 * Professional quote PDF generation with MCI branding
 * Refactored to match generateInvoicePDF.js standards
 */

import {
  initDocument,
  addHeader,
  addCompanyInfo,
  addCustomerInfo,
  addDocumentInfo,
  addTotals,
  addNotes,
  addTerms,
  checkPageBreak
} from './pdfHelpers';
import { PAGE, COLORS, FONTS, DEFAULTS, formatCurrency, getContentWidth } from './pdfConfig';

/**
 * Render items table header (reusable after page breaks)
 */
function renderItemsTableHeader(doc, y) {
  const { margin } = PAGE;
  const contentWidth = getContentWidth();
  const columnWidths = [90, 20, 30, 30];

  doc.setFillColor(COLORS.tableHeaderBg);
  doc.rect(margin, y - 2, contentWidth, DEFAULTS.rowHeight, 'F');

  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.textPrimary);

  let xPos = margin + DEFAULTS.tablePadding;
  doc.text('DESCRIPTION', xPos, y + 3);
  xPos += columnWidths[0];
  doc.text('QTY', xPos, y + 3);
  xPos += columnWidths[1];
  doc.text('UNIT PRICE', xPos, y + 3);
  xPos += columnWidths[2];
  doc.text('TOTAL', xPos, y + 3);

  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y + DEFAULTS.rowHeight - 2, PAGE.width - margin, y + DEFAULTS.rowHeight - 2);

  return y + DEFAULTS.rowHeight;
}

/**
 * Generate Quote PDF
 * @param {Object} quote - Quote data
 * @returns {jsPDF} - PDF document
 */
export function generateQuotePDF(quote) {
  if (!quote.items || quote.items.length === 0) {
    throw new Error('Cannot generate PDF: Quote has no items');
  }
  if (!quote.customer_name) {
    throw new Error('Cannot generate PDF: Customer name is required');
  }

  const doc = initDocument();
  let y = 0;

  y = addHeader(doc, 'QUOTE');

  addDocumentInfo(doc, {
    label: 'Quote #:',
    number: quote.quote_number || 'DRAFT',
    date: quote.quote_date || quote.created_date,
    secondLabel: 'Valid Until:',
    secondDate: quote.valid_until
  }, y);

  y = addCompanyInfo(doc, y);

  y = addCustomerInfo(doc, {
    name: quote.customer_name,
    address: quote.job_address,
    phone: quote.customer_phone,
    email: quote.customer_email
  }, y);

  y += 5;

  const { margin } = PAGE;
  const contentWidth = getContentWidth();
  const columnWidths = [90, 20, 30, 30];

  y = renderItemsTableHeader(doc, y);

  quote.items.forEach((item, index) => {
    const estimatedRowHeight = 15;
    const previousY = y;
    y = checkPageBreak(doc, y, estimatedRowHeight);
    
    if (y !== previousY && y < 50) {
      y = renderItemsTableHeader(doc, y);
    }

    const description = item.item_name || item.description || '';
    const descLines = doc.splitTextToSize(description, columnWidths[0] - (DEFAULTS.tablePadding * 2));
    const rowHeight = Math.max(DEFAULTS.rowHeight, descLines.length * 4 + 4);

    if (index % 2 === 0) {
      doc.setFillColor(COLORS.tableBg);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setFont(FONTS.regular);
    doc.setFontSize(FONTS.sizes.small);
    doc.setTextColor(COLORS.textPrimary);

    let xPos = margin + DEFAULTS.tablePadding;
    doc.text(descLines, xPos, y + 5);
    xPos += columnWidths[0];

    const qtyText = `${item.quantity || 0} ${item.unit || ''}`;
    doc.text(qtyText, xPos, y + 5);
    xPos += columnWidths[1];

    doc.text(formatCurrency(item.unit_price), xPos, y + 5);
    xPos += columnWidths[2];

    doc.setFont(FONTS.bold);
    doc.text(formatCurrency(item.total), xPos, y + 5);

    doc.setDrawColor(COLORS.lightGray);
    doc.line(margin, y + rowHeight, PAGE.width - margin, y + rowHeight);

    y += rowHeight;
  });

  y = checkPageBreak(doc, y, 25);
  y = addTotals(doc, {
    subtotal: quote.subtotal,
    tax_rate: quote.tax_rate,
    tax_amount: quote.tax_amount,
    total: quote.total
  }, y);

  if (quote.notes) {
    y = checkPageBreak(doc, y, 30);
    y = addNotes(doc, quote.notes, y);
  }

  y = checkPageBreak(doc, y, 40);
  const termsText = quote.terms || 'Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest. Client responsible for collection costs. Report discrepancies within 5 days in writing.';
  addTerms(doc, termsText, y);

  return doc;
}

/**
 * Download Quote PDF
 */
export function downloadQuotePDF(quote) {
  const doc = generateQuotePDF(quote);
  const customerName = (quote.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const quoteNumber = (quote.quote_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Quote-${quoteNumber}-${customerName}.pdf`;
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