// PDF Profesional - Versión Corregida para Invoice
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
        // HEADER BANNER (BLACK)
        // ==========================================
        doc.setFillColor(0, 0, 0);
        doc.rect(0, 0, 210, 40, 'F');

        // Logo
        try {
            const logoUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/40cfa838e_Screenshot2025-11-12at102825PM.png';
            const logoResponse = await fetch(logoUrl);
            const logoBlob = await logoResponse.blob();
            const logoBase64 = btoa(String.fromCharCode(...new Uint8Array(await logoBlob.arrayBuffer())));
            doc.addImage(`data:image/png;base64,${logoBase64}`, 'PNG', 15, 10, 60, 14);
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
        // TABLE HEADER - 5 COLUMNS
        // ==========================================
        doc.setFillColor(51, 65, 85);
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

        for (const item of invoice.items || []) {
            if (currentY > 260) { doc.addPage(); currentY = 20; }

            // Row background
            if (itemIndex % 2 === 0) {
                doc.setFillColor(249, 250, 251);
                doc.rect(15, currentY, 180, 8, 'F');
            }

            doc.setFont(undefined, 'normal');
            doc.text(itemIndex.toString(), 18, currentY + 5.5);
            
            // Truncate description to fit column
            const desc = item.item_name || item.description || '';
            const truncatedDesc = desc.length > 55 ? desc.substring(0, 52) + '...' : desc;
            doc.setFont(undefined, 'bold');
            doc.text(truncatedDesc, 30, currentY + 5.5);

            doc.setFont(undefined, 'normal');
            const qtyText = `${item.quantity || 0} ${item.unit || ''}`;
            doc.text(qtyText, 140, currentY + 5.5, { align: 'right' });
            doc.text((item.unit_price || 0).toFixed(2), 165, currentY + 5.5, { align: 'right' });
            doc.setFont(undefined, 'bold');
            doc.text((item.total || 0).toFixed(2), 190, currentY + 5.5, { align: 'right' });

            doc.setDrawColor(241, 245, 249);
            doc.line(15, currentY + 8, 195, currentY + 8);
            currentY += 8;
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

        // Gray box for Total
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(totalX - 2, currentY, 57, 10, 1, 1, 'F');
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
        return Response.json({ error: error.message }, { status: 500 });
    }
});