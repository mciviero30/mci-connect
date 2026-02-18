import { jsPDF } from 'npm:jspdf@2.5.2';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
 * Generate Quote PDF
 */
async function generateQuotePDF(quote) {
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
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
    floatPrecision: 'smart'
  });
  
  doc.viewerPreferences({
    'FitWindow': true,
    'PrintScaling': 'None'
  }, true);

  const margin = 20;
  const pageWidth = 210;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Header
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

  // Two column layout
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

  // Right column
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
  const quoteDate = formatDateShort(quote.quote_date || quote.created_date);
  doc.text(String(quoteDate), valueX, rightY, { align: 'right' });
  doc.line(labelX, rightY + 1, valueX, rightY + 1);
  
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

  // Job details
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

  // Items table
  const tableHeaderY = y;
  const tableHeaderHeight = 7;
  const tableGradientSteps = 100;
  for (let i = 0; i < tableGradientSteps; i++) {
    const gray = Math.floor((i / tableGradientSteps) * 120);
    doc.setFillColor(gray, gray, gray);
    const rectX = Number(margin + (i * contentWidth) / tableGradientSteps);
    const rectWidth = Number(contentWidth / tableGradientSteps + 0.5);
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

  // Table rows
  quote.items.forEach((item, index) => {
    const itemNum = String(index + 1);
    const itemName = item.item_name || '';
    const itemDesc = item.description || '';
    
    const qty = `${item.quantity || 0} ${item.unit || ''}`;
    const rate = `$${Number(item.unit_price || 0).toFixed(2)}`;
    const total = `$${Number(item.total || 0).toFixed(2)}`;

    const nameLines = itemName ? doc.splitTextToSize(String(itemName), contentWidth - 75) : [];
    const descLines = itemDesc ? doc.splitTextToSize(String(itemDesc), contentWidth - 75) : [];
    const rowHeight = Math.max(10, (nameLines.length * 4) + (descLines.length * 3.5) + 8);

    if (y + rowHeight > 270) {
      doc.addPage();
      y = margin;
    }

    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(Number(margin), Number(y), Number(contentWidth), Number(rowHeight), 'F');
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 180, 180);
    doc.text(itemNum, numCol, y + 4);

    let textY = y + 5;
    
    if (nameLines.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(nameLines, itemCol, textY);
      textY += nameLines.length * 4;
    }
    
    if (descLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(80, 80, 80);
      doc.text(descLines, itemCol, textY);
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(qty, qtyCol, y + 4, { align: 'right' });
    doc.text(rate, rateCol, y + 4, { align: 'right' });
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(total, amountCol, y + 4, { align: 'right' });

    doc.setDrawColor(230, 230, 230);
    doc.line(margin, y + rowHeight, pageWidth - margin, y + rowHeight);

    y += rowHeight;
  });

  // Totals
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

  return doc;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    const body = await req.json();
    const { quoteId } = body;

    if (!quoteId) {
      return new Response(JSON.stringify({ error: 'quoteId is required' }), { status: 400 });
    }

    // Fetch quote data
    const quote = await base44.entities.Quote.get(quoteId);
    if (!quote) {
      return new Response(JSON.stringify({ error: 'Quote not found' }), { status: 404 });
    }

    // Generate PDF
    const doc = await generateQuotePDF(quote);
    const pdfBytes = doc.output('arraybuffer');

    // Return as binary file with correct headers
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${quote.quote_number || 'quote'}.pdf"`,
        'Content-Length': pdfBytes.byteLength.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});