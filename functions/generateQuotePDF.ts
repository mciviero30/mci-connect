// PDF Profesional con jsPDF - Gradiente y Logo Mejorados
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
        
        // Verify user has access to this quote
        const isAdmin = user.role === 'admin' || user.position === 'CEO' || user.position === 'administrator';
        const isOwner = quote.created_by === user.email;
        const isAssigned = quote.assigned_to === user.email;
        
        if (!isAdmin && !isOwner && !isAssigned) {
            return Response.json({ error: 'Forbidden: No access to this quote' }, { status: 403 });
        }

        const doc = new jsPDF();

        // HEADER CON GRADIENTE NEGRO A GRIS
        const headerHeight = 40;
        const steps = 100;
        for (let i = 0; i < steps; i++) {
            const x = (210 / steps) * i;
            const width = 210 / steps;
            const gray = Math.floor(i * (74 / steps)); // 0 negro a 74 gris
            doc.setFillColor(gray, gray, gray);
            doc.rect(x, 0, width, headerHeight, 'F');
        }

        // Logo como texto (MCI logo style)
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text('MODERN', 20, 17);
        doc.text('COMPONENTS', 20, 22);
        doc.text('INSTALLATIONS', 20, 27);
        
        // Logo frame
        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.8);
        doc.rect(15, 10, 8, 8);
        doc.line(19, 14, 23, 14);
        doc.line(19, 18, 23, 18);
        // Title
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(40);
        doc.setFont(undefined, 'bold');
        doc.text('QUOTE', 195, 25, { align: 'right' });

        // COMPANY INFO
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', 15, 50);
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(['2414 Meadow Isle Ln, Lawrenceville GA 30043', 'Phone: 470-209-3783'], 15, 55);

        // Quote Info
        const infoX = 130;
        doc.setTextColor(100, 116, 139);
        doc.text('Quote#', infoX, 50);
        doc.text('Date', infoX, 55);
        doc.text('Valid Until', infoX, 60);

        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(quote.quote_number || '', 195, 50, { align: 'right' });
        doc.text(quote.quote_date?.split('-').slice(1).concat(quote.quote_date.split('-')[0].slice(-2)).join('.') || '', 195, 55, { align: 'right' });
        doc.text(quote.valid_until?.split('-').slice(1).concat(quote.valid_until.split('-')[0].slice(-2)).join('.') || '', 195, 60, { align: 'right' });

        // Bill To
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.setFont(undefined, 'bold');
        doc.text('BILL TO:', 15, 70);
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(quote.customer_name || 'Customer', 15, 77);

        // Job Details
        let currentY = 90;
        if (quote.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.text('Job Details :', 15, currentY);
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(quote.job_name, 15, currentY + 5);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.text(quote.job_address || '', 15, currentY + 10);
            currentY += 20;
        }

        // TABLE HEADER con gradiente
        const tableHeaderY = currentY;
        const headerSteps = 50;
        for (let i = 0; i < headerSteps; i++) {
            const x = 15 + (180 / headerSteps) * i;
            const width = 180 / headerSteps;
            const gray = Math.floor(i * (74 / headerSteps));
            doc.setFillColor(gray, gray, gray);
            doc.rect(x, tableHeaderY, width, 10, 'F');
        }
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('#', 18, tableHeaderY + 6.5);
        doc.text('ITEM & DESCRIPTION', 30, tableHeaderY + 6.5);
        doc.text('QTY', 135, tableHeaderY + 6.5, { align: 'right' });
        doc.text('RATE', 165, tableHeaderY + 6.5, { align: 'right' });
        doc.text('AMOUNT', 190, tableHeaderY + 6.5, { align: 'right' });

        // ITEMS
        currentY = tableHeaderY + 10;
        doc.setTextColor(0, 0, 0);
        
        for (let i = 0; i < quote.items.length; i++) {
            const item = quote.items[i];
            if (currentY > 260) { doc.addPage(); currentY = 20; }

            // Use item_name first, fallback to description
            const itemTitle = item.item_name || item.description || '';
            const wrappedText = doc.splitTextToSize(itemTitle, 95);
            const rowHeight = Math.max(10, wrappedText.length * 4 + 4);

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text((i + 1).toString(), 18, currentY + 5);
            
            doc.setFont(undefined, 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text(wrappedText, 30, currentY + 5);

            doc.setFont(undefined, 'normal');
            doc.text(`${item.quantity || 0} ${item.unit || ''}`, 135, currentY + 5, { align: 'right' });
            doc.text(`$${(item.unit_price || 0).toFixed(2)}`, 165, currentY + 5, { align: 'right' });
            
            doc.setFont(undefined, 'bold');
            doc.text(`$${(item.total || 0).toFixed(2)}`, 190, currentY + 5, { align: 'right' });

            doc.setDrawColor(226, 232, 240);
            doc.line(15, currentY + rowHeight, 195, currentY + rowHeight);
            currentY += rowHeight;
        }

        // TOTALS
        currentY += 10;
        const totalX = 130;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Sub Total', totalX, currentY);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'bold');
        doc.text(`$${(quote.subtotal || 0).toFixed(2)}`, 195, currentY, { align: 'right' });
        
        currentY += 8;
        const totalSteps = 30;
        for (let i = 0; i < totalSteps; i++) {
            const x = totalX + (65 / totalSteps) * i;
            const width = 65 / totalSteps;
            const gray = 241 - Math.floor(i * (36 / totalSteps));
            doc.setFillColor(gray, gray, gray);
            doc.rect(x, currentY - 4, width, 10, 'F');
        }
        
        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.5);
        doc.line(totalX, currentY - 4, totalX + 65, currentY - 4);
        
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.text('TOTAL', totalX + 2, currentY + 1.5);
        doc.setFontSize(14);
        doc.text(`$${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 195, currentY + 1.5, { align: 'right' });

        // TERMS
        currentY += 20;
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('Terms & Conditions', 15, currentY);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text('Approval: PO required to schedule work.', 15, currentY + 5);
        doc.text('Offload: Standard offload only. Excludes stairs/windows/special equipment. Client provides', 15, currentY + 9);
        doc.text('equipment (forklift or lull). Site access issues may require revised quote.', 15, currentY + 13);
        doc.text('Hours: Regular hours only. OT/after-hours billed separately via Change Order unless', 15, currentY + 17);
        doc.text('otherwise specified.', 15, currentY + 21);

        const pdfBytes = doc.output('arraybuffer');
        return new Response(pdfBytes, {
            headers: { 
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`
            }
        });
    } catch (error) {
        console.error('PDF Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});