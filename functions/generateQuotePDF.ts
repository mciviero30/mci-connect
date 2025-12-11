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

        // Items
        doc.setFontSize(8);
        let itemIndex = 1;

        for (const item of quote.items || []) {
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
                
                // Repeat header on new page
                doc.setFillColor(51, 65, 85);
                doc.rect(15, currentY, 180, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('#', 18, currentY + 5);
                doc.text('Item & Description', 30, currentY + 5);
                doc.text('Qty', 155, currentY + 5, { align: 'right' });
                doc.text('Rate', 172, currentY + 5, { align: 'right' });
                doc.text('Amount', 195, currentY + 5, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                currentY += 12;
            }

            const itemStartY = currentY;

            // Item number
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(itemIndex.toString(), 18, currentY);

            // Item name & description
            const maxDescWidth = 115;
            
            if (item.item_name) {
                // Show item name in bold
                doc.setFont(undefined, 'bold');
                doc.setTextColor(15, 23, 42);
                const nameLines = doc.splitTextToSize(item.item_name, maxDescWidth);
                doc.text(nameLines, 30, currentY);
                currentY += nameLines.length * 3.5;
                
                // Show description in gray if exists
                if (item.description && item.description.trim()) {
                    doc.setFont(undefined, 'normal');
                    doc.setTextColor(100, 116, 139);
                    const descLines = doc.splitTextToSize(item.description, maxDescWidth);
                    doc.text(descLines, 30, currentY);
                    currentY += descLines.length * 3.5;
                }
            } else if (item.description) {
                // No item_name, just show description in normal font
                doc.setFont(undefined, 'normal');
                doc.setTextColor(15, 23, 42);
                const descLines = doc.splitTextToSize(item.description, maxDescWidth);
                doc.text(descLines, 30, currentY);
                currentY += descLines.length * 3.5;
            }

            // Calculation line (qty × rate)
            if (item.quantity && item.unit_price) {
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.setFont(undefined, 'normal');
                const calcText = `${item.quantity.toFixed(2)}${item.unit ? ' ' + item.unit : ''} × ${item.unit_price.toFixed(2)}`;
                doc.text(calcText, 30, currentY);
                currentY += 4;
            }

            // Qty, Rate, Amount (aligned to item start)
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            
            doc.text((item.quantity || 0).toFixed(2), 155, itemStartY, { align: 'right' });
            if (item.unit) {
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                doc.text(item.unit, 155, itemStartY + 3, { align: 'right' });
            }

            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text((item.unit_price || 0).toFixed(2), 172, itemStartY, { align: 'right' });
            doc.text((item.total || 0).toFixed(2), 195, itemStartY, { align: 'right' });

            // Separator line
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(15, currentY + 1, 195, currentY + 1);

            currentY += 5;
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