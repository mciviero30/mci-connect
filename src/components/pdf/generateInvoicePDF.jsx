/**
 * GENERATE INVOICE PDF - Matches QuoteDocument.jsx design exactly
 * Professional invoice PDF generation with MCI branding
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
 * Generate Invoice PDF
 * @param {Object} invoice - Invoice data
 * @returns {Promise<jsPDF>} - PDF document
 */
export async function generateInvoicePDF(invoice) {
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
  const logoEndX = 60;
  
  // Parte 1: Negro sólido para cubrir el logo
  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, Number(logoEndX), Number(headerHeight), 'F');
  
  // Parte 2: Gradiente de negro a gris desde el logo hasta el final
  const gradientWidth = pageWidth - logoEndX;
  const gradientSteps = 50;
  for (let i = 0; i < gradientSteps; i++) {
    const gray = Math.floor((i / gradientSteps) * 130);
    doc.setFillColor(gray, gray, gray);
    const rectX = Number(logoEndX + (i * gradientWidth) / gradientSteps);
    const rectWidth = Number(gradientWidth / gradientSteps);
    doc.rect(rectX, 0, rectWidth, Number(headerHeight), 'F');
  }
  
  // Load and add MCI logo
  const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png';
  const logoBase64 = await loadImageAsBase64(logoUrl);
  
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 5, 35, 15);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MCI', margin, 15);
  }
  
  // INVOICE title (right aligned, white)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageWidth - margin, 17, { align: 'right' });
  
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
  doc.text(String(invoice.customer_name || 'N/A'), margin, y);

  // RIGHT COLUMN: Invoice details
  const labelX = col2X;
  const valueX = pageWidth - margin;
  let rightY = 35;
  
  // Invoice #
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Invoice#', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(invoice.invoice_number || 'DRAFT'), valueX, rightY, { align: 'right' });
  doc.setDrawColor(230, 230, 230);
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  // Date
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Date', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const invoiceDate = formatDateShort(invoice.invoice_date || invoice.created_date);
  doc.text(String(invoiceDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
  // Due Date
  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Due Date', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  const dueDate = formatDateShort(invoice.due_date);
  doc.text(String(dueDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);

  y += 20;

  // ========== JOB DETAILS ==========
  if (invoice.job_name) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Job Details :', margin, y);
    
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(String(invoice.job_name), margin, y);
    
    if (invoice.job_address) {
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(70, 70, 70);
      const addressLines = doc.splitTextToSize(String(invoice.job_address), contentWidth);
      doc.text(addressLines, margin, y);
      y += addressLines.length * 4;
    }
    
    y += 8;
  }

  // ========== ITEMS TABLE ==========
  const tableHeaderY = y;
  const tableHeaderHeight = 7;
  const tableGradientSteps = 30;
  for (let i = 0; i < tableGradientSteps; i++) {
    const gray = Math.floor((i / tableGradientSteps) * 120);
    doc.setFillColor(gray, gray, gray);
    const rectX = Number(margin + (i * contentWidth) / tableGradientSteps);
    const rectWidth = Number(contentWidth / tableGradientSteps);
    doc.rect(rectX, Number(tableHeaderY), rectWidth, Number(tableHeaderHeight), 'F');
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
  invoice.items.forEach((item, index) => {
    const itemNum = String(index + 1);
    
    const itemName = item.item_name || '';
    const itemDesc = item.description || '';
    
    const qty = `${item.quantity || 0} ${item.unit || ''}`;
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    const nameLines = itemName ? doc.splitTextToSize(String(itemName), contentWidth - 80) : [];
    const descLines = itemDesc ? doc.splitTextToSize(String(itemDesc), contentWidth - 80) : [];
    const rowHeight = Math.max(8, (nameLines.length + descLines.length) * 4 + 6);

    // Check page break
    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
      // Re-render header with gradient
      for (let i = 0; i < tableGradientSteps; i++) {
        const gray = Math.floor((i / tableGradientSteps) * 120);
        doc.setFillColor(gray, gray, gray);
        const rectX = Number(margin + (i * contentWidth) / tableGradientSteps);
        const rectWidth = Number(contentWidth / tableGradientSteps);
        doc.rect(rectX, Number(y), rectWidth, 7, 'F');
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

    // Zebra striping
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(Number(margin), Number(y), Number(contentWidth), Number(rowHeight), 'F');
    }

    // Item number (light gray)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(itemNum, numCol, y + 4);

    let textY = y + 4;
    
    // Item Name (bold, black)
    if (nameLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(nameLines, itemCol, textY);
      textY += nameLines.length * 4;
    }
    
    // Description below (normal, dark gray)
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
  doc.text(`$${Number(invoice.subtotal || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  
  // Tax (if applicable)
  if ((invoice.tax_amount || 0) > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Tax (${invoice.tax_rate || 0}%)`, totalsLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`$${Number(invoice.tax_amount || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }
  
  // TOTAL (with gray background and top border)
  y += 8;
  doc.setFillColor(220, 225, 230);
  doc.rect(Number(totalsLabelX - 8), Number(y - 6), 58, 12, 'F');
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.8);
  doc.line(totalsLabelX - 8, y - 6, totalsLabelX + 50, y - 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL', totalsLabelX, y + 2);
  doc.setFontSize(14);
  doc.text(`$${Number(invoice.total || 0).toFixed(2)}`, totalsValueX, y + 2, { align: 'right' });
  
  // Amount Paid (if applicable)
  if ((invoice.amount_paid || 0) > 0) {
    y += 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Amount Paid', totalsLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(34, 197, 94);
    doc.text(`$${Number(invoice.amount_paid || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }
  
  // Balance Due (if applicable)
  if (invoice.balance !== undefined && invoice.balance !== invoice.total) {
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Balance Due', totalsLabelX, y);
    doc.setTextColor(invoice.balance > 0 ? 220 : 34, invoice.balance > 0 ? 38 : 197, invoice.balance > 0 ? 38 : 94);
    doc.text(`$${Number(invoice.balance || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }

  // ========== NOTES (if applicable) ==========
  if (invoice.notes && invoice.notes.trim()) {
    y += 18;
    if (y > 240) {
      doc.addPage();
      y = margin;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text('Notes', margin, y);
    
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    const notesLines = doc.splitTextToSize(String(invoice.notes), contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 4;
  }

  // ========== TERMS & CONDITIONS ==========
  y += 10;
  if (y > 240) {
    doc.addPage();
    y = margin;
  }
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, y);
  
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(70, 70, 70);
  const termsText = invoice.terms || 'Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest.';
  const termsLines = doc.splitTextToSize(String(termsText), contentWidth);
  doc.text(termsLines, margin, y);

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
 * Download Invoice PDF
 */
export async function downloadInvoicePDF(invoice) {
  const doc = await generateInvoicePDF(invoice);
  const customerName = (invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const invoiceNumber = (invoice.invoice_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  const filename = `Invoice-${invoiceNumber}-${customerName}.pdf`;
  doc.save(filename);
}

/**
 * Get Invoice PDF as blob
 */
export async function getInvoicePDFBlob(invoice) {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('blob');
}

/**
 * Get Invoice PDF as data URI
 */
export async function getInvoicePDFDataURI(invoice) {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('dataurlstring');
}