/**
 * GENERATE QUOTE PDF - Matches QuoteDocument.jsx design exactly
 * Professional quote PDF generation with MCI branding
 */

import { jsPDF } from 'jspdf';

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

export async function generateQuotePDF(quote) {
  if (!quote) throw new Error('Cannot generate PDF: Quote data is missing');
  if (!quote.items || quote.items.length === 0) throw new Error('Cannot generate PDF: Quote has no items');
  if (!quote.customer_name) throw new Error('Cannot generate PDF: Customer name is required');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 'smart'
  });

  doc.viewerPreferences({ 'FitWindow': true, 'PrintScaling': 'None' }, true);

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // ========== HEADER ==========
  const headerHeight = 25;
  const logoEndX = 60;

  doc.setFillColor(0, 0, 0);
  doc.rect(0, 0, Number(logoEndX), Number(headerHeight), 'F');

  const gradientWidth = pageWidth - logoEndX;
  const gradientSteps = 10;
  for (let i = 0; i < gradientSteps; i++) {
    const gray = Math.floor((i / gradientSteps) * 130);
    doc.setFillColor(gray, gray, gray);
    const rectX = Number(logoEndX + (i * gradientWidth) / gradientSteps);
    const rectWidth = Number(gradientWidth / gradientSteps);
    doc.rect(rectX, 0, rectWidth, Number(headerHeight), 'F');
  }

  const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png';
  const logoBase64 = await loadImageAsBase64(logoUrl);

  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 4, 40, 17, undefined, 'SLOW');
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('MCI', margin, 15);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.text('QUOTE', pageWidth - margin, 17, { align: 'right' });

  y = 35;

  // ========== TWO COLUMN LAYOUT ==========
  const col1Width = contentWidth * 0.5;
  const col2X = margin + col1Width + 10;

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

  const labelX = col2X;
  const valueX = pageWidth - margin;
  let rightY = 35;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Quote#', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(quote.quote_number || 'DRAFT'), valueX, rightY, { align: 'right' });
  doc.setDrawColor(230, 230, 230);
  doc.line(labelX, rightY + 1, valueX, rightY + 1);

  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Date', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(formatDateShort(quote.quote_date || quote.created_date)), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);

  rightY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Valid Until', labelX, rightY);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(String(formatDateShort(quote.valid_until)), valueX, rightY, { align: 'right' });
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

    if (quote.work_details) {
      y += 5;
      const detailsLines = doc.splitTextToSize(String(quote.work_details), contentWidth - 6);
      const boxHeight = detailsLines.length * 3.5 + 4;

      const wdGradientSteps = 100;
      for (let i = 0; i < wdGradientSteps; i++) {
        const gray = 241 - Math.floor((i / wdGradientSteps) * 36);
        doc.setFillColor(gray, gray - 4, gray - 8);
        const rectX = Number(margin + (i * contentWidth) / wdGradientSteps);
        const rectWidth = Number(contentWidth / wdGradientSteps + 0.5);
        doc.rect(rectX, Number(y - 2), rectWidth, Number(boxHeight), 'F');
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(50, 50, 50);
      doc.text(detailsLines, margin + 3, y + 1.5);
      y += boxHeight + 2;
    }

    y += 8;
  }

  // ========== ITEMS TABLE ==========
  const tableHeaderY = y;
  const tableGradientSteps = 100;

  const numCol = margin + 3;
  const itemCol = margin + 12;
  const qtyCol = pageWidth - margin - 58;
  const rateCol = pageWidth - margin - 33;
  const amountCol = pageWidth - margin - 3;

  const renderTableHeader = (headerY) => {
    for (let i = 0; i < tableGradientSteps; i++) {
      const gray = Math.floor((i / tableGradientSteps) * 120);
      doc.setFillColor(gray, gray, gray);
      const rectX = Number(margin + (i * contentWidth) / tableGradientSteps);
      const rectWidth = Number(contentWidth / tableGradientSteps + 0.5);
      doc.rect(rectX, Number(headerY), rectWidth, 7, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text('#', numCol, headerY + 4.5);
    doc.text('ITEM & DESCRIPTION', itemCol, headerY + 4.5);
    doc.text('QTY', qtyCol, headerY + 4.5, { align: 'right' });
    doc.text('RATE', rateCol, headerY + 4.5, { align: 'right' });
    doc.text('AMOUNT', amountCol, headerY + 4.5, { align: 'right' });
  };

  renderTableHeader(tableHeaderY);
  y = tableHeaderY + 9;

  // ========== TABLE ROWS ==========
  for (let i = 0; i < quote.items.length; i++) {
    const item = quote.items[i];

    const itemName = item.item_name || '';
    const itemDesc = item.description || '';
    const qty = `${item.quantity || 0} ${item.unit || ''}`.trim();
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    const nameLines = itemName ? doc.splitTextToSize(String(itemName), contentWidth - 75) : [];
    const descLines = itemDesc ? doc.splitTextToSize(String(itemDesc), contentWidth - 75) : [];

    const rowStartY = y;
    const rowHeight = Math.max(10, (nameLines.length * 4) + (descLines.length * 3.5) + 8);

    // Check page break (whole row)
    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
      renderTableHeader(y);
      y += 9;
    }

    // Zebra striping — solo si cabe en la página
    if (i % 2 === 0 && y + rowHeight <= 270) {
      doc.setFillColor(250, 250, 250);
      doc.rect(Number(margin), Number(y), Number(contentWidth), Number(rowHeight), 'F');
    }

    // Item number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(String(i + 1), numCol, y + 4);

    let textY = y + 5;

    // Name lines — per-line page break
    for (const line of nameLines) {
      if (textY > 270) {
        doc.addPage();
        y = margin;
        renderTableHeader(y);
        y += 9;
        textY = y + 5;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(line, itemCol, textY);
      textY += 4;
    }

    // Desc lines — per-line page break
    for (const line of descLines) {
      if (textY > 270) {
        doc.addPage();
        y = margin;
        renderTableHeader(y);
        y += 9;
        textY = y + 5;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(line, itemCol, textY);
      textY += 3.5;
    }

    // QTY / RATE / AMOUNT — top aligned
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(qty, qtyCol, rowStartY + 4, { align: 'right' });
    doc.text(rate, rateCol, rowStartY + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(total, amountCol, rowStartY + 4, { align: 'right' });

    y = textY + 3;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
  }

  // ========== TOTALS ==========
  y += 8;
  const totalsLabelX = pageWidth - margin - 50;
  const totalsValueX = pageWidth - margin;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text('Sub Total', totalsLabelX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(`$${Number(quote.subtotal || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });

  if ((quote.tax_amount || 0) > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Tax (${quote.tax_rate || 0}%)`, totalsLabelX, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`$${Number(quote.tax_amount || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }

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
  doc.text(`$${Number(quote.total || 0).toFixed(2)}`, totalsValueX, y + 2, { align: 'right' });

  // ========== TERMS & CONDITIONS ==========
  y += 18;
  if (y > 240) { doc.addPage(); y = margin; }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text('Terms & Conditions', margin, y);

  y += 6;
  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);

  const termsLabelX = margin;
  const termsContentX = margin + 25;
  const termsMaxWidth = contentWidth - 25;

  doc.setFont('helvetica', 'bold');
  doc.text('Approval:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  doc.text('PO required to schedule work.', termsContentX, y);
  y += 6;

  doc.setFont('helvetica', 'bold');
  doc.text('Offload:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  const offloadDesc = 'Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment (forklift or lull). Site access issues may require revised quote.';
  const offloadLines = doc.splitTextToSize(offloadDesc, termsMaxWidth);
  offloadLines.forEach((line, idx) => {
    doc.text(line, termsContentX, y + (idx * 4));
  });
  y += offloadLines.length * 4 + 2;

  doc.setFont('helvetica', 'bold');
  doc.text('Hours:', termsLabelX, y);
  doc.setFont('helvetica', 'normal');
  const hoursDesc = 'Regular hours only. OT/after-hours billed separately via Change Order unless otherwise specified.';
  const hoursLines = doc.splitTextToSize(hoursDesc, termsMaxWidth);
  hoursLines.forEach((line, idx) => {
    doc.text(line, termsContentX, y + (idx * 4));
  });

  return doc;
}

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

// Safari-compatible download using doc.save()
export async function downloadQuotePDF(quote) {
  const doc = await generateQuotePDF(quote);
  const customerName = (quote.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const quoteNumber = (quote.quote_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save(`Quote-${quoteNumber}-${customerName}.pdf`);
}

export async function getQuotePDFBlob(quote) {
  const doc = await generateQuotePDF(quote);
  return doc.output('blob');
}

export async function getQuotePDFDataURI(quote) {
  const doc = await generateQuotePDF(quote);
  return doc.output('dataurlstring');
}