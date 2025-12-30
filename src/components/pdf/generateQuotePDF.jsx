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
  const margin = Number(PAGE.margin?.left || 20);
  const width = Number(PAGE.width || 210);
  const contentWidth = Number(getContentWidth() || 170);
  const rowHeight = Number(DEFAULTS.rowHeight || 8);
  const tablePadding = Number(DEFAULTS.tablePadding || 3);
  const columnWidths = [90, 20, 30, 30];
  const yPos = Number(y || 50);

  doc.setFillColor(COLORS.tableHeaderBg || '#f3f4f6');
  doc.rect(margin, yPos - 2, contentWidth, rowHeight, 'F');

  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setFontSize(Number(FONTS.sizes?.small || 8));
  doc.setTextColor(COLORS.textPrimary || '#111827');

  let xPos = margin + tablePadding;
  doc.text('DESCRIPTION', xPos, yPos + 3);
  xPos += columnWidths[0];
  doc.text('QTY', xPos, yPos + 3);
  xPos += columnWidths[1];
  doc.text('UNIT PRICE', xPos, yPos + 3);
  xPos += columnWidths[2];
  doc.text('TOTAL', xPos, yPos + 3);

  doc.setDrawColor(COLORS.lightGray || '#e5e7eb');
  doc.line(margin, yPos + rowHeight - 2, width - margin, yPos + rowHeight - 2);

  return Number(yPos + rowHeight);
}

/**
 * Generate Quote PDF
 * @param {Object} quote - Quote data
 * @returns {jsPDF} - PDF document
 */
export function generateQuotePDF(quote) {
  // Defensive validation
  if (!quote) {
    throw new Error('Cannot generate PDF: Quote data is missing');
  }
  if (!quote.id) {
    throw new Error('Cannot generate PDF: Quote ID is required');
  }
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

  const margin = Number(PAGE.margin?.left || 20);
  const width = Number(PAGE.width || 210);
  const contentWidth = Number(getContentWidth() || 170);
  const columnWidths = [90, 20, 30, 30];
  const tablePadding = Number(DEFAULTS.tablePadding || 3);
  const defaultRowHeight = Number(DEFAULTS.rowHeight || 8);

  y = renderItemsTableHeader(doc, y);

  quote.items.forEach((item, index) => {
    const estimatedRowHeight = 15;
    const previousY = y;
    y = checkPageBreak(doc, y, estimatedRowHeight);
    
    if (y !== previousY && y < 50) {
      y = renderItemsTableHeader(doc, y);
    }

    const description = String(item.item_name || item.description || '');
    const descLines = doc.splitTextToSize(description, columnWidths[0] - (tablePadding * 2));
    const rowHeight = Math.max(defaultRowHeight, descLines.length * 4 + 4);

    if (index % 2 === 0) {
      doc.setFillColor(COLORS.tableBg || '#f9fafb');
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    doc.setFont(FONTS.regular || 'helvetica');
    doc.setFontSize(Number(FONTS.sizes?.small || 8));
    doc.setTextColor(COLORS.textPrimary || '#111827');

    let xPos = margin + tablePadding;
    doc.text(descLines, xPos, y + 5);
    xPos += columnWidths[0];

    const qtyText = String(`${item.quantity || 0} ${item.unit || ''}`);
    doc.text(qtyText, xPos, y + 5);
    xPos += columnWidths[1];

    doc.text(String(formatCurrency(item.unit_price)), xPos, y + 5);
    xPos += columnWidths[2];

    doc.setFont(FONTS.bold || 'helvetica-bold');
    doc.text(String(formatCurrency(item.total)), xPos, y + 5);

    doc.setDrawColor(COLORS.lightGray || '#e5e7eb');
    doc.line(margin, y + rowHeight, width - margin, y + rowHeight);

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