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
        // HEADER BANNER (BLACK) - IDENTICAL TO PRICE LIST
        // ==========================================
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 30, 'F');

        // Logo
        try {
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png';
            const logoResponse = await fetch(logoUrl);
            const logoBlob = await logoResponse.blob();
            const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(await logoBlob.arrayBuffer())));
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 15, 7, 70, 16);
        } catch (err) {
            console.log('Logo load error:', err);
        }

        // QUOTE title (white, right-aligned)
        doc.setFontSize(36);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('QUOTE', 195, 20, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // ==========================================
        // COMPANY INFO (BELOW HEADER)
        // ==========================================
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', 15, 38);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('2414 Meadow Isle Ln', 15, 43);
        doc.text('Lawrenceville Georgia 30043', 15, 47);
        doc.text('U.S.A', 15, 51);
        doc.text('Phone: 470-209-3783', 15, 56);

        // ==========================================
        // BILL TO & DATES
        // ==========================================
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text('Bill To', 15, 65);
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(quote.customer_name, 15, 72);

        // Dates (right)
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        
        let dateY = 65;
        doc.text('Quote Date :', 155, dateY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        if (quote.quote_date) {
            const qDate = new Date(quote.quote_date);
            doc.text(`${String(qDate.getMonth() + 1).padStart(2, '0')}.${String(qDate.getDate()).padStart(2, '0')}.${String(qDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
        }
        dateY += 4;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Valid Until :', 155, dateY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        if (quote.valid_until) {
            const vDate = new Date(quote.valid_until);
            doc.text(`${String(vDate.getMonth() + 1).padStart(2, '0')}.${String(vDate.getDate()).padStart(2, '0')}.${String(vDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
        }
        dateY += 4;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Install Date :', 155, dateY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        if (quote.install_date) {
            const iDate = new Date(quote.install_date);
            doc.text(`${String(iDate.getMonth() + 1).padStart(2, '0')}.${String(iDate.getDate()).padStart(2, '0')}.${String(iDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
        }

        // ==========================================
        // JOB DETAILS - SINGLE LINE ONLY
        // ==========================================
        let currentY = 80;
        if (quote.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Job Details :', 15, currentY);
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            
            // Clean and truncate job name
            const cleanJobName = (quote.job_name || '').replace(/\n/g, ' ');
            const truncatedJobName = cleanJobName.length > 50 ? cleanJobName.substring(0, 47) + '...' : cleanJobName;
            doc.text(truncatedJobName, 15, currentY + 4);
            
            if (quote.job_address) {
                doc.setFontSize(7);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(100, 116, 139);
                const cleanAddress = (quote.job_address || '').replace(/\n/g, ' ');
                const truncatedAddress = cleanAddress.length > 80 ? cleanAddress.substring(0, 77) + '...' : cleanAddress;
                doc.text(truncatedAddress, 15, currentY + 8);
                currentY += 13;
            } else {
                currentY += 8;
            }
        }

        // ==========================================
        // ITEMS TABLE - ONE LINE PER ITEM (STRICT)
        // ==========================================
        currentY = Math.max(currentY, 95);
        
        // Table header
        doc.setFillColor(51, 65, 85);
        doc.rect(15, currentY, 180, 8, 'F');

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('#', 18, currentY + 5);
        doc.text('ITEM & DESCRIPTION', 30, currentY + 5);
        doc.text('QTY', 155, currentY + 5, { align: 'right' });
        doc.text('RATE', 175, currentY + 5, { align: 'right' });
        doc.text('AMOUNT', 190, currentY + 5, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        currentY += 10;

        // Items - SINGLE LINE WITH ALL COLUMNS
        doc.setFontSize(8);
        let itemIndex = 1;

        for (const item of quote.items || []) {
            // New page check
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;

                // Repeat header
                doc.setFillColor(51, 65, 85);
                doc.rect(15, currentY - 5, 180, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('#', 18, currentY);
                doc.text('ITEM & DESCRIPTION', 30, currentY);
                doc.text('QTY', 155, currentY, { align: 'right' });
                doc.text('RATE', 175, currentY, { align: 'right' });
                doc.text('AMOUNT', 190, currentY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                currentY += 8;
            }

            // Alternating row background
            if (itemIndex % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(15, currentY - 2, 180, 4.5, 'F');
            }

            // Row number
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(itemIndex.toString(), 18, currentY);

            // Item name (truncated)
            let rawName = item.item_name || item.description || '';
            rawName = rawName.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);

            let itemName = rawName;
            const maxWidth = 100;

            while (doc.getTextWidth(itemName) > maxWidth && itemName.length > 3) {
                itemName = itemName.substring(0, itemName.length - 1);
            }

            if (itemName.length < rawName.length) {
                itemName = itemName.substring(0, itemName.length - 3) + '...';
            }

            doc.text(itemName, 30, currentY);

            // Qty with unit
            const qtyText = (item.quantity || 0).toFixed(2) + (item.unit ? ' ' + item.unit : '');
            doc.text(qtyText, 155, currentY, { align: 'right' });
            
            // Rate and Amount with $
            doc.text('$' + (item.unit_price || 0).toFixed(2), 175, currentY, { align: 'right' });
            doc.text('$' + (item.total || 0).toFixed(2), 190, currentY, { align: 'right' });

            // Separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(15, currentY + 1, 195, currentY + 1);

            currentY += 4.5;
            itemIndex++;
        }

        // ==========================================
        // NOTES - MAX 2 LINES
        // ==========================================
        if (quote.notes) {
            currentY += 3;
            if (currentY > 245) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 15, currentY);
            
            doc.setFontSize(7);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            
            // Clean notes and limit to 2 lines
            const cleanNotes = quote.notes.replace(/\n/g, ' ').trim();
            const notesLines = doc.splitTextToSize(cleanNotes, 180);
            const limitedNotes = notesLines.slice(0, 2);
            doc.text(limitedNotes, 15, currentY + 4);
            currentY += 4 + (limitedNotes.length * 3) + 3;
        }

        // ==========================================
        // TOTALS
        // ==========================================
        if (currentY > 235) {
            doc.addPage();
            currentY = 20;
        }

        const totalsX = 145;
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        
        doc.text('Sub Total', totalsX, currentY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text((quote.subtotal || 0).toFixed(2), 195, currentY, { align: 'right' });
        currentY += 5;

        if (quote.tax_amount > 0) {
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Tax (${quote.tax_rate || 0}%)`, totalsX, currentY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((quote.tax_amount || 0).toFixed(2), 195, currentY, { align: 'right' });
            currentY += 7;
        } else {
            currentY += 2;
        }

        // Total box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(totalsX - 3, currentY - 3, 53, 9, 1.5, 1.5, 'F');
        
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Total', totalsX, currentY + 2);
        
        doc.setFontSize(13);
        doc.text('$' + (quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });

        currentY += 12;

        // ==========================================
        // TERMS - COMPACT
        // ==========================================
        if (currentY > 250) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(8);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Terms & Conditions', 15, currentY);
        currentY += 4;

        doc.setFontSize(7);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);

        const terms = [
            { label: 'Approval:', text: 'PO required to schedule work.' },
            { label: 'Offload:', text: 'Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment (forklift or lull). Site access issues may require revised quote.' },
            { label: 'Hours:', text: 'Regular hours only. OT/after-hours billed separately via Change Order unless otherwise specified.' }
        ];

        for (const term of terms) {
            doc.setFont(undefined, 'bold');
            const labelWidth = doc.getTextWidth(term.label);
            doc.text(term.label, 15, currentY);
            
            doc.setFont(undefined, 'normal');
            const textLines = doc.splitTextToSize(term.text, 180 - labelWidth - 2);
            const limitedLines = textLines.slice(0, 2);
            doc.text(limitedLines, 15 + labelWidth + 2, currentY);
            currentY += Math.max(3, limitedLines.length * 3) + 1;
        }

        // ==========================================
        // FOOTER
        // ==========================================
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
            doc.text('Modern Components Installation', 15, 290);
            doc.text('470-209-3783', 195, 290, { align: 'right' });
        }

        const pdfBytes = doc.output('arraybuffer');

        return new Response(pdfBytes, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename=${quote.quote_number}-${quote.customer_name}.pdf`
            }
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});