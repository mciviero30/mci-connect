/**
 * GENERATE INVOICE PDF
 * Professional invoice PDF generation with MCI branding
 * Refactored to match generateQuotePDF.js standards
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
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice data
 * @returns {jsPDF} - PDF document
 */
export function generateInvoicePDF(invoice) {
  // Defensive validation
  if (!invoice) {
    throw new Error('Cannot generate PDF: Invoice data is missing');
  }
  if (!invoice.id) {
    throw new Error('Cannot generate PDF: Invoice ID is required');
  }
  if (!invoice.items || invoice.items.length === 0) {
    throw new Error('Cannot generate PDF: Invoice has no items');
  }
  if (!invoice.customer_name) {
    throw new Error('Cannot generate PDF: Customer name is required');
  }

  const doc = initDocument();
  let y = 0;

  const headerText = invoice.status === 'paid' ? 'INVOICE - PAID' : 'INVOICE';
  y = addHeader(doc, headerText);

  // Add PAID watermark if paid
  if (invoice.status === 'paid') {
    doc.setFont(FONTS.bold);
    doc.setFontSize(60);
    doc.setTextColor(34, 197, 94); // green-500
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.text('PAID', 105, 150, { 
      align: 'center',
      angle: 45 
    });
    doc.restoreGraphicsState();
  }

  addDocumentInfo(doc, {
    label: 'Invoice #:',
    number: invoice.invoice_number || 'DRAFT',
    date: invoice.invoice_date || invoice.created_date,
    secondLabel: 'Due Date:',
    secondDate: invoice.due_date
  }, y);

  y = addCompanyInfo(doc, y);

  y = addCustomerInfo(doc, {
    name: invoice.customer_name,
    address: invoice.job_address,
    phone: invoice.customer_phone,
    email: invoice.customer_email
  }, y);

  y += 5;

  const { margin } = PAGE;
  const contentWidth = getContentWidth();
  const columnWidths = [90, 20, 30, 30];

  y = renderItemsTableHeader(doc, y);

  invoice.items.forEach((item, index) => {
    const estimatedRowHeight = 15;
    const previousY = y;
    y = checkPageBreak(doc, y, estimatedRowHeight);
    
    if (y !== previousY && y < 50) {
      y = renderItemsTableHeader(doc, y);
    }

    // Siempre mostrar item_name arriba (bold) y description debajo (normal)
    const itemName = item.item_name || '';
    const itemDesc = item.description || '';
    
    const nameLines = itemName ? doc.splitTextToSize(String(itemName), columnWidths[0] - (DEFAULTS.tablePadding * 2)) : [];
    const descLines = itemDesc ? doc.splitTextToSize(String(itemDesc), columnWidths[0] - (DEFAULTS.tablePadding * 2)) : [];
    const rowHeight = Math.max(DEFAULTS.rowHeight, (nameLines.length + descLines.length) * 4 + 6);

    if (index % 2 === 0) {
      doc.setFillColor(COLORS.tableBg);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    let xPos = margin + DEFAULTS.tablePadding;
    let textY = y + 5;
    
    // Item Name (bold, black) - solo si existe
    if (nameLines.length > 0) {
      doc.setFont(FONTS.bold);
      doc.setFontSize(FONTS.sizes.small);
      doc.setTextColor(COLORS.textPrimary);
      doc.text(nameLines, xPos, textY);
      textY += nameLines.length * 4;
    }
    
    // Description below (normal, dark gray) - solo si existe
    if (descLines.length > 0) {
      doc.setFont(FONTS.regular);
      doc.setFontSize(FONTS.sizes.small - 1);
      doc.setTextColor(100, 100, 100);
      doc.text(descLines, xPos, textY);
    }
    
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

  y = checkPageBreak(doc, y, 35);
  
  // Modified totals for invoices (includes amount_paid and balance)
  const rightX = PAGE.width - margin;
  const labelX = rightX - 60;
  
  y += 5;
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.body);
  
  // Subtotal
  doc.setTextColor(COLORS.textSecondary);
  doc.text('Subtotal:', labelX, y);
  doc.setFont(FONTS.bold);
  doc.setTextColor(COLORS.textPrimary);
  doc.text(formatCurrency(invoice.subtotal), rightX, y, { align: 'right' });
  
  // Tax
  if (invoice.tax_amount && invoice.tax_amount > 0) {
    y += 6;
    doc.setFont(FONTS.regular);
    doc.setTextColor(COLORS.textSecondary);
    doc.text(`Tax (${invoice.tax_rate || 0}%):`, labelX, y);
    doc.setFont(FONTS.bold);
    doc.setTextColor(COLORS.textPrimary);
    doc.text(formatCurrency(invoice.tax_amount), rightX, y, { align: 'right' });
  }
  
  // Total
  y += 8;
  doc.setFillColor(COLORS.totalsBg);
  doc.rect(labelX - 5, y - 5, 65, 10, 'F');
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.subtitle);
  doc.setTextColor(COLORS.textPrimary);
  doc.text('TOTAL:', labelX, y + 2);
  doc.text(formatCurrency(invoice.total), rightX, y + 2, { align: 'right' });
  
  // Amount Paid
  if (invoice.amount_paid && invoice.amount_paid > 0) {
    y += 8;
    doc.setFont(FONTS.regular);
    doc.setFontSize(FONTS.sizes.body);
    doc.setTextColor(COLORS.textSecondary);
    doc.text('Amount Paid:', labelX, y);
    doc.setFont(FONTS.bold);
    doc.setTextColor(34, 197, 94); // green-500
    doc.text(formatCurrency(invoice.amount_paid), rightX, y, { align: 'right' });
  }
  
  // Balance
  if (invoice.balance && invoice.balance !== invoice.total) {
    y += 6;
    doc.setFont(FONTS.bold);
    doc.setFontSize(FONTS.sizes.body);
    doc.setTextColor(COLORS.textSecondary);
    doc.text('Balance Due:', labelX, y);
    doc.setTextColor(invoice.balance > 0 ? COLORS.textPrimary : COLORS.textSecondary);
    doc.text(formatCurrency(invoice.balance), rightX, y, { align: 'right' });
  }
  
  y += 12;

  if (invoice.notes) {
    y = checkPageBreak(doc, y, 30);
    y = addNotes(doc, invoice.notes, y);
  }

  y = checkPageBreak(doc, y, 40);
  const termsText = invoice.terms || 'Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest. Client responsible for collection costs. Report discrepancies within 5 days in writing.';
  addTerms(doc, termsText, y);

  return doc;
}

/**
 * Download Invoice PDF
 */
export function downloadInvoicePDF(invoice) {
  const doc = generateInvoicePDF(invoice);
  const customerName = (invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const invoiceNumber = (invoice.invoice_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Invoice-${invoiceNumber}-${customerName}.pdf`;
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