/**
 * PDF HELPERS - Shared Components
 * Reusable functions for PDF generation
 */

import { COLORS, FONTS, LAYOUT, COMPANY_INFO, addGradient, formatCurrency, formatDate } from './pdfConfig';

/**
 * Add MCI header with gradient background
 */
export function addHeader(doc, documentType = 'QUOTE') {
  const { margin, pageWidth } = LAYOUT;
  
  // Black gradient header
  addGradient(doc, 0, 0, pageWidth, 40);
  
  // MCI Logo (text-based)
  doc.setFont(FONTS.bold);
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('MCI', margin, 20);
  
  // Document Type
  doc.setFontSize(FONTS.sizes.title);
  doc.text(documentType, pageWidth - margin, 20, { align: 'right' });
  
  return 45; // Return Y position after header
}

/**
 * Add company info section
 */
export function addCompanyInfo(doc, startY) {
  const { margin } = LAYOUT;
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.text.primary);
  doc.text(COMPANY_INFO.name, margin, startY);
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.light);
  
  let y = startY + 5;
  doc.text(COMPANY_INFO.address, margin, y);
  y += 4;
  doc.text(`${COMPANY_INFO.city}, ${COMPANY_INFO.state} ${COMPANY_INFO.zip}`, margin, y);
  y += 4;
  doc.text(`Phone: ${COMPANY_INFO.phone}`, margin, y);
  
  return y + 10;
}

/**
 * Add customer info section
 */
export function addCustomerInfo(doc, customer, startY) {
  const { margin } = LAYOUT;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.secondary);
  doc.text('BILL TO:', margin, startY);
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.subtitle);
  doc.setTextColor(COLORS.text.primary);
  doc.text(customer.name || 'N/A', margin, startY + 6);
  
  return startY + 12;
}

/**
 * Add document info (quote/invoice details)
 */
export function addDocumentInfo(doc, data, startY) {
  const { pageWidth, margin } = LAYOUT;
  const rightX = pageWidth - margin;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  
  let y = startY;
  const lineHeight = 5;
  
  // Document Number
  doc.setTextColor(COLORS.text.secondary);
  doc.text(data.numberLabel, rightX - 50, y);
  doc.setFont(FONTS.bold);
  doc.setTextColor(COLORS.text.primary);
  doc.text(data.number, rightX, y, { align: 'right' });
  
  // Date
  y += lineHeight;
  doc.setFont(FONTS.regular);
  doc.setTextColor(COLORS.text.secondary);
  doc.text('Date:', rightX - 50, y);
  doc.setFont(FONTS.bold);
  doc.setTextColor(COLORS.text.primary);
  doc.text(formatDate(data.date), rightX, y, { align: 'right' });
  
  // Valid Until / Due Date
  if (data.secondDateLabel && data.secondDate) {
    y += lineHeight;
    doc.setFont(FONTS.regular);
    doc.setTextColor(COLORS.text.secondary);
    doc.text(data.secondDateLabel, rightX - 50, y);
    doc.setFont(FONTS.bold);
    doc.setTextColor(COLORS.text.primary);
    doc.text(formatDate(data.secondDate), rightX, y, { align: 'right' });
  }
  
  return y + 10;
}

/**
 * Add job details section
 */
export function addJobDetails(doc, job, startY) {
  const { margin } = LAYOUT;
  
  if (!job.name) return startY;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.secondary);
  doc.text('JOB DETAILS:', margin, startY);
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.text.primary);
  doc.text(job.name, margin, startY + 5);
  
  let y = startY + 10;
  
  if (job.address) {
    doc.setFont(FONTS.regular);
    doc.setFontSize(FONTS.sizes.small);
    doc.setTextColor(COLORS.text.light);
    const addressLines = doc.splitTextToSize(job.address, 180);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 4;
  }
  
  return y + 5;
}

/**
 * Add items table
 */
export function addItemsTable(doc, items, startY) {
  const { margin, pageWidth } = LAYOUT;
  const tableWidth = pageWidth - (margin * 2);
  
  // Table header
  doc.setFillColor(COLORS.bg.tableHeader);
  doc.rect(margin, startY, tableWidth, 8, 'F');
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(255, 255, 255);
  
  // Column headers
  const colX = {
    num: margin + 2,
    desc: margin + 10,
    qty: pageWidth - 80,
    rate: pageWidth - 55,
    amount: pageWidth - margin - 2,
  };
  
  doc.text('#', colX.num, startY + 5);
  doc.text('ITEM & DESCRIPTION', colX.desc, startY + 5);
  doc.text('QTY', colX.qty, startY + 5);
  doc.text('RATE', colX.rate, startY + 5);
  doc.text('AMOUNT', colX.amount, startY + 5, { align: 'right' });
  
  let y = startY + 12;
  
  // Items
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.primary);
  
  items.forEach((item, index) => {
    // Check page break
    if (y > 250) {
      doc.addPage();
      y = 30;
    }
    
    // Row number
    doc.setTextColor(COLORS.text.light);
    doc.text(`${index + 1}`, colX.num, y);
    
    // Description
    doc.setTextColor(COLORS.text.primary);
    doc.setFont(FONTS.bold);
    const desc = item.item_name || item.description || '';
    const descLines = doc.splitTextToSize(desc, 100);
    doc.text(descLines[0], colX.desc, y);
    
    // Quantity
    doc.setFont(FONTS.regular);
    doc.text(`${item.quantity} ${item.unit || ''}`, colX.qty, y);
    
    // Rate
    doc.text(formatCurrency(item.unit_price), colX.rate, y);
    
    // Amount
    doc.setFont(FONTS.bold);
    doc.text(formatCurrency(item.total), colX.amount, y, { align: 'right' });
    
    y += 8;
    
    // Separator line
    doc.setDrawColor(COLORS.bg.total);
    doc.line(margin, y - 2, pageWidth - margin, y - 2);
  });
  
  return y + 5;
}

/**
 * Add totals section
 */
export function addTotals(doc, totals, startY) {
  const { pageWidth, margin } = LAYOUT;
  const rightX = pageWidth - margin;
  const labelX = rightX - 60;
  
  let y = startY;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.body);
  
  // Subtotal
  doc.setTextColor(COLORS.text.secondary);
  doc.text('Subtotal:', labelX, y);
  doc.setFont(FONTS.bold);
  doc.setTextColor(COLORS.text.primary);
  doc.text(formatCurrency(totals.subtotal), rightX, y, { align: 'right' });
  
  // Tax
  if (totals.tax_amount > 0) {
    y += 6;
    doc.setFont(FONTS.regular);
    doc.setTextColor(COLORS.text.secondary);
    doc.text(`Tax (${totals.tax_rate || 0}%):`, labelX, y);
    doc.setFont(FONTS.bold);
    doc.setTextColor(COLORS.text.primary);
    doc.text(formatCurrency(totals.tax_amount), rightX, y, { align: 'right' });
  }
  
  // Total
  y += 10;
  doc.setFillColor(COLORS.bg.total);
  doc.rect(labelX - 5, y - 5, 65, 10, 'F');
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.subtitle);
  doc.setTextColor(COLORS.text.primary);
  doc.text('TOTAL:', labelX, y + 2);
  doc.text(formatCurrency(totals.total), rightX, y + 2, { align: 'right' });
  
  y += 12;
  
  // Amount Paid (invoices only)
  if (totals.amount_paid !== undefined && totals.amount_paid > 0) {
    doc.setFont(FONTS.regular);
    doc.setFontSize(FONTS.sizes.body);
    doc.setTextColor(COLORS.status.paid);
    doc.text('Amount Paid:', labelX, y);
    doc.text(`-${formatCurrency(totals.amount_paid)}`, rightX, y, { align: 'right' });
    y += 6;
  }
  
  // Balance Due (invoices only)
  if (totals.balance !== undefined && totals.balance > 0) {
    doc.setFillColor(COLORS.primary);
    doc.rect(labelX - 5, y - 4, 65, 10, 'F');
    
    doc.setFont(FONTS.bold);
    doc.setFontSize(FONTS.sizes.subtitle);
    doc.setTextColor(255, 255, 255);
    doc.text('Balance Due:', labelX, y + 2);
    doc.text(formatCurrency(totals.balance), rightX, y + 2, { align: 'right' });
    y += 10;
  }
  
  return y;
}

/**
 * Add notes section
 */
export function addNotes(doc, notes, startY) {
  if (!notes || notes.trim() === '') return startY;
  
  const { margin, pageWidth } = LAYOUT;
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.text.primary);
  doc.text('NOTES:', margin, startY);
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.secondary);
  
  const noteLines = doc.splitTextToSize(notes, pageWidth - (margin * 2));
  doc.text(noteLines, margin, startY + 5);
  
  return startY + 5 + (noteLines.length * 4) + 5;
}

/**
 * Add terms section
 */
export function addTerms(doc, terms, startY) {
  const { margin, pageWidth } = LAYOUT;
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.text.primary);
  doc.text('TERMS & CONDITIONS:', margin, startY);
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.text.secondary);
  
  const termsText = terms || getDefaultTerms();
  const termsLines = doc.splitTextToSize(termsText, pageWidth - (margin * 2));
  doc.text(termsLines, margin, startY + 5);
  
  return startY + 5 + (termsLines.length * 4);
}

/**
 * Get default terms
 */
function getDefaultTerms() {
  return `Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest. Client responsible for collection costs. Report discrepancies within 5 days in writing.`;
}