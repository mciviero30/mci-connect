/**
 * PDF HELPERS - Reusable Functions
 * Shared components for Quote and Invoice PDF generation
 */

import { jsPDF } from 'jspdf';
import { 
  PAGE, 
  COLORS, 
  FONTS, 
  COMPANY_INFO, 
  DEFAULTS,
  formatCurrency,
  formatDate,
  getContentWidth,
  getMaxY
} from './pdfConfig';

/**
 * INIT DOCUMENT
 * Creates and returns a jsPDF instance with default settings
 */
export function initDocument() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  
  // Set default font
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.body);
  
  return doc;
}

/**
 * ADD HEADER
 * Dark header with logo text and document title
 * @returns {number} Y position after header
 */
export function addHeader(doc, title = 'DOCUMENT') {
  const margin = Number(PAGE.margin?.left || 20);
  const width = Number(PAGE.width || 210);
  const height = Number(DEFAULTS.headerHeight || 35);
  const titleSize = Number(FONTS.sizes?.title || 20);
  
  // Dark background
  doc.setFillColor(COLORS.headerBg || '#000000');
  doc.rect(0, 0, width, height, 'F');
  
  // MCI Logo (text-based)
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setFontSize(titleSize);
  doc.setTextColor(COLORS.white || '#ffffff');
  doc.text(String(COMPANY_INFO.shortName || 'MCI'), margin, 15);
  
  // Document Title (right aligned)
  doc.setFontSize(titleSize);
  doc.text(String(title || 'DOCUMENT'), width - margin, 15, { align: 'right' });
  
  return Number(height + 5);
}

/**
 * ADD COMPANY INFO
 * Renders MCI company information
 * @returns {number} New Y position
 */
export function addCompanyInfo(doc, startY) {
  const margin = Number(PAGE.margin?.left || 20);
  let y = Number(startY || 40);
  const lineSpacing = Number(DEFAULTS.lineSpacing || 5);
  
  // Company name
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setFontSize(Number(FONTS.sizes?.body || 10));
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text(String(COMPANY_INFO.name || ''), margin, y);
  y += lineSpacing;
  
  // Address
  doc.setFont(FONTS.regular || 'helvetica');
  doc.setFontSize(Number(FONTS.sizes?.small || 8));
  doc.setTextColor(COLORS.textSecondary || '#6b7280');
  doc.text(String(COMPANY_INFO.address || ''), margin, y);
  y += 4;
  
  // City, State, Zip
  doc.text(String(`${COMPANY_INFO.city || ''}, ${COMPANY_INFO.state || ''} ${COMPANY_INFO.zip || ''}`), margin, y);
  y += 4;
  
  // Phone
  doc.text(String(`Phone: ${COMPANY_INFO.phone || ''}`), margin, y);
  y += 4;
  
  // Email
  doc.text(String(`Email: ${COMPANY_INFO.email || ''}`), margin, y);
  y += lineSpacing + 3;
  
  return Number(y);
}

/**
 * ADD CUSTOMER INFO
 * Renders billing information
 * @param {object} customer - { name, address, phone, email }
 * @returns {number} New Y position
 */
export function addCustomerInfo(doc, customer, startY) {
  const margin = Number(PAGE.margin?.left || 20);
  let y = Number(startY || 40);
  const lineSpacing = Number(DEFAULTS.lineSpacing || 5);
  const customerData = customer || {};
  
  // "BILL TO:" label
  doc.setFont(FONTS.regular || 'helvetica');
  doc.setFontSize(Number(FONTS.sizes?.small || 8));
  doc.setTextColor(COLORS.textSecondary || '#6b7280');
  doc.text('BILL TO:', margin, y);
  y += 5;
  
  // Customer name
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setFontSize(Number(FONTS.sizes?.subtitle || 14));
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text(String(customerData.name || 'N/A'), margin, y);
  y += 6;
  
  // Address (if provided)
  if (customerData.address) {
    doc.setFont(FONTS.regular || 'helvetica');
    doc.setFontSize(Number(FONTS.sizes?.small || 8));
    doc.setTextColor(COLORS.textSecondary || '#6b7280');
    const addressLines = doc.splitTextToSize(String(customerData.address), getContentWidth() * 0.5);
    doc.text(addressLines, margin, y);
    y += addressLines.length * 4;
  }
  
  // Phone (if provided)
  if (customerData.phone) {
    doc.text(String(`Phone: ${customerData.phone}`), margin, y);
    y += 4;
  }
  
  // Email (if provided)
  if (customerData.email) {
    doc.text(String(`Email: ${customerData.email}`), margin, y);
    y += 4;
  }
  
  y += lineSpacing;
  return Number(y);
}

/**
 * ADD TABLE HEADER
 * Renders table column headers with background
 * @param {array} columns - Array of column labels
 * @returns {number} New Y position
 */
export function addTableHeader(doc, columns, startY) {
  const margin = PAGE.margin.left || 20;
  const contentWidth = getContentWidth();
  const colWidth = contentWidth / columns.length;
  
  // Header background
  doc.setFillColor(COLORS.tableHeaderBg);
  doc.rect(margin, startY - 2, contentWidth, DEFAULTS.rowHeight, 'F');
  
  // Header text
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.textPrimary);
  
  columns.forEach((col, index) => {
    const x = margin + (colWidth * index) + DEFAULTS.tablePadding;
    doc.text(col, x, startY + 3);
  });
  
  // Border line
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, startY + DEFAULTS.rowHeight - 2, PAGE.width - margin, startY + DEFAULTS.rowHeight - 2);
  
  return startY + DEFAULTS.rowHeight;
}

/**
 * ADD TABLE ROW
 * Renders a single table row with text wrapping
 * @param {array} row - Array of cell values
 * @param {array} columnWidths - Width in mm for each column
 * @returns {number} New Y position
 */
export function addTableRow(doc, row, columnWidths, startY) {
  const margin = PAGE.margin.left || 20;
  let y = startY;
  let maxRowHeight = DEFAULTS.rowHeight;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.textPrimary);
  
  // Calculate row height based on text wrapping
  row.forEach((cell, index) => {
    const cellText = String(cell || '');
    const lines = doc.splitTextToSize(cellText, columnWidths[index] - (DEFAULTS.tablePadding * 2));
    const cellHeight = lines.length * 4 + 4;
    if (cellHeight > maxRowHeight) {
      maxRowHeight = cellHeight;
    }
  });
  
  // Zebra striping (optional light background)
  if (Math.floor(startY / DEFAULTS.rowHeight) % 2 === 0) {
    doc.setFillColor(COLORS.tableBg);
    doc.rect(margin, y, getContentWidth(), maxRowHeight, 'F');
  }
  
  // Render cells
  let xPos = margin;
  row.forEach((cell, index) => {
    const cellText = String(cell || '');
    const lines = doc.splitTextToSize(cellText, columnWidths[index] - (DEFAULTS.tablePadding * 2));
    doc.text(lines, xPos + DEFAULTS.tablePadding, y + 5);
    xPos += columnWidths[index];
  });
  
  // Bottom border
  doc.setDrawColor(COLORS.lightGray);
  doc.line(margin, y + maxRowHeight, PAGE.width - margin, y + maxRowHeight);
  
  return y + maxRowHeight;
}

/**
 * CHECK PAGE BREAK
 * Adds new page if Y position exceeds threshold
 * @returns {number} New Y position (reset if page added)
 */
export function checkPageBreak(doc, currentY, requiredSpace = 30) {
  const maxY = getMaxY();
  
  if (currentY + requiredSpace > maxY) {
    doc.addPage();
    // Re-add header on new page
    return addHeader(doc, 'CONTINUED') + 5;
  }
  
  return currentY;
}

/**
 * ADD TOTALS
 * Renders subtotal, tax, and total with background
 * @param {object} totals - { subtotal, tax_rate, tax_amount, total }
 * @returns {number} New Y position
 */
export function addTotals(doc, totals, startY) {
  const width = Number(PAGE.width || 210);
  const margin = Number(PAGE.margin?.right || 20);
  const rightX = width - margin;
  const labelX = rightX - 60;
  let y = Number(startY || 100) + 5;
  const totalsData = totals || {};
  
  doc.setFont(FONTS.regular || 'helvetica');
  doc.setFontSize(Number(FONTS.sizes?.body || 10));
  
  // Subtotal
  doc.setTextColor(COLORS.textSecondary || '#6b7280');
  doc.text('Subtotal:', labelX, y);
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text(String(formatCurrency(totalsData.subtotal)), rightX, y, { align: 'right' });
  
  // Tax (if applicable)
  if (totalsData.tax_amount && totalsData.tax_amount > 0) {
    y += 6;
    doc.setFont(FONTS.regular || 'helvetica');
    doc.setTextColor(COLORS.textSecondary || '#6b7280');
    doc.text(String(`Tax (${totalsData.tax_rate || 0}%):`), labelX, y);
    doc.setFont(FONTS.bold || 'helvetica-bold');
    doc.setTextColor(COLORS.textPrimary || '#111827');
    doc.text(String(formatCurrency(totalsData.tax_amount)), rightX, y, { align: 'right' });
  }
  
  // Total (with background)
  y += 8;
  doc.setFillColor(COLORS.totalsBg || '#e5e7eb');
  doc.rect(labelX - 5, y - 5, 65, 10, 'F');
  
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setFontSize(Number(FONTS.sizes?.subtitle || 14));
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text('TOTAL:', labelX, y + 2);
  doc.text(String(formatCurrency(totalsData.total)), rightX, y + 2, { align: 'right' });
  
  return Number(y + 12);
}

/**
 * ADD NOTES SECTION
 * Renders notes with word wrap
 * @returns {number} New Y position
 */
export function addNotes(doc, notes, startY) {
  if (!notes || notes.trim() === '') return startY;
  
  const margin = PAGE.margin.left || 20;
  let y = startY + 5;
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.textPrimary);
  doc.text('NOTES:', margin, y);
  y += 5;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.textSecondary);
  const noteLines = doc.splitTextToSize(notes, getContentWidth());
  doc.text(noteLines, margin, y);
  
  return y + (noteLines.length * 4) + 5;
}

/**
 * ADD TERMS SECTION
 * Renders terms and conditions
 * @returns {number} New Y position
 */
export function addTerms(doc, terms, startY) {
  const margin = PAGE.margin.left || 20;
  let y = startY + 5;
  
  doc.setFont(FONTS.bold);
  doc.setFontSize(FONTS.sizes.body);
  doc.setTextColor(COLORS.textPrimary);
  doc.text('TERMS & CONDITIONS:', margin, y);
  y += 5;
  
  doc.setFont(FONTS.regular);
  doc.setFontSize(FONTS.sizes.small);
  doc.setTextColor(COLORS.textSecondary);
  
  const termsText = terms || getDefaultTerms();
  const termsLines = doc.splitTextToSize(termsText, getContentWidth());
  doc.text(termsLines, margin, y);
  
  return y + (termsLines.length * 4);
}

/**
 * DEFAULT TERMS
 */
function getDefaultTerms() {
  return 'Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest. Client responsible for collection costs. Report discrepancies within 5 days in writing.';
}

/**
 * ADD DOCUMENT INFO (top-right corner)
 * Renders document number, dates, etc.
 * @param {object} info - { label, number, date, secondLabel, secondDate }
 * @returns {number} New Y position
 */
export function addDocumentInfo(doc, info, startY) {
  const width = Number(PAGE.width || 210);
  const marginRight = Number(PAGE.margin?.right || 20);
  const rightX = width - marginRight;
  const labelX = rightX - 50;
  let y = Number(startY || 40);
  const infoData = info || {};
  
  doc.setFont(FONTS.regular || 'helvetica');
  doc.setFontSize(Number(FONTS.sizes?.small || 8));
  
  // Document number
  doc.setTextColor(COLORS.textSecondary || '#6b7280');
  doc.text(String(infoData.label || 'Number:'), labelX, y);
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text(String(infoData.number || 'N/A'), rightX, y, { align: 'right' });
  
  // Date
  y += 5;
  doc.setFont(FONTS.regular || 'helvetica');
  doc.setTextColor(COLORS.textSecondary || '#6b7280');
  doc.text('Date:', labelX, y);
  doc.setFont(FONTS.bold || 'helvetica-bold');
  doc.setTextColor(COLORS.textPrimary || '#111827');
  doc.text(String(formatDate(infoData.date) || ''), rightX, y, { align: 'right' });
  
  // Second date (if provided)
  if (infoData.secondLabel && infoData.secondDate) {
    y += 5;
    doc.setFont(FONTS.regular || 'helvetica');
    doc.setTextColor(COLORS.textSecondary || '#6b7280');
    doc.text(String(infoData.secondLabel), labelX, y);
    doc.setFont(FONTS.bold || 'helvetica-bold');
    doc.setTextColor(COLORS.textPrimary || '#111827');
    doc.text(String(formatDate(infoData.secondDate) || ''), rightX, y, { align: 'right' });
  }
  
  return Number(y + 8);
}