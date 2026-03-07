// PDF Profesional - Versión Corregida para Invoice
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();
        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { invoiceId } = await req.json();
        
        if (!invoiceId) {
            return Response.json({ error: 'invoiceId required' }, { status: 400 });
        }

        // Fetch invoice
        const invoice = await base44.entities.Invoice.get(invoiceId);

        if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }
        
        // Verify access (admin OR owner)
        if (!verifyOwnership(invoice, user, 'created_by')) {
            return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
            compress: true,
            putOnlyUsedFonts: true,
            floatPrecision: 'smart'
        });
        
        // CRITICAL: Set zoom to 100% on open
        doc.viewerPreferences({
            'FitWindow': true,
            'PrintScaling': 'None'
        }, true);
        const hasBalance = invoice.balance > 0;
        const isPaid = invoice.status === 'paid';

        // ========== HEADER: Black solid until logo ends, then gradient to gray ==========
        const headerHeight = 25;
        const logoEndX = 60;
        
        // Pure black section for logo
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, logoEndX, headerHeight, 'F');
        
        // Gradient from logo end to page end
        const gradientWidth = 210 - logoEndX;
        const gradientSteps = 100;
        for (let i = 0; i < gradientSteps; i++) {
            const gray = Math.floor((i / gradientSteps) * 130);
            doc.setFillColor(gray, gray, gray);
            const rectX = logoEndX + (i * gradientWidth) / gradientSteps;
            const rectWidth = (gradientWidth / gradientSteps) + 0.5;
            doc.rect(rectX, 0, rectWidth, headerHeight, 'F');
        }

        // Logo - High quality with same URL as quotes
        try {
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png';
            const logoResponse = await fetch(logoUrl);
            const arrayBuffer = await logoResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            let binary = '';
            const chunkSize = 8192;
            const len = bytes.byteLength;
            
            for (let i = 0; i < len; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            
            const logoBase64 = btoa(binary);
            // High quality rendering
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 20, 4, 40, 17, undefined, 'SLOW');
        } catch (err) {
            console.log('Logo load error:', err);
        }

        // INVOICE title (right aligned, white)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(28);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', 190, 17, { align: 'right' });

        // COMPANY INFO
        const margin = 20;
        let y = 35;
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', margin, y);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        y += 5;
        doc.text('2414 Meadow Isle Ln, Lawrenceville GA 30043', margin, y);
        y += 4;
        doc.text('Phone: 470-209-3783', margin, y);

        // RIGHT COLUMN: Invoice details
        const col2X = 130;
        const valueX = 190;
        let rightY = 35;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text('Invoice#', col2X, rightY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.invoice_number || '', valueX, rightY, { align: 'right' });
        doc.setDrawColor(230, 230, 230);
        doc.line(col2X, rightY + 1, valueX, rightY + 1);
        
        rightY += 6;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('Date', col2X, rightY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.invoice_date?.split('-').slice(1).concat(invoice.invoice_date.split('-')[0].slice(-2)).join('.') || '', valueX, rightY, { align: 'right' });
        doc.line(col2X, rightY + 1, valueX, rightY + 1);
        
        rightY += 6;
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120, 120, 120);
        doc.text('Due Date', col2X, rightY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.due_date?.split('-').slice(1).concat(invoice.due_date.split('-')[0].slice(-2)).join('.') || '', valueX, rightY, { align: 'right' });
        doc.line(col2X, rightY + 1, valueX, rightY + 1);

        // Bill To
        y += 8;
        doc.setFontSize(8);
        doc.setTextColor(59, 130, 246);
        doc.setFont(undefined, 'bold');
        doc.text('BILL TO:', margin, y);
        y += 5;
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(invoice.customer_name || 'Customer', margin, y);

        // Job Details
        y += 20;
        let currentY = y;
        if (invoice.job_name) {
            doc.setFontSize(9);
            doc.setTextColor(100, 100, 100);
            doc.setFont(undefined, 'normal');
            doc.text('Job Details :', margin, currentY);
            currentY += 5;
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(invoice.job_name, margin, currentY);
            if (invoice.job_address) {
                currentY += 5;
                doc.setFont(undefined, 'normal');
                doc.setFontSize(9);
                doc.setTextColor(70, 70, 70);
                doc.text(invoice.job_address, margin, currentY);
            }
            currentY += 8;
        }

        // TABLE HEADER - gradient (matching quotes)
        const tableHeaderY = currentY;
        const contentWidth = 170;
        const tableHeaderHeight = 7;
        const headerSteps = 100;
        for (let i = 0; i < headerSteps; i++) {
            const x = margin + (contentWidth / headerSteps) * i;
            const width = (contentWidth / headerSteps) + 0.5;
            const gray = Math.floor(i * (120 / headerSteps));
            doc.setFillColor(gray, gray, gray);
            doc.rect(x, tableHeaderY, width, tableHeaderHeight, 'F');
        }
        
        const numCol = margin + 3;
        const itemCol = margin + 12;
        const qtyCol = 190 - 55;
        const rateCol = 190 - 35;
        const amountCol = 190 - 3;
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont(undefined, 'bold');
        doc.text('#', numCol, tableHeaderY + 4.5);
        doc.text('ITEM & DESCRIPTION', itemCol, tableHeaderY + 4.5);
        doc.text('QTY', qtyCol, tableHeaderY + 4.5, { align: 'right' });
        doc.text('RATE', rateCol, tableHeaderY + 4.5, { align: 'right' });
        doc.text('AMOUNT', amountCol, tableHeaderY + 4.5, { align: 'right' });

        // ITEMS
        currentY = tableHeaderY + 9;
        doc.setTextColor(0, 0, 0);
        
        for (let i = 0; i < invoice.items.length; i++) {
            const item = invoice.items[i];
            
            const itemName = item.item_name || '';
            const itemDesc = item.description || '';
            const qty = `${item.quantity || 0} ${item.unit || ''}`;
            const rate = `$${(item.unit_price || 0).toFixed(2)}`;
            const total = `$${(item.total || 0).toFixed(2)}`;

            // Usar más ancho para las descripciones
            const nameLines = itemName ? doc.splitTextToSize(itemName, contentWidth - 75) : [];
            const descLines = itemDesc ? doc.splitTextToSize(itemDesc, contentWidth - 75) : [];
            const rowHeight = Math.max(10, (nameLines.length * 4) + (descLines.length * 3.5) + 8);

            // Page break check
            if (currentY + rowHeight > 270) {
                doc.addPage();
                currentY = margin;
                // Re-render header
                for (let j = 0; j < headerSteps; j++) {
                    const x = margin + (contentWidth / headerSteps) * j;
                    const width = (contentWidth / headerSteps) + 0.5;
                    const gray = Math.floor(j * (120 / headerSteps));
                    doc.setFillColor(gray, gray, gray);
                    doc.rect(x, currentY, width, 7, 'F');
                }
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(7);
                doc.setFont(undefined, 'bold');
                doc.text('#', numCol, currentY + 4.5);
                doc.text('ITEM & DESCRIPTION', itemCol, currentY + 4.5);
                doc.text('QTY', qtyCol, currentY + 4.5, { align: 'right' });
                doc.text('RATE', rateCol, currentY + 4.5, { align: 'right' });
                doc.text('AMOUNT', amountCol, currentY + 4.5, { align: 'right' });
                currentY += 9;
            }

            // Zebra striping
            if (i % 2 === 0) {
                doc.setFillColor(250, 250, 250);
                doc.rect(margin, currentY, contentWidth, rowHeight, 'F');
            }

            // Item number
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(180, 180, 180);
            doc.text((i + 1).toString(), numCol, currentY + 4);

            let textY = currentY + 5;
            
            // Item Name (bold)
            if (nameLines.length > 0) {
                doc.setFont(undefined, 'bold');
                doc.setFontSize(9);
                doc.setTextColor(0, 0, 0);
                doc.text(nameLines, itemCol, textY);
                textY += nameLines.length * 4;
            }
            
            // Description (normal, smaller) - mostrar todas las descripciones
            if (descLines.length > 0) {
                doc.setFont(undefined, 'normal');
                doc.setFontSize(7.5);
                doc.setTextColor(80, 80, 80);
                doc.text(descLines, itemCol, textY);
            }

            // Qty, Rate, Amount
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(qty, qtyCol, currentY + 4, { align: 'right' });
            doc.text(rate, rateCol, currentY + 4, { align: 'right' });
            
            doc.setFont(undefined, 'bold');
            doc.text(total, amountCol, currentY + 4, { align: 'right' });

            // Row border
            doc.setDrawColor(230, 230, 230);
            doc.line(margin, currentY + rowHeight, 190, currentY + rowHeight);
            currentY += rowHeight;
        }

        // TOTALS
        currentY += 8;
        const totalsLabelX = 190 - 50;
        const totalsValueX = 190;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(120, 120, 120);
        doc.text('Sub Total', totalsLabelX, currentY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text(`$${(invoice.subtotal || 0).toFixed(2)}`, totalsValueX, currentY, { align: 'right' });
        
        currentY += 8;
        doc.setFillColor(220, 225, 230);
        doc.rect(totalsLabelX - 8, currentY - 6, 58, 12, 'F');
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.8);
        doc.line(totalsLabelX - 8, currentY - 6, totalsLabelX + 50, currentY - 6);
        
        doc.setFont(undefined, 'bold');
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL', totalsLabelX, currentY + 2);
        doc.setFontSize(14);
        doc.text(`$${(invoice.total || 0).toFixed(2)}`, totalsValueX, currentY + 2, { align: 'right' });
        
        // Amount Paid (if applicable)
        if ((invoice.amount_paid || 0) > 0) {
            currentY += 10;
            doc.setFont(undefined, 'normal');
            doc.setFontSize(9);
            doc.setTextColor(120, 120, 120);
            doc.text('Amount Paid', totalsLabelX, currentY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(34, 197, 94);
            doc.text(`-$${(invoice.amount_paid || 0).toFixed(2)}`, totalsValueX, currentY, { align: 'right' });
            
            // Balance Due
            currentY += 6;
            doc.setTextColor(120, 120, 120);
            doc.text('Balance Due', totalsLabelX, currentY);
            doc.setTextColor(invoice.balance > 0 ? 220 : 34, invoice.balance > 0 ? 38 : 197, invoice.balance > 0 ? 38 : 94);
            doc.text(`$${(invoice.balance || 0).toFixed(2)}`, totalsValueX, currentY, { align: 'right' });
        }

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            headers: { 
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
            }
        });
    } catch (error) {
        if (error instanceof Response) throw error;
        return safeJsonError('Failed to generate PDF', 500, error.message);
    }
});