import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 3A: Quote → Job Backfill (TIER 1 - DETERMINISTIC)
 * 
 * Backfills job_id for Quotes using ONLY deterministic, high-confidence signals.
 * Method: Trace through linked Invoices (invoice_id → Invoice.job_id)
 * 
 * SAFE ONLY - No UI changes, no Job creation, no duplicate prevention
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Unauthorized. Admin only.' 
      }, { status: 403 });
    }

    const { dry_run = false } = await req.json().catch(() => ({}));

    console.log(`🔧 PHASE 3A: Quote → Job Backfill (Tier 1 - Deterministic)`);
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}\n`);

    const results = {
      tier: 1,
      method: 'invoice_trace',
      dry_run,
      timestamp: new Date().toISOString(),
      quotes_scanned: 0,
      quotes_eligible: 0,
      quotes_backfilled: 0,
      quotes_skipped: 0,
      skip_reasons: {
        no_invoice_link: 0,
        invoice_not_found: 0,
        invoice_no_job_id: 0,
        already_has_job_id: 0,
        multiple_invoices: 0
      },
      changes: [],
      errors: []
    };

    // 1. Fetch all Quotes
    console.log('📋 Fetching all Quotes...');
    const quotes = await base44.asServiceRole.entities.Quote.filter({});
    results.quotes_scanned = quotes.length;
    console.log(`  Found ${quotes.length} quotes\n`);

    // 2. Fetch all Invoices for reference
    console.log('📋 Fetching all Invoices...');
    const invoices = await base44.asServiceRole.entities.Invoice.filter({});
    console.log(`  Found ${invoices.length} invoices\n`);

    // Build invoice lookup maps
    const invoiceById = new Map();
    const invoiceByNumber = new Map();
    
    for (const inv of invoices) {
      invoiceById.set(inv.id, inv);
      if (inv.invoice_number) {
        if (invoiceByNumber.has(inv.invoice_number)) {
          console.warn(`  ⚠️ Duplicate invoice number: ${inv.invoice_number}`);
        }
        invoiceByNumber.set(inv.invoice_number, inv);
      }
    }

    // 3. Process each Quote
    console.log('🔍 Processing Quotes...\n');
    
    for (const quote of quotes) {
      const quoteLabel = `${quote.quote_number || quote.id}`;
      
      // Skip if already has job_id (idempotent)
      if (quote.job_id) {
        results.quotes_skipped++;
        results.skip_reasons.already_has_job_id++;
        continue;
      }

      // Check if Quote has Invoice link
      if (!quote.invoice_id && !quote.invoice_number) {
        results.quotes_skipped++;
        results.skip_reasons.no_invoice_link++;
        continue;
      }

      // Find the linked Invoice
      let linkedInvoice = null;
      
      if (quote.invoice_id) {
        linkedInvoice = invoiceById.get(quote.invoice_id);
      } else if (quote.invoice_number) {
        linkedInvoice = invoiceByNumber.get(quote.invoice_number);
      }

      // Invoice not found
      if (!linkedInvoice) {
        results.quotes_skipped++;
        results.skip_reasons.invoice_not_found++;
        console.log(`  ⏭️  ${quoteLabel}: Invoice not found`);
        continue;
      }

      // Invoice has no job_id
      if (!linkedInvoice.job_id) {
        results.quotes_skipped++;
        results.skip_reasons.invoice_no_job_id++;
        console.log(`  ⏭️  ${quoteLabel}: Invoice ${linkedInvoice.invoice_number} has no job_id`);
        continue;
      }

      // Verify the Job exists
      const jobExists = await base44.asServiceRole.entities.Job.get(linkedInvoice.job_id)
        .catch(() => null);

      if (!jobExists) {
        results.quotes_skipped++;
        results.skip_reasons.invoice_no_job_id++;
        console.log(`  ⏭️  ${quoteLabel}: Job ${linkedInvoice.job_id} not found`);
        continue;
      }

      // SUCCESS - We can backfill!
      results.quotes_eligible++;

      if (!dry_run) {
        try {
          await base44.asServiceRole.entities.Quote.update(quote.id, {
            job_id: linkedInvoice.job_id,
            job_link_backfilled: true,
            job_link_method: 'invoice_trace'
          });

          results.quotes_backfilled++;
          results.changes.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            job_id: linkedInvoice.job_id,
            job_name: jobExists.name,
            via_invoice: linkedInvoice.invoice_number
          });

          console.log(`  ✅ ${quoteLabel} → Job ${linkedInvoice.job_id} (via Invoice ${linkedInvoice.invoice_number})`);
        } catch (error) {
          results.errors.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            error: error.message
          });
          console.error(`  ❌ ${quoteLabel}: ${error.message}`);
        }
      } else {
        results.quotes_backfilled++;
        results.changes.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          job_id: linkedInvoice.job_id,
          job_name: jobExists.name,
          via_invoice: linkedInvoice.invoice_number
        });
        console.log(`  🔍 DRY RUN: ${quoteLabel} → Job ${linkedInvoice.job_id} (via Invoice ${linkedInvoice.invoice_number})`);
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TIER 1 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Quotes scanned: ${results.quotes_scanned}`);
    console.log(`Quotes eligible: ${results.quotes_eligible}`);
    console.log(`Quotes backfilled: ${results.quotes_backfilled}`);
    console.log(`Quotes skipped: ${results.quotes_skipped}`);
    console.log('\nSkip Reasons:');
    console.log(`  - Already has job_id: ${results.skip_reasons.already_has_job_id}`);
    console.log(`  - No invoice link: ${results.skip_reasons.no_invoice_link}`);
    console.log(`  - Invoice not found: ${results.skip_reasons.invoice_not_found}`);
    console.log(`  - Invoice has no job_id: ${results.skip_reasons.invoice_no_job_id}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${results.errors.length}`);
    }

    const successRate = results.quotes_eligible > 0 
      ? ((results.quotes_backfilled / results.quotes_eligible) * 100).toFixed(1)
      : '0.0';
    
    console.log(`\n✅ Success Rate: ${successRate}%`);
    console.log('='.repeat(60));

    if (!dry_run && results.quotes_backfilled > 0) {
      console.log('\n💡 Next step: Run runJobBackfillSafetyCheckpoint to validate');
    }

    return Response.json({
      ...results,
      success: true,
      ready_for_tier_2: results.quotes_backfilled > 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});