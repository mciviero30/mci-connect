/**
 * GENERATE QUOTE PDF - Matches QuoteDocument.jsx design exactly
 * Professional quote PDF generation with MCI branding
 */

import { jsPDF } from 'jspdf';

/**
 * Load image and convert to base64
 */
async function loadImageAsBase64(url) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error loading image:', error);
    return null;
  }
}

/**
 * Generate Quote PDF
 * @param {Object} quote - Quote data
 * @returns {Promise<jsPDF>} - PDF document
 */
export async function generateQuotePDF(quote) {
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

  // ========== HEADER: Black solid until logo ends, then gradient to gray ==========
  const headerHeight = 25;
  const logoEndX = 60; // Negro sólido hasta donde termina el logo
  
  // Parte 1: Negro sólido para cubrir el logo
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, logoEndX, headerHeight, 'F');
  
  // Parte 2: Gradiente de negro a gris desde el logo hasta el final
  const gradientWidth = pageWidth - logoEndX;
  const gradientSteps = 50;
  for (let i = 0; i < gradientSteps; i++) {
    const gray = Math.floor((i / gradientSteps) * 130); // 0 a 130 (negro a gris claro)
    doc.setFillColor(gray, gray, gray);
    doc.rect(logoEndX + (i * gradientWidth) / gradientSteps, 0, gradientWidth / gradientSteps, headerHeight, 'F');
  }
  
  // Load and add MCI logo
  const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png';
  const logoBase64 = await loadImageAsBase64(logoUrl);
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 5, 35, 15);
  } else {
    // Fallback to text if logo fails
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MCI', margin, 15);
  }
  
  // QUOTE title (right aligned, white)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTE', pageWidth - margin, 17, { align: 'right' });
  
  y = 35;

  // ========== TWO COLUMN LAYOUT ==========
  const col1Width = contentWidth * 0.5;
  const col2X = margin + col1Width + 10;

  // LEFT COLUMN: Company info
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text('Modern Components Installation', margin, y);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  y += 5;
  doc.text('2414 Meadow Isle Ln, Lawrenceville GA 30043', margin, y);
  y += 4;
  doc.text('Phone: 470-209-3783', margin, y);
  
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(59, 130, 246);
  doc.text('BILL TO:', margin, y);
  
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.text(String(quote.customer_name || 'N/A'), margin, y);

  // RIGHT COLUMN: Quote details
  const labelX = col2X;
  const valueX = pageWidth - margin;
  let rightY = 35;
  
  // Quote #
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Quote#', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(quote.quote_number || 'DRAFT'), valueX, rightY, { align: 'right' });
  doc.setDrawColor(230, 230, 230);
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  // Date
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Date', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const quoteDate = formatDateShort(quote.quote_date || quote.created_date);
  doc.text(String(quoteDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  // Valid Until
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Valid Until', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const validDate = formatDateShort(quote.valid_until);
  doc.text(String(validDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);

  y += 20;

  // ========== JOB DETAILS ==========
  if (quote.job_name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Job Details :', margin, y);
    
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(String(quote.job_name), margin, y);
    
    if (quote.job_address) {
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const addressLines = doc.splitTextToSize(String(quote.job_address), contentWidth);
      doc.text(addressLines, margin, y);
      y += addressLines.length * 4;
    }
    
    y += 8;
  }

  // ========== ITEMS TABLE ==========
  const tableHeaderY = y;
  // Black to gray gradient (horizontal left to right)
  const tableHeaderHeight = 7;
  const tableGradientSteps = 30;
  for (let i = 0; i < tableGradientSteps; i++) {
    const gray = Math.floor((i / tableGradientSteps) * 120); // 0 to 120
    doc.setFillColor(gray, gray, gray);
    doc.rect(margin + (i * contentWidth) / tableGradientSteps, tableHeaderY, contentWidth / tableGradientSteps, tableHeaderHeight, 'F');
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  
  const numCol = margin + 3;
  const itemCol = margin + 12;
  const qtyCol = pageWidth - margin - 55;
  const rateCol = pageWidth - margin - 35;
  const amountCol = pageWidth - margin - 3;
  
  doc.text('#', numCol, tableHeaderY + 4.5);
  doc.text('ITEM & DESCRIPTION', itemCol, tableHeaderY + 4.5);
  doc.text('QTY', qtyCol, tableHeaderY + 4.5, { align: 'right' });
  doc.text('RATE', rateCol, tableHeaderY + 4.5, { align: 'right' });
  doc.text('AMOUNT', amountCol, tableHeaderY + 4.5, { align: 'right' });
  
  y = tableHeaderY + 9;

  // Table rows - Zebra striping
  quote.items.forEach((item, index) => {
    const itemNum = String(index + 1);
    const itemName = String(item.item_name || ''); // Nombre del ítem (bold)
    const itemDesc = String(item.description || ''); // Descripción (normal)
    const qty = `${item.quantity || 0} ${item.unit || ''}`;
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    // Calculate row height
    const nameLines = itemName ? doc.splitTextToSize(itemName, contentWidth - 80) : [];
    const descLines = itemDesc ? doc.splitTextToSize(itemDesc, contentWidth - 80) : [];
    const rowHeight = Math.max(8, (nameLines.length + descLines.length) * 4 + 6);

    // Check page break
    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
      // Re-render header with gradient
      for (let i = 0; i < tableGradientSteps; i++) {
        const gray = Math.floor((i / tableGradientSteps) * 120);
        doc.setFillColor(gray, gray, gray);
        doc.rect(margin + (i * contentWidth) / tableGradientSteps, y, contentWidth / tableGradientSteps, 7, 'F');
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text('#', numCol, y + 4.5);
      doc.text('ITEM & DESCRIPTION', itemCol, y + 4.5);
      doc.text('QTY', qtyCol, y + 4.5, { align: 'right' });
      doc.text('RATE', rateCol, y + 4.5, { align: 'right' });
      doc.text('AMOUNT', amountCol, y + 4.5, { align: 'right' });
      y += 9;
    }

    // Zebra striping (light gray for even rows)
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, y, contentWidth, rowHeight, 'F');
    }

    // Item number (light gray)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(itemNum, numCol, y + 4);

    let textY = y + 4;
    
    // Item Name (bold, black) - solo si existe
    if (nameLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(nameLines, itemCol, textY);
      textY += nameLines.length * 4;
    }
    
    // Description below (normal, dark gray) - solo si existe
    if (descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(descLines, itemCol, textY);
    }

    // Qty, Rate, Amount (top-aligned)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(qty, qtyCol, y + 4, { align: 'right' });
    doc.text(rate, rateCol, y + 4, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(total, amountCol, y + 4, { align: 'right' });

    // Row border
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  // ========== TOTALS ==========
  y += 8;
  const totalsLabelX = pageWidth - margin - 50;
  const totalsValueX = pageWidth - margin;
  
  // Sub Total
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Sub Total', totalsLabelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`$${Number(quote.subtotal || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  
  // Tax (if applicable)
  if ((quote.tax_amount || 0) > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Tax (${quote.tax_rate || 0}%)`, totalsLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`$${Number(quote.tax_amount || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }
  
  // TOTAL (with gray background and top border)
  y += 8;
  doc.setFillColor(220, 225, 230);
  doc.rect(totalsLabelX - 8, y - 6, 58, 12, 'F');
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(totalsLabelX - 8, y - 6, totalsLabelX + 50, y - 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', totalsLabelX, y + 2);
  doc.setFontSize(14);
  doc.text(`$${Number(quote.total || 0).toFixed(2)}`, totalsValueX, y + 2, { align: 'right' });

  // ========== TERMS & CONDITIONS ==========
  y += 18;
  if (y > 240) {
    doc.addPage();
    y = margin;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, y);
  
  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  
  const termsLabelX = margin; // Columna de títulos
  const termsContentX = margin + 25; // Columna de contenido (alineada)
  const termsMaxWidth = contentWidth - 25;
  
  // Approval
  doc.setFont('helvetica', 'bold');
  doc.text('Approval:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text('PO required to schedule work.', termsContentX, y);
  y += 6;
  
  // Offload
  doc.setFont('helvetica', 'bold');
  doc.text('Offload:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  const offloadDesc = 'Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment (forklift or lull). Site access issues may require revised quote.';
  const offloadLines = doc.splitTextToSize(offloadDesc, termsMaxWidth);
  offloadLines.forEach((line, i) => {
    doc.text(line, termsContentX, y + (i * 4));
  });
  y += offloadLines.length * 4 + 2;
  
  // Hours
  doc.setFont('helvetica', 'bold');
  doc.text('Hours:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  const hoursDesc = 'Regular hours only. OT/after-hours billed separately via Change Order unless otherwise specified.';
  const hoursLines = doc.splitTextToSize(hoursDesc, termsMaxWidth);
  hoursLines.forEach((line, i) => {
    doc.text(line, termsContentX, y + (i * 4));
  });
  y += hoursLines.length * 4;

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
export async function downloadQuotePDF(quote) {
  const doc = await generateQuotePDF(quote);
  const customerName = (quote.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const quoteNumber = (quote.quote_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Quote-${quoteNumber}-${customerName}.pdf`;
  doc.save(filename);
}

/**
 * Get Quote PDF as blob
 */
export async function getQuotePDFBlob(quote) {
  const doc = await generateQuotePDF(quote);
  return doc.output('blob');
}

/**
 * Get Quote PDF as data URI
 */
export async function getQuotePDFDataURI(quote) {
  const doc = await generateQuotePDF(quote);
  return doc.output('dataurlstring');
}