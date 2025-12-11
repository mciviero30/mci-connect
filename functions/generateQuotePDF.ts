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

        // Dark Header Banner
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 30, 'F');

        // Logo in header
        try {
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png';
            const logoResponse = await fetch(logoUrl);
            const logoBlob = await logoResponse.blob();
            const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(await logoBlob.arrayBuffer())));
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 15, 7, 70, 16);
        } catch (err) {
            console.log('Could not load logo:', err);
        }

        // QUOTE title in header
        doc.setFontSize(36);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('QUOTE', 195, 20, { align: 'right' });

        doc.setTextColor(0, 0, 0);

        // Company info
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', 15, 38);
        
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.text('2414 Meadow Isle Ln', 15, 43);
        doc.text('Lawrenceville Georgia 30043', 15, 47);
        doc.text('U.S.A', 15, 51);
        doc.text('Phone: 470-209-3783', 15, 56);

        // Quote number (right side)
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(`# ${quote.quote_number}`, 195, 45, { align: 'right' });
        doc.setTextColor(0, 0, 0);

        // Bill To
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Bill To', 15, 65);
        
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(quote.customer_name, 15, 72);

        // Dates (right aligned)
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        let dateY = 65;
        
        if (quote.quote_date) {
            doc.text('Quote Date :', 155, dateY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            const qDate = new Date(quote.quote_date);
            doc.text(`${String(qDate.getMonth() + 1).padStart(2, '0')}.${String(qDate.getDate()).padStart(2, '0')}.${String(qDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            dateY += 5;
        }

        if (quote.valid_until) {
            doc.text('Valid Until :', 155, dateY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            const vDate = new Date(quote.valid_until);
            doc.text(`${String(vDate.getMonth() + 1).padStart(2, '0')}.${String(vDate.getDate()).padStart(2, '0')}.${String(vDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            dateY += 5;
        }

        if (quote.install_date) {
            doc.text('Install Date :', 155, dateY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            const iDate = new Date(quote.install_date);
            doc.text(`${String(iDate.getMonth() + 1).padStart(2, '0')}.${String(iDate.getDate()).padStart(2, '0')}.${String(iDate.getFullYear()).slice(-2)}`, 195, dateY, { align: 'right' });
        }

        // Job Details
        let currentY = 82;
        if (quote.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.setFont(undefined, 'normal');
            doc.text('Job Details :', 15, currentY);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(quote.job_name, 15, currentY + 5);
            
            if (quote.job_address) {
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(71, 85, 105);
                const addressLines = doc.splitTextToSize(quote.job_address, 180);
                doc.text(addressLines, 15, currentY + 10);
                currentY += 10 + (addressLines.length * 4);
            } else {
                currentY += 10;
            }
        }

        // Items table header
        currentY = Math.max(currentY + 5, 105);
        doc.setFillColor(51, 65, 85);
        doc.rect(15, currentY, 180, 8, 'F');

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('#', 18, currentY + 5);
        doc.text('Item & Description', 30, currentY + 5);
        doc.text('Qty', 155, currentY + 5, { align: 'right' });
        doc.text('Rate', 172, currentY + 5, { align: 'right' });
        doc.text('Amount', 195, currentY + 5, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        currentY += 12;

        // Items - USANDO MISMO FORMATO QUE PRICE LIST (UNA LÍNEA POR ITEM)
        doc.setFontSize(8);
        let itemIndex = 1;

        for (const item of quote.items || []) {
            // Check if we need a new page
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
                
                // Repeat header on new page
                doc.setFillColor(51, 65, 85);
                doc.rect(15, currentY - 5, 180, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('#', 18, currentY);
                doc.text('Item & Description', 30, currentY);
                doc.text('Qty', 155, currentY, { align: 'right' });
                doc.text('Rate', 172, currentY, { align: 'right' });
                doc.text('Amount', 195, currentY, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                currentY += 8;
            }

            // Alternating row background
            if (itemIndex % 2 === 0) {
                doc.setFillColor(248, 250, 252);
                doc.rect(15, currentY - 4, 180, 7, 'F');
            }

            // Item number
            doc.setTextColor(71, 85, 105);
            doc.setFont(undefined, 'normal');
            doc.text(itemIndex.toString(), 18, currentY);

            // Item name (TRUNCADO A UNA LÍNEA como Price List)
            const maxNameWidth = 115;
            let displayName = '';
            
            if (item.item_name) {
                displayName = item.item_name;
            } else if (item.description) {
                displayName = item.description;
            }

            // Truncate if too long
            const nameLines = doc.splitTextToSize(displayName, maxNameWidth);
            const truncatedName = nameLines.length > 1 
                ? displayName.substring(0, 60) + '...'
                : displayName;

            doc.setTextColor(15, 23, 42);
            doc.setFont(undefined, 'bold');
            doc.text(truncatedName, 30, currentY);

            // Qty, Rate, Amount
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((item.quantity || 0).toFixed(2), 155, currentY, { align: 'right' });
            doc.text((item.unit_price || 0).toFixed(2), 172, currentY, { align: 'right' });
            doc.text((item.total || 0).toFixed(2), 195, currentY, { align: 'right' });

            // Separator line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(15, currentY + 2, 195, currentY + 2);

            currentY += 7;
            itemIndex++;
        }

        // Notes
        if (quote.notes) {
            currentY += 5;
            if (currentY > 230) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 15, currentY);
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            const notesLines = doc.splitTextToSize(quote.notes, 180);
            doc.text(notesLines, 15, currentY + 5);
            currentY += 5 + (notesLines.length * 4) + 5;
        }

        // Totals section
        if (currentY > 220) {
            doc.addPage();
            currentY = 20;
        }

        const totalsX = 140;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(71, 85, 105);
        
        doc.text('Sub Total', totalsX, currentY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text((quote.subtotal || 0).toFixed(2), 195, currentY, { align: 'right' });
        currentY += 6;

        if (quote.tax_amount > 0) {
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Tax (${quote.tax_rate || 0}%)`, totalsX, currentY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((quote.tax_amount || 0).toFixed(2), 195, currentY, { align: 'right' });
            currentY += 8;
        } else {
            currentY += 3;
        }

        // Total box
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(totalsX - 5, currentY - 4, 60, 10, 2, 2, 'F');
        
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Total', totalsX, currentY + 2);
        
        doc.setFontSize(14);
        doc.text('$' + (quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });

        currentY += 15;

        // Terms & Conditions at bottom
        if (currentY > 240) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Terms & Conditions', 15, currentY);
        currentY += 5;

        doc.setFontSize(8);
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
            doc.text(textLines, 15 + labelWidth + 2, currentY);
            currentY += Math.max(4, textLines.length * 4) + 1.5;
        }

        // Footer on all pages
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