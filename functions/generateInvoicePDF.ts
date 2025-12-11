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

        // INVOICE title and balance/paid status in header
        doc.setFontSize(36);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('INVOICE', 195, 15, { align: 'right' });

        if (hasBalance) {
            doc.setFontSize(10);
            doc.text('BALANCE DUE', 195, 22, { align: 'right' });
            doc.setFontSize(16);
            doc.text('$' + invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, 27, { align: 'right' });
        }

        if (isPaid) {
            doc.setFontSize(14);
            doc.setTextColor(52, 211, 153); // emerald
            doc.text('✓ PAID', 195, 25, { align: 'right' });
        }

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

        // Bill To
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(invoice.customer_name, 15, 65);

        // Invoice info (right aligned)
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        let infoY = 65;

        doc.text('Invoice#', 155, infoY);
        doc.setFont(undefined, 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text(invoice.invoice_number, 195, infoY, { align: 'right' });
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        infoY += 5;

        if (invoice.invoice_date) {
            doc.text('Invoice Date', 155, infoY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            const invDate = new Date(invoice.invoice_date);
            doc.text(`${String(invDate.getMonth() + 1).padStart(2, '0')}.${String(invDate.getDate()).padStart(2, '0')}.${String(invDate.getFullYear()).slice(-2)}`, 195, infoY, { align: 'right' });
            doc.setFont(undefined, 'normal');
            doc.setTextColor(100, 116, 139);
            infoY += 5;
        }

        if (invoice.due_date) {
            doc.text('Due Date', 155, infoY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            const dueDate = new Date(invoice.due_date);
            doc.text(`${String(dueDate.getMonth() + 1).padStart(2, '0')}.${String(dueDate.getDate()).padStart(2, '0')}.${String(dueDate.getFullYear()).slice(-2)}`, 195, infoY, { align: 'right' });
        }

        // Job Details
        let currentY = 82;
        if (invoice.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.setFont(undefined, 'normal');
            doc.text('Job Details :', 15, currentY);
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(invoice.job_name, 15, currentY + 5);
            
            if (invoice.job_address) {
                doc.setFontSize(8);
                doc.setFont(undefined, 'normal');
                doc.setTextColor(71, 85, 105);
                const addressLines = doc.splitTextToSize(invoice.job_address, 180);
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
        doc.text('ITEM & DESCRIPTION', 30, currentY + 5);
        doc.text('AMOUNT', 195, currentY + 5, { align: 'right' });

        doc.setTextColor(0, 0, 0);
        currentY += 12;

        // Items
        doc.setFontSize(8);
        let itemIndex = 1;

        for (const item of invoice.items || []) {
            if (currentY > 250) {
                doc.addPage();
                currentY = 20;
                
                // Repeat header
                doc.setFillColor(51, 65, 85);
                doc.rect(15, currentY, 180, 8, 'F');
                doc.setFont(undefined, 'bold');
                doc.setTextColor(255, 255, 255);
                doc.text('#', 18, currentY + 5);
                doc.text('ITEM & DESCRIPTION', 30, currentY + 5);
                doc.text('AMOUNT', 195, currentY + 5, { align: 'right' });
                doc.setTextColor(0, 0, 0);
                currentY += 12;
            }

            const itemStartY = currentY;

            // Item number
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(itemIndex.toString(), 18, currentY);

            // Item name & description
            const maxDescWidth = 155;
            
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

            // Calculation line
            if (item.quantity && item.unit_price) {
                doc.setFontSize(7);
                doc.setTextColor(100, 116, 139);
                const calcText = `${item.quantity.toFixed(2)}${item.unit ? ' ' + item.unit : ''} × ${item.unit_price.toFixed(2)}`;
                doc.text(calcText, 30, currentY);
                currentY += 4;
            }

            // Amount (aligned to item start)
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('$' + (item.total || 0).toFixed(2), 195, itemStartY, { align: 'right' });

            // Separator
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.1);
            doc.line(15, currentY + 1, 195, currentY + 1);

            currentY += 5;
            itemIndex++;
        }

        // Notes
        if (invoice.notes) {
            currentY += 5;
            if (currentY > 220) {
                doc.addPage();
                currentY = 20;
            }
            
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text('Notes', 15, currentY);
            currentY += 4;
            
            doc.setFillColor(248, 250, 252);
            const notesLines = doc.splitTextToSize(invoice.notes, 175);
            const notesHeight = notesLines.length * 4 + 6;
            doc.roundedRect(15, currentY - 2, 180, notesHeight, 2, 2, 'F');
            
            doc.setFontSize(8);
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(notesLines, 18, currentY + 2);
            currentY += notesHeight + 5;
        }

        // Totals
        if (currentY > 200) {
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
        doc.text(invoice.subtotal.toFixed(2), 195, currentY, { align: 'right' });
        currentY += 6;

        if (invoice.tax_amount > 0) {
            doc.setFont(undefined, 'normal');
            doc.setTextColor(71, 85, 105);
            doc.text(`Tax (${invoice.tax_rate}%)`, totalsX, currentY);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(invoice.tax_amount.toFixed(2), 195, currentY, { align: 'right' });
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
        doc.text('$' + invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
        currentY += 12;

        // Amount Paid
        if (invoice.amount_paid > 0) {
            doc.setFillColor(236, 253, 245);
            doc.setDrawColor(167, 243, 208);
            doc.setLineWidth(0.3);
            doc.roundedRect(totalsX - 5, currentY - 4, 60, 10, 2, 2, 'FD');
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(5, 150, 105);
            doc.text('Amount Paid', totalsX, currentY + 2);
            
            doc.setFontSize(11);
            doc.text('-$' + invoice.amount_paid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
            currentY += 12;
        }

        // Balance Due
        if (hasBalance) {
            doc.setFillColor(15, 23, 42);
            doc.roundedRect(totalsX - 5, currentY - 4, 60, 10, 2, 2, 'F');
            
            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(255, 255, 255);
            doc.text('Balance Due', totalsX, currentY + 2);
            
            doc.setFontSize(14);
            doc.text('$' + invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 195, currentY + 2, { align: 'right' });
            currentY += 15;
        } else {
            currentY += 10;
        }

        // Terms & Conditions at bottom
        if (currentY > 230) {
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
            doc.text(textLines, 15 + labelWidth + 2, currentY);
            currentY += Math.max(4, textLines.length * 4) + 1.5;
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