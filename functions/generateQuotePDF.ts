// PDF Profesional - Versión Corregida para QUOTE
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { quoteId } = await req.json();
        const quote = await base44.entities.Quote.get(quoteId);

        if (!quote) {
            return Response.json({ error: 'Quote not found' }, { status: 404 });
        }

        const doc = new jsPDF();

        // ==========================================
        // HEADER BANNER (SOLID BLACK - NO GRADIENT)
        // ==========================================
        doc.setFillColor(0, 0, 0);
        doc.setDrawColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'FD');

        // Logo - SVG/Text fallback approach
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('MODERN', 20, 17);
        doc.text('COMPONENTS', 20, 22);
        doc.text('INSTALLATIONS', 20, 27);
        
        // Logo frame
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.5);
        doc.rect(15, 10, 8, 8);
        doc.line(19, 14, 23, 14);
        doc.line(19, 18, 23, 18);
        doc.line(15, 14, 23, 14);
        doc.line(15, 18, 23, 18);

        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont(undefined, 'bold');
        doc.text('QUOTE', 195, 25, { align: 'right' });

        // ==========================================
        // COMPANY & CLIENT INFO
        // ==========================================
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', 15, 50);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(['2414 Meadow Isle Ln', 'Lawrenceville Georgia 30043', 'U.S.A', 'Phone: 470-209-3783'], 15, 55);

        // Quote Info (Right side)
        const infoX = 150;
        doc.setTextColor(100, 116, 139);
        doc.text('Quote#:', infoX, 50);
        doc.text('Quote Date:', infoX, 55);
        doc.text('Valid Until:', infoX, 60);

        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, 'bold');
        doc.text(quote.quote_number || '', 195, 50, { align: 'right' });
        doc.text(quote.quote_date || '', 195, 55, { align: 'right' });
        doc.text(quote.expiration_date || '', 195, 60, { align: 'right' });

        // Bill To
        doc.setFontSize(12);
        doc.text('Bill To', 15, 75);
        doc.setFont(undefined, 'bold');
        doc.text(quote.customer_name || 'Customer', 15, 82);

        // Job Details
        let currentY = 95;
        if (quote.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Job Details:', 15, currentY);
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(quote.job_name, 15, currentY + 5);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.text(quote.job_address || '', 15, currentY + 9);
            currentY += 20;
        }

        // ==========================================
        // TABLE HEADER
        // ==========================================
        doc.setFillColor(0, 0, 0);
        doc.rect(15, currentY, 180, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('#', 18, currentY + 6.5);
        doc.text('ITEM & DESCRIPTION', 30, currentY + 6.5);
        doc.text('QTY', 140, currentY + 6.5, { align: 'right' });
        doc.text('RATE', 165, currentY + 6.5, { align: 'right' });
        doc.text('AMOUNT', 190, currentY + 6.5, { align: 'right' });

        // ==========================================
        // ITEMS
        // ==========================================
        currentY += 10;
        doc.setTextColor(15, 23, 42);
        let itemIndex = 1;

        for (const item of quote.items || []) {
            if (currentY > 260) { doc.addPage(); currentY = 20; }

            // Multi-line text wrapping
            const desc = item.item_name || item.description || '';
            const wrappedText = doc.splitTextToSize(desc, 95);
            const lineHeight = 4;
            const rowHeight = Math.max(8, wrappedText.length * lineHeight + 2);

            // Row background (zebra striping)
            if (itemIndex % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(15, currentY, 180, rowHeight, 'F');
            }

            // Column 1: # (fixed at x=18)
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.text(itemIndex.toString(), 18, currentY + 5.5);
            
            // Column 2: ITEM & DESCRIPTION (fixed at x=30, width=95)
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text(wrappedText, 30, currentY + 5.5);

            // Column 3: QTY (fixed at x=135, right-aligned)
            doc.setFont(undefined, 'normal');
            const qtyText = `${item.quantity || 0} ${item.unit || ''}`;
            doc.text(qtyText, 135, currentY + 5.5, { align: 'right' });
            
            // Column 4: RATE (fixed at x=165, right-aligned)
            doc.text('$' + (item.unit_price || 0).toFixed(2), 165, currentY + 5.5, { align: 'right' });
            
            // Column 5: AMOUNT (fixed at x=190, right-aligned)
            doc.setFont(undefined, 'bold');
            doc.text('$' + (item.total || 0).toFixed(2), 190, currentY + 5.5, { align: 'right' });

            // Border line
            doc.setDrawColor(241, 245, 249);
            doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
            currentY += rowHeight;
            itemIndex++;
        }

        // ==========================================
        // TOTALS
        // ==========================================
        currentY += 10;
        const totalX = 140;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Sub Total', totalX, currentY);
        doc.text(quote.subtotal.toFixed(2), 195, currentY, { align: 'right' });
        
        currentY += 8;
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(totalX - 2, currentY - 5, 57, 10, 1, 1, 'F');
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL', totalX + 2, currentY + 1.5);
        doc.text('$' + quote.total.toLocaleString('en-US', { minimumFractionDigits: 2 }), 195, currentY + 1.5, { align: 'right' });

        // ==========================================
        // FOOTER
        // ==========================================
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(150);
            doc.text(`Page ${i} of ${pageCount} | Modern Components Installation`, 105, 285, { align: 'center' });
        }

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            headers: { 
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`
            }
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});