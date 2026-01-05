// PDF Profesional - Versión Corregida para Invoice
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';
import { jsPDF } from 'npm:jspdf@2.5.1';
import { requireUser, verifyOwnership, safeJsonError } from './_auth.js';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await requireUser(base44);

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

        const doc = new jsPDF();
        const hasBalance = invoice.balance > 0;
        const isPaid = invoice.status === 'paid';

        // ==========================================
        // HEADER BANNER (BLACK)
        // ==========================================
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo - Fixed with chunked conversion
        try {
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png';
            const logoResponse = await fetch(logoUrl);
            const arrayBuffer = await logoResponse.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            
            // Convert to base64 in chunks to avoid stack overflow
            let binary = '';
            const chunkSize = 8192;
            const len = bytes.byteLength;
            
            for (let i = 0; i < len; i += chunkSize) {
                const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
                binary += String.fromCharCode.apply(null, Array.from(chunk));
            }
            
            const logoBase64 = btoa(binary);
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 15, 10, 50, 15);
        } catch (err) {
            console.log('Logo load error:', err);
        }

        // Title and Balance
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(32);
        doc.setFont(undefined, 'bold');
        doc.text('INVOICE', 195, 20, { align: 'right' });

        if (hasBalance && !isPaid) {
            doc.setFontSize(10);
            doc.text('BALANCE DUE', 160, 28, { align: 'right' });
            doc.setFontSize(16);
            doc.text('$' + invoice.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }), 195, 28, { align: 'right' });
        }

        if (isPaid) {
            doc.setFontSize(14);
            doc.setTextColor(52, 211, 153);
            doc.text('✓ PAID', 195, 28, { align: 'right' });
        }

        // ==========================================
        // INFO SECTIONS
        // ==========================================
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text('Modern Components Installation', 15, 50);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(['2414 Meadow Isle Ln', 'Lawrenceville Georgia 30043', 'U.S.A', 'Phone: 470-209-3783'], 15, 55);

        // Bill To & Invoice Info
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(invoice.customer_name || 'Customer', 15, 80);

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(100, 116, 139);
        const infoX = 150;
        doc.text('Invoice#:', infoX, 75);
        doc.text('Invoice Date:', infoX, 80);
        doc.text('Due Date:', infoX, 85);

        doc.setTextColor(15, 23, 42);
        doc.setFont(undefined, 'bold');
        doc.text(invoice.invoice_number || '', 195, 75, { align: 'right' });
        doc.text(invoice.invoice_date || '', 195, 80, { align: 'right' });
        doc.text(invoice.due_date || '', 195, 85, { align: 'right' });

        // Job Details
        let currentY = 95;
        if (invoice.job_name) {
            doc.setFontSize(8);
            doc.setTextColor(100, 116, 139);
            doc.text('Job Details:', 15, currentY);
            doc.setFontSize(9);
            doc.setFont(undefined, 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(invoice.job_name, 15, currentY + 5);
            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.text(invoice.job_address || '', 15, currentY + 9);
            currentY += 18;
        }

        // ==========================================
        // TABLE HEADER - 5 COLUMNS - smooth gradient
        // ==========================================
        const tableHeaderY = currentY;
        const headerSteps = 100;
        for (let i = 0; i < headerSteps; i++) {
            const x = 15 + (180 / headerSteps) * i;
            const width = (180 / headerSteps) + 0.5;
            const gray = Math.floor(i * (120 / headerSteps));
            doc.setFillColor(gray, gray, gray);
            doc.rect(x, tableHeaderY, width, 10, 'F');
        }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(9);
        doc.setFont(undefined, 'bold');
        doc.text('#', 18, tableHeaderY + 6.5);
        doc.text('ITEM & DESCRIPTION', 30, tableHeaderY + 6.5);
        doc.text('QTY', 140, tableHeaderY + 6.5, { align: 'right' });
        doc.text('RATE', 165, tableHeaderY + 6.5, { align: 'right' });
        doc.text('AMOUNT', 190, tableHeaderY + 6.5, { align: 'right' });

        // ==========================================
        // ITEMS
        // ==========================================
        currentY = tableHeaderY + 10;
        doc.setTextColor(15, 23, 42);
        let itemIndex = 1;

        for (const item of invoice.items || []) {
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
        // TOTALS BOX
        // ==========================================
        currentY += 10;
        const totalX = 140;
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text('Sub Total', totalX, currentY);
        doc.text(invoice.subtotal.toFixed(2), 195, currentY, { align: 'right' });
        
        currentY += 6;
        if (invoice.tax_amount > 0) {
            doc.text(`Tax (${invoice.tax_rate}%)`, totalX, currentY);
            doc.text(invoice.tax_amount.toFixed(2), 195, currentY, { align: 'right' });
            currentY += 6;
        }

        // Gray gradient box for Total - smooth
        const totalBoxSteps = 100;
        for (let i = 0; i < totalBoxSteps; i++) {
            const x = (totalX - 2) + (57 / totalBoxSteps) * i;
            const width = (57 / totalBoxSteps) + 0.5;
            const gray = 241 - Math.floor(i * (36 / totalBoxSteps));
            doc.setFillColor(gray, gray - 4, gray - 8);
            doc.rect(x, currentY, width, 10, 'F');
        }
        doc.setDrawColor(30, 30, 30);
        doc.setLineWidth(0.8);
        doc.line(totalX - 2, currentY, totalX + 55, currentY);
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text('TOTAL', totalX + 2, currentY + 6.5);
        doc.text('$' + invoice.total.toLocaleString('en-US', { minimumFractionDigits: 2 }), 195, currentY + 6.5, { align: 'right' });

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
                'Content-Disposition': `attachment; filename="Invoice-${invoice.invoice_number}.pdf"`
            }
        });
    } catch (error) {
        if (error instanceof Response) throw error;
        return safeJsonError('Failed to generate PDF', 500, error.message);
    }
});