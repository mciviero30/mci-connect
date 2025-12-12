import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { invoiceId } = await req.json();
        const invoice = await base44.entities.Invoice.get(invoiceId);

        if (!invoice) {
            return Response.json({ error: 'Invoice not found' }, { status: 404 });
        }

        const doc = new jsPDF();
        const hasBalance = invoice.balance > 0;
        const isPaid = invoice.status === 'paid';

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

        // INVOICE title and status (white, right-aligned)
        doc.setFontSize(36);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE', 195, 15, { align: 'right' });

        if (hasBalance) {
            doc.setFontSize(9);
            doc.text('BALANCE DUE', 195, 21, { align: 'right' });
            doc.setFontSize(15);
            doc.text('$' + invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, 27, { align: 'right' });
        }

        if (isPaid) {
            doc.setFontSize(13);
            doc.setTextColor(52, 211, 153);
            doc.text('✓ PAID', 195, 24, { align: 'right' });
        }

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
        // BILL TO & INVOICE INFO
        // ==========================================
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(invoice.customer_name, 15, 65);

        // Invoice info (right)
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        
        let infoY = 65;
        doc.text('Invoice#', 155, infoY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(invoice.invoice_number, 195, infoY, { align: 'right' });
        infoY += 4;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Invoice Date', 155, infoY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        if (invoice.invoice_date) {
            const invDate = new Date(invoice.invoice_date);
            doc.text(`${String(invDate.getMonth() + 1).padStart(2, '0')}.${String(invDate.getDate()).padStart(2, '0')}.${String(invDate.getFullYear()).slice(-2)}`, 195, infoY, { align: 'right' });
        }
        infoY += 4;

        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Due Date', 155, infoY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        if (invoice.due_date) {
            const dueDate = new Date(invoice.due_date);
            doc.text(`${String(dueDate.getMonth() + 1).padStart(2, '0')}.${String(dueDate.getDate()).padStart(2, '0')}.${String(dueDate.getFullYear()).slice(-2)}`, 195, infoY, { align: 'right' });
        }

        // ==========================================
        // JOB DETAILS - SINGLE LINE ONLY
        // ==========================================
        let currentY = 80;
        if (invoice.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Job Details :', 15, currentY);
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            
            // Clean and truncate job name
            const cleanJobName = (invoice.job_name || '').replace(/\n/g, ' ');
            const truncatedJobName = cleanJobName.length > 50 ? cleanJobName.substring(0, 47) + '...' : cleanJobName;
            doc.text(truncatedJobName, 15, currentY + 4);
            
            if (invoice.job_address) {
                doc.setFontSize(7);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(100, 116, 139);
                const cleanAddress = (invoice.job_address || '').replace(/\n/g, ' ');
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
        doc.text('AMOUNT', 190, currentY + 5, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        currentY += 10;

        // Items - STRICT ONE LINE ONLY (NO DETAILS BELOW)
        doc.setFontSize(8);
        let itemIndex = 1;

        for (const item of invoice.items || []) {
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
                doc.text('AMOUNT', 195, currentY, { align: 'right' });
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
            doc.setFontSize(8);
            doc.text(itemIndex.toString(), 18, currentY);

            // Item name (truncated)
            let rawName = item.item_name || item.description || '';
            rawName = rawName.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);

            let itemName = rawName;
            const maxWidth = 140;

            while (doc.getTextWidth(itemName) > maxWidth && itemName.length > 3) {
                itemName = itemName.substring(0, itemName.length - 1);
            }

            if (itemName.length < rawName.length) {
                itemName = itemName.substring(0, itemName.length - 3) + '...';
            }

            doc.text(itemName, 30, currentY);

            // Amount
            doc.text('$' + (item.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 190, currentY, { align: 'right' });

            // Thin separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(15, currentY + 1, 195, currentY + 1);

            currentY += 4.0;
            itemIndex++;
        }

        // ==========================================
        // NOTES - MAX 2 LINES
        // ==========================================
        if (invoice.notes) {
            currentY += 3;
            if (currentY > 240) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 15, currentY);
            currentY += 3;
            
            doc.setFillColor(248, 250, 252);
            doc.setFontSize(7);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            
            // Clean and limit notes to 2 lines
            const cleanNotes = (invoice.notes || '').replace(/\n/g, ' ').trim();
            const notesLines = doc.splitTextToSize(cleanNotes, 175);
            const limitedNotes = notesLines.slice(0, 2);
            const notesHeight = limitedNotes.length * 3 + 4;
            doc.roundedRect(15, currentY - 1, 180, notesHeight, 1.5, 1.5, 'F');
            doc.text(limitedNotes, 18, currentY + 2);
            currentY += notesHeight + 3;
        }

        // ==========================================
        // TOTALS
        // ==========================================
        if (currentY > 220) {
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
        doc.text(invoice.subtotal.toFixed(2), 195, currentY, { align: 'right' });
        currentY += 5;

        if (invoice.tax_amount > 0) {
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Tax (${invoice.tax_rate}%)`, totalsX, currentY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(invoice.tax_amount.toFixed(2), 195, currentY, { align: 'right' });
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
        doc.text('$' + invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
        currentY += 11;

        // Amount Paid
        if (invoice.amount_paid > 0) {
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(167, 243, 208);
            doc.setLineWidth(0.2);
            doc.roundedRect(totalsX - 3, currentY - 3, 53, 9, 1.5, 1.5, 'FD');
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text('Amount Paid', totalsX, currentY + 2);
            
            doc.setFontSize(10);
            doc.text('-$' + invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
            currentY += 11;
        }

        // Balance Due
        if (hasBalance) {
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(totalsX - 3, currentY - 3, 53, 9, 1.5, 1.5, 'F');
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Balance Due', totalsX, currentY + 2);
            
            doc.setFontSize(13);
            doc.text('$' + invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
            currentY += 13;
        } else {
            currentY += 8;
        }

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
            { label: 'Payment:', text: 'Due in 30 days unless otherwise specified. Late payments incur 1.5% monthly interest.' },
            { label: 'Collections:', text: 'Client responsible for all collection costs including attorney fees.' },
            { label: 'Disputes:', text: 'Report discrepancies within 5 days in writing. Non-reporting constitutes acceptance.' },
            { label: 'Scope:', text: 'Final cost reflects estimated scope and approved Change Orders. Undisputed amounts due by due date.' }
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
                'Content-Disposition': `attachment; filename=${invoice.invoice_number}-${invoice.customer_name}.pdf`
            }
        });
    } catch (error) {
        console.error('PDF generation error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});