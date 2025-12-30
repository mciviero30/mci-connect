/**
 * GENERATE QUOTE PDF - Matches QuoteDocument.jsx design exactly
 * Professional quote PDF generation with MCI branding
 */

import { jsPDF } from 'jspdf';

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
  if (!quote.items || quote.items.length === 0) {
    throw new Error('Cannot generate PDF: Quote has no items');
  }
  if (!quote.customer_name) {
    throw new Error('Cannot generate PDF: Customer name is required');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // ========== HEADER: Black gradient with logo and QUOTE title ==========
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Logo text "MCI" (placeholder for actual logo)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('MCI', margin, 15);
  
  // QUOTE title (right aligned)
  doc.setFontSize(24);
  doc.text('QUOTE', pageWidth - margin, 20, { align: 'right' });
  
  y = 45;

  // ========== TWO COLUMN LAYOUT: Company Info + Quote Details ==========
  const col1Width = contentWidth * 0.5;
  const col2X = margin + col1Width + 10;

  // LEFT COLUMN: Company info + Bill To
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Modern Components Installation', margin, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  y += 5;
  doc.text('2414 Meadow Isle Ln, Lawrenceville GA 30043', margin, y);
  y += 4;
  doc.text('Phone: 470-209-3783', margin, y);
  
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('BILL TO:', margin, y);
  
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text(String(quote.customer_name || 'N/A'), margin, y);

  // RIGHT COLUMN: Quote#, Date, Valid Until
  const labelX = col2X;
  const valueX = pageWidth - margin;
  let rightY = 45;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Quote #', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(quote.quote_number || 'DRAFT'), valueX, rightY, { align: 'right' });
  doc.setDrawColor(220, 220, 220);
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  rightY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Date', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const quoteDate = formatDateShort(quote.quote_date || quote.created_date);
  doc.text(String(quoteDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  rightY += 7;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Valid Until', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const validDate = formatDateShort(quote.valid_until);
  doc.text(String(validDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);

  y += 15;

  // ========== JOB DETAILS ==========
  if (quote.job_name) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Job Details:', margin, y);
    
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(String(quote.job_name), margin, y);
    
    if (quote.job_address) {
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 60, 60);
      const addressLines = doc.splitTextToSize(String(quote.job_address), contentWidth);
      doc.text(addressLines, margin, y);
      y += addressLines.length * 4;
    }
    
    y += 5;
  }

  // ========== ITEMS TABLE ==========
  // Table header with black gradient
  const tableHeaderY = y;
  doc.setFillColor(0, 0, 0);
  doc.rect(margin, tableHeaderY, contentWidth, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  
  const colX1 = margin + 2;
  const colX2 = margin + 10;
  const colX3 = margin + contentWidth - 55;
  const colX4 = margin + contentWidth - 35;
  const colX5 = margin + contentWidth - 2;
  
  doc.text('#', colX1, tableHeaderY + 5);
  doc.text('ITEM & DESCRIPTION', colX2, tableHeaderY + 5);
  doc.text('QTY', colX3, tableHeaderY + 5, { align: 'right' });
  doc.text('RATE', colX4, tableHeaderY + 5, { align: 'right' });
  doc.text('AMOUNT', colX5, tableHeaderY + 5, { align: 'right' });
  
  y = tableHeaderY + 10;

  // Table rows
  quote.items.forEach((item, index) => {
    const itemNum = String(index + 1);
    const itemName = String(item.item_name || item.description || '');
    const itemDesc = item.item_name && item.description ? String(item.description) : '';
    const qty = `${item.quantity || 0} ${item.unit || ''}`;
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    // Calculate row height based on text
    const nameLines = doc.splitTextToSize(itemName, contentWidth - 70);
    const descLines = itemDesc ? doc.splitTextToSize(itemDesc, contentWidth - 70) : [];
    const totalLines = nameLines.length + (descLines.length > 0 ? descLines.length + 1 : 0);
    const rowHeight = Math.max(10, totalLines * 4 + 4);

    // Check if we need a new page
    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
      // Re-render table header
      doc.setFillColor(0, 0, 0);
      doc.rect(margin, y, contentWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('#', colX1, y + 5);
      doc.text('ITEM & DESCRIPTION', colX2, y + 5);
      doc.text('QTY', colX3, y + 5, { align: 'right' });
      doc.text('RATE', colX4, y + 5, { align: 'right' });
      doc.text('AMOUNT', colX5, y + 5, { align: 'right' });
      y += 10;
    }

    const rowStartY = y;

    // Item number (gray)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(itemNum, colX1, y + 3);

    // Item Name (bold)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(nameLines, colX2, y + 3);
    
    let descY = y + 3 + (nameLines.length * 4);
    
    // Description (normal, smaller)
    if (descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(80, 80, 80);
      doc.text(descLines, colX2, descY);
    }

    // Qty, Rate, Amount (aligned top)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(qty, colX3, y + 3, { align: 'right' });
    doc.text(rate, colX4, y + 3, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.text(total, colX5, y + 3, { align: 'right' });

    // Bottom border
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  // ========== NOTES (if present) ==========
  if (quote.notes && quote.notes.trim()) {
    y += 8;
    if (y > 240) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Notes', margin, y);
    
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const notesLines = doc.splitTextToSize(String(quote.notes), contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 5;
  }

  // ========== TOTALS (right aligned) ==========
  y += 5;
  const totalsX = pageWidth - margin - 60;
  const valuesX = pageWidth - margin;
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text('Sub Total', totalsX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`$${Number(quote.subtotal || 0).toFixed(2)}`, valuesX, y, { align: 'right' });
  
  if ((quote.tax_amount || 0) > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Tax (${quote.tax_rate || 0}%)`, totalsX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`$${Number(quote.tax_amount || 0).toFixed(2)}`, valuesX, y, { align: 'right' });
  }
  
  y += 8;
  // TOTAL box with light gradient background
  doc.setFillColor(240, 245, 250);
  doc.rect(totalsX - 5, y - 5, 65, 10, 'F');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, y - 5, totalsX + 60, y - 5);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', totalsX, y + 2);
  doc.setFontSize(13);
  doc.text(`$${Number(quote.total || 0).toFixed(2)}`, valuesX, y + 2, { align: 'right' });

  // ========== TERMS & CONDITIONS ==========
  y += 15;
  if (y > 240) {
    doc.addPage();
    y = margin;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, y);
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(60, 60, 60);
  
  const terms = [
    '• PO required to schedule work.',
    '• Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment. Site access issues may require revised quote.',
    '• Regular hours only. OT/after-hours billed separately via Change Order.'
  ];
  
  terms.forEach(term => {
    const termLines = doc.splitTextToSize(term, contentWidth);
    doc.text(termLines, margin, y);
    y += termLines.length * 4 + 1;
  });

  return doc;
}

/**
 * Format date as MM.dd.yy
 */
function formatDateShort(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${month}.${day}.${year}`;
  } catch {
    return dateString;
  }
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