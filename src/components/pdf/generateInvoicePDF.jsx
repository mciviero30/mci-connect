/**
 * GENERATE INVOICE PDF - Matches QuoteDocument.jsx design exactly
 * Professional invoice PDF generation with MCI branding
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

export async function generateInvoicePDF(invoice) {
  if (!invoice) throw new Error('Cannot generate PDF: Invoice data is missing');
  if (!invoice.id) throw new Error('Cannot generate PDF: Invoice ID is required');
  if (!invoice.items || invoice.items.length === 0) throw new Error('Cannot generate PDF: Invoice has no items');
  if (!invoice.customer_name) throw new Error('Cannot generate PDF: Customer name is required');

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
  const gradientSteps = 100;
  for (let i = 0; i < gradientSteps; i++) {
    const gray = Math.floor((i / gradientSteps) * 130);
    doc.setFillColor(gray, gray, gray);
    doc.rect(Number(logoEndX + (i * gradientWidth) / gradientSteps), 0, Number(gradientWidth / gradientSteps + 0.5), Number(headerHeight), 'F');
  }

  const logoBase64 = await loadImageAsBase64('https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png');
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', margin, 4, 40, 17, undefined, 'SLOW');
  } else {
    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(255,255,255); doc.text('MCI', margin, 15);
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(28); doc.setTextColor(255,255,255);
  doc.text('INVOICE', pageWidth - margin, 17, { align: 'right' });

  y = 35;

  // ========== COMPANY + BILL TO ==========
  const col2X = margin + (contentWidth * 0.5) + 10;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0,0,0);
  doc.text('Modern Components Installation', margin, y);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80,80,80);
  y += 5; doc.text('2414 Meadow Isle Ln, Lawrenceville GA 30043', margin, y);
  y += 4; doc.text('Phone: 470-209-3783', margin, y);
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(59,130,246);
  doc.text('BILL TO:', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(0,0,0);
  doc.text(String(invoice.customer_name || 'N/A'), margin, y);

  // Right column
  const valueX = pageWidth - margin;
  let rightY = 35;
  doc.setDrawColor(230,230,230);

  [
    ['Invoice#', String(invoice.invoice_number || 'DRAFT')],
    ['Date', String(formatDateShort(invoice.invoice_date || invoice.created_date))],
    ['Due Date', String(formatDateShort(invoice.due_date))]
  ].forEach(([label, value]) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text(label, col2X, rightY);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0);
    doc.text(value, valueX, rightY, { align: 'right' });
    doc.line(col2X, rightY + 1, valueX, rightY + 1);
    rightY += 6;
  });

  y += 12;

  // ========== JOB DETAILS ==========
  if (invoice.job_name) {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100,100,100);
    doc.text('Job Details :', margin, y);
    y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0,0,0);
    doc.text(String(invoice.job_name), margin, y);
    if (invoice.job_address) {
      y += 3;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(70,70,70);
      const addrLines = doc.splitTextToSize(String(invoice.job_address), contentWidth);
      doc.text(addrLines, margin, y);
      y += addrLines.length * 4;
    }
    y += 1;
  }

  // ========== ITEMS TABLE ==========
  // NO pre-check — table always starts on current page (page 1 stays full)
  const tableHeaderHeight = 7;
  const tableGradientSteps = 100;
  const numCol = margin + 3;
  const itemCol = margin + 12;
  const qtyCol = pageWidth - margin - 55;
  const rateCol = pageWidth - margin - 35;
  const amountCol = pageWidth - margin - 3;

  const drawTableHeader = (startY) => {
    for (let i = 0; i < tableGradientSteps; i++) {
      const gray = Math.floor((i / tableGradientSteps) * 120);
      doc.setFillColor(gray, gray, gray);
      doc.rect(Number(margin + (i * contentWidth) / tableGradientSteps), Number(startY), Number(contentWidth / tableGradientSteps + 0.5), Number(tableHeaderHeight), 'F');
    }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7); doc.setTextColor(255,255,255);
    doc.text('#', numCol, startY + 4.5);
    doc.text('ITEM & DESCRIPTION', itemCol, startY + 4.5);
    doc.text('QTY', qtyCol, startY + 4.5, { align: 'right' });
    doc.text('RATE', rateCol, startY + 4.5, { align: 'right' });
    doc.text('AMOUNT', amountCol, startY + 4.5, { align: 'right' });
  };

  drawTableHeader(y);
  y += tableHeaderHeight + 2;

  invoice.items.forEach((item, index) => {
    const nameLines = item.item_name ? doc.splitTextToSize(String(item.item_name), contentWidth - 75) : [];
    const descLines = item.description ? doc.splitTextToSize(String(item.description), contentWidth - 75) : [];
    const qty = `${item.quantity || 0} ${item.unit || ''}`;
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    const rowStartY = y;
    const rowHeight = Math.max(10, (nameLines.length * 4) + (descLines.length * 3.5) + 8);
    const fitsOnPage = y + rowHeight <= 270;
    if (fitsOnPage && index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(Number(margin), Number(y), Number(contentWidth), Number(rowHeight), 'F');
    }

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(180, 180, 180);
    doc.text(String(index + 1), numCol, y + 4);

    let textY = y + 5;
    nameLines.forEach((line) => {
      if (textY > 270) {
        doc.addPage();
        y = margin;
        drawTableHeader(y);
        y += tableHeaderHeight + 2;
        textY = y + 5;
      }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
      doc.text(line, itemCol, textY);
      textY += 4;
    });

    descLines.forEach((line) => {
      if (textY > 270) {
        doc.addPage();
        y = margin;
        drawTableHeader(y);
        y += tableHeaderHeight + 2;
        textY = y + 5;
      }
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(80, 80, 80);
      doc.text(line, itemCol, textY);
      textY += 3.5;
    });

    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(0, 0, 0);
    doc.text(qty, qtyCol, rowStartY + 4, { align: 'right' });
    doc.text(rate, rateCol, rowStartY + 4, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(total, amountCol, rowStartY + 4, { align: 'right' });

    y = textY + 3;
    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y, pageWidth - margin, y);
  });

  // ========== TOTALS ==========
  y += 8;
  const totalsLabelX = pageWidth - margin - 50;
  const totalsValueX = pageWidth - margin;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
  doc.text('Sub Total', totalsLabelX, y);
  doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0);
  doc.text(`$${Number(invoice.subtotal || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });

  if ((invoice.tax_amount || 0) > 0) {
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setTextColor(120,120,120);
    doc.text(`Tax (${invoice.tax_rate || 0}%)`, totalsLabelX, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(0,0,0);
    doc.text(`$${Number(invoice.tax_amount || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }

  y += 8;
  doc.setFillColor(220,225,230);
  doc.rect(Number(totalsLabelX - 8), Number(y - 6), 58, 12, 'F');
  doc.setDrawColor(30,30,30); doc.setLineWidth(0.8);
  doc.line(totalsLabelX - 8, y - 6, totalsLabelX + 50, y - 6);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(0,0,0);
  doc.text('TOTAL', totalsLabelX, y + 2);
  doc.setFontSize(14);
  doc.text(`$${Number(invoice.total || 0).toFixed(2)}`, totalsValueX, y + 2, { align: 'right' });

  if ((invoice.amount_paid || 0) > 0) {
    y += 10;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text('Amount Paid', totalsLabelX, y);
    doc.setFont('helvetica', 'bold'); doc.setTextColor(34,197,94);
    doc.text(`$${Number(invoice.amount_paid || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }

  if (invoice.balance !== undefined && invoice.balance !== invoice.total) {
    y += 6;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(120,120,120);
    doc.text('Balance Due', totalsLabelX, y);
    doc.setTextColor(invoice.balance > 0 ? 220 : 34, invoice.balance > 0 ? 38 : 197, invoice.balance > 0 ? 38 : 94);
    doc.text(`$${Number(invoice.balance || 0).toFixed(2)}`, totalsValueX, y, { align: 'right' });
  }

  // ========== NOTES ==========
  if (invoice.notes && invoice.notes.trim()) {
    y += 18;
    if (y > 240) { doc.addPage(); y = margin; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0,0,0);
    doc.text('Notes', margin, y);
    y += 6;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70,70,70);
    const notesLines = doc.splitTextToSize(String(invoice.notes), contentWidth);
    doc.text(notesLines, margin, y);
    y += notesLines.length * 4 + 4;
  }

  // ========== TERMS & CONDITIONS ==========
  y += 10;
  if (y > 240) { doc.addPage(); y = margin; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(0,0,0);
  doc.text('Terms & Conditions', margin, y);
  y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(70,70,70);
  const termsLines = doc.splitTextToSize(String(invoice.terms || 'Payment due in 30 days unless otherwise specified. Late payments subject to 1.5% monthly interest.'), contentWidth);
  doc.text(termsLines, margin, y);

  return doc;
}

function formatDateShort(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    return `${String(date.getMonth()+1).padStart(2,'0')}.${String(date.getDate()).padStart(2,'0')}.${String(date.getFullYear()).slice(-2)}`;
  } catch { return dateString; }
}

export async function downloadInvoicePDF(invoice) {
  const doc = await generateInvoicePDF(invoice);
  const customerName = (invoice.customer_name || 'Customer').replace(/[^a-zA-Z0-9]/g, '-');
  const invoiceNumber = (invoice.invoice_number || 'DRAFT').replace(/[^a-zA-Z0-9]/g, '-');
  doc.save(`Invoice-${invoiceNumber}-${customerName}.pdf`);
}

export async function getInvoicePDFBlob(invoice) {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('blob');
}

export async function getInvoicePDFDataURI(invoice) {
  const doc = await generateInvoicePDF(invoice);
  return doc.output('dataurlstring');
}