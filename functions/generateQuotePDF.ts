// PDF Profesional usando Puppeteer para renderizado exacto
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

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

        // Generate HTML that matches QuoteDocument component
        const html = generateQuoteHTML(quote);

        // Use Puppeteer to render HTML to PDF with exact styling
        const puppeteer = await import('https://deno.land/x/puppeteer@16.2.0/mod.ts');
        
        const browser = await puppeteer.default.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBytes = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '1cm',
                right: '1cm',
                bottom: '1cm',
                left: '1cm'
            }
        });
        
        await browser.close();
        return new Response(pdfBytes, {
            headers: { 
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="Quote-${quote.quote_number}.pdf"`
            }
        });
    } catch (error) {
        console.error('PDF Generation Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});

function generateQuoteHTML(quote) {
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = String(date.getFullYear()).slice(-2);
        return `${month}.${day}.${year}`;
    };

    const items = quote.items || [];
    
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: white;
            padding: 40px;
            color: #000;
        }
        .header {
            background: linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%);
            padding: 24px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: -40px -40px 24px -40px;
        }
        .logo { height: 56px; }
        .title { color: white; font-size: 48px; font-weight: bold; letter-spacing: 0.05em; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 32px; }
        .company-info { font-size: 14px; line-height: 1.6; }
        .company-name { font-weight: bold; color: #0f172a; }
        .bill-to-label { font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 16px; margin-bottom: 4px; }
        .customer-name { font-size: 18px; font-weight: bold; color: #0f172a; }
        .quote-info { text-align: right; font-size: 14px; }
        .info-row { display: flex; justify-content: space-between; padding-bottom: 4px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; }
        .info-label { color: #64748b; }
        .info-value { font-weight: bold; }
        .job-section { margin-bottom: 32px; }
        .job-label { font-size: 14px; color: #475569; margin-bottom: 4px; }
        .job-name { font-size: 16px; font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .job-address { font-size: 14px; color: #334155; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
        thead { background: linear-gradient(to right, #000000 0%, #4a4a4a 100%); color: white; }
        th { text-align: left; padding: 8px 12px; font-size: 12px; text-transform: uppercase; font-weight: bold; }
        th:nth-child(1) { width: 40px; }
        th:nth-child(3), th:nth-child(4), th:nth-child(5) { text-align: right; }
        th:nth-child(3) { width: 80px; }
        th:nth-child(4) { width: 96px; }
        th:nth-child(5) { width: 112px; }
        td { padding: 16px 12px; vertical-align: top; border-bottom: 1px solid #e2e8f0; font-size: 14px; }
        td:nth-child(1) { color: #94a3b8; }
        td:nth-child(3), td:nth-child(4), td:nth-child(5) { text-align: right; }
        .item-name { font-weight: bold; color: #0f172a; margin-bottom: 4px; }
        .item-desc { font-size: 12px; color: #475569; }
        .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
        .totals-box { width: 256px; }
        .subtotal-row { display: flex; justify-content: space-between; font-size: 14px; padding: 0 8px; margin-bottom: 8px; }
        .subtotal-label { color: #64748b; }
        .total-row { 
            background: linear-gradient(to right, #f1f5f9 0%, #cbd5e1 100%);
            padding: 12px 16px;
            border-radius: 4px;
            border-top: 2px solid #1e293b;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .total-label { font-weight: bold; color: #0f172a; }
        .total-value { font-weight: bold; font-size: 20px; color: #0f172a; }
        .terms { margin-top: 32px; }
        .terms-title { font-size: 14px; font-weight: bold; color: #0f172a; margin-bottom: 8px; }
        .terms-content { font-size: 14px; color: #334155; line-height: 1.8; }
        .terms-content p { margin-bottom: 6px; }
    </style>
</head>
<body>
    <div class="header">
        <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/32dbac073_Screenshot2025-12-19at23750PM.png" class="logo" alt="MCI Logo">
        <div class="title">QUOTE</div>
    </div>

    <div class="info-grid">
        <div class="company-info">
            <div class="company-name">Modern Components Installation</div>
            <div>2414 Meadow Isle Ln, Lawrenceville GA 30043</div>
            <div>Phone: 470-209-3783</div>
            <div class="bill-to-label">BILL TO:</div>
            <div class="customer-name">${quote.customer_name || 'Customer'}</div>
        </div>

        <div class="quote-info">
            <div class="info-row">
                <span class="info-label">Quote#</span>
                <span class="info-value">${quote.quote_number || ''}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(quote.quote_date)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Valid Until</span>
                <span class="info-value">${formatDate(quote.valid_until)}</span>
            </div>
        </div>
    </div>

    ${quote.job_name ? `
    <div class="job-section">
        <div class="job-label">Job Details :</div>
        <div class="job-name">${quote.job_name}</div>
        ${quote.job_address ? `<div class="job-address">${quote.job_address}</div>` : ''}
    </div>
    ` : ''}

    <table>
        <thead>
            <tr>
                <th>#</th>
                <th>ITEM & DESCRIPTION</th>
                <th>QTY</th>
                <th>RATE</th>
                <th>AMOUNT</th>
            </tr>
        </thead>
        <tbody>
            ${items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div class="item-name">${item.item_name || item.description || ''}</div>
                        ${item.item_name && item.description ? `<div class="item-desc">${item.description}</div>` : ''}
                    </td>
                    <td>${item.quantity || 0} ${item.unit || ''}</td>
                    <td>$${(item.unit_price || 0).toFixed(2)}</td>
                    <td style="font-weight: bold;">$${(item.total || 0).toFixed(2)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-box">
            <div class="subtotal-row">
                <span class="subtotal-label">Sub Total</span>
                <span style="font-weight: bold;">$${(quote.subtotal || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
                <span class="total-label">TOTAL</span>
                <span class="total-value">$${(quote.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
        </div>
    </div>

    <div class="terms">
        <div class="terms-title">Terms & Conditions</div>
        <div class="terms-content">
            <p><strong>Approval:</strong> PO required to schedule work.</p>
            <p><strong>Offload:</strong> Standard offload only. Excludes stairs/windows/special equipment. Client provides equipment (forklift or lull). Site access issues may require revised quote.</p>
            <p><strong>Hours:</strong> Regular hours only. OT/after-hours billed separately via Change Order unless otherwise specified.</p>
        </div>
    </div>
</body>
</html>
    `;
}