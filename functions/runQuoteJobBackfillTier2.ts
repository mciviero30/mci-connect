import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 3B: Quote → Job Backfill (TIER 2 - NAME + CUSTOMER MATCH)
 * 
 * Backfills job_id for remaining Quotes using HIGH-CONFIDENCE matching
 * based on Job name + Customer identity.
 * 
 * Method: Match Quote.job_name + Quote.customer_id to existing Jobs
 * Confidence: 0.9 (high but NOT deterministic)
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

    console.log(`🔧 PHASE 3B: Quote → Job Backfill (Tier 2 - Name + Customer Match)`);
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}\n`);

    const results = {
      tier: 2,
      method: 'name_customer_match',
      dry_run,
      timestamp: new Date().toISOString(),
      quotes_scanned: 0,
      quotes_eligible: 0,
      quotes_backfilled: 0,
      quotes_skipped: 0,
      skip_reasons: {
        already_has_job_id: 0,
        missing_job_name: 0,
        missing_customer_id: 0,
        no_matching_jobs: 0,
        multiple_matching_jobs: 0,
        job_archived: 0
      },
      changes: [],
      errors: []
    };

    // 1. Fetch all Quotes without job_id
    console.log('📋 Fetching Quotes without job_id...');
    const allQuotes = await base44.asServiceRole.entities.Quote.filter({});
    const quotesWithoutJob = allQuotes.filter(q => !q.job_id);
    
    results.quotes_scanned = quotesWithoutJob.length;
    console.log(`  Found ${quotesWithoutJob.length} quotes without job_id\n`);

    if (quotesWithoutJob.length === 0) {
      console.log('✅ No quotes to process. All quotes have job_id.\n');
      return Response.json({
        ...results,
        success: true,
        message: 'No quotes to process'
      });
    }

    // 2. Fetch all active Jobs
    console.log('📋 Fetching all Jobs...');
    const allJobs = await base44.asServiceRole.entities.Job.filter({});
    const activeJobs = allJobs.filter(j => 
      j.status !== 'archived' && 
      !j.deleted_at
    );
    console.log(`  Found ${activeJobs.length} active jobs\n`);

    // Build job lookup by normalized name + customer_id
    const jobsByKey = new Map();
    
    for (const job of activeJobs) {
      if (!job.name) continue;
      
      const normalizedName = job.name.trim().toLowerCase();
      const customerId = job.customer_id || '';
      const key = `${normalizedName}|||${customerId}`;
      
      if (!jobsByKey.has(key)) {
        jobsByKey.set(key, []);
      }
      jobsByKey.get(key).push(job);
    }

    // 3. Process each Quote
    console.log('🔍 Processing Quotes...\n');
    
    for (const quote of quotesWithoutJob) {
      const quoteLabel = `${quote.quote_number || quote.id}`;
      
      // Check required fields
      if (!quote.job_name || quote.job_name.trim() === '') {
        results.quotes_skipped++;
        results.skip_reasons.missing_job_name++;
        console.log(`  ⏭️  ${quoteLabel}: Missing job_name`);
        continue;
      }

      if (!quote.customer_id) {
        results.quotes_skipped++;
        results.skip_reasons.missing_customer_id++;
        console.log(`  ⏭️  ${quoteLabel}: Missing customer_id`);
        continue;
      }

      // Build lookup key
      const normalizedName = quote.job_name.trim().toLowerCase();
      const key = `${normalizedName}|||${quote.customer_id}`;
      
      const matchingJobs = jobsByKey.get(key) || [];

      // No matches
      if (matchingJobs.length === 0) {
        results.quotes_skipped++;
        results.skip_reasons.no_matching_jobs++;
        continue;
      }

      // Multiple matches (ambiguous)
      if (matchingJobs.length > 1) {
        results.quotes_skipped++;
        results.skip_reasons.multiple_matching_jobs++;
        console.log(`  ⏭️  ${quoteLabel}: ${matchingJobs.length} matching jobs found (ambiguous)`);
        continue;
      }

      // Exactly 1 match - SUCCESS!
      const matchedJob = matchingJobs[0];
      results.quotes_eligible++;

      if (!dry_run) {
        try {
          await base44.asServiceRole.entities.Quote.update(quote.id, {
            job_id: matchedJob.id,
            job_link_backfilled: true,
            job_link_method: 'name_customer_match',
            backfill_confidence: 90
          });

          results.quotes_backfilled++;
          results.changes.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            job_id: matchedJob.id,
            job_name: matchedJob.name,
            customer_name: quote.customer_name,
            confidence: 90
          });

          console.log(`  ✅ ${quoteLabel} → Job ${matchedJob.id} (${matchedJob.name})`);
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
          job_id: matchedJob.id,
          job_name: matchedJob.name,
          customer_name: quote.customer_name,
          confidence: 90
        });
        console.log(`  🔍 DRY RUN: ${quoteLabel} → Job ${matchedJob.id} (${matchedJob.name})`);
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TIER 2 BACKFILL SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Quotes scanned: ${results.quotes_scanned}`);
    console.log(`Quotes eligible: ${results.quotes_eligible}`);
    console.log(`Quotes backfilled: ${results.quotes_backfilled}`);
    console.log(`Quotes skipped: ${results.quotes_skipped}`);
    console.log('\nSkip Reasons:');
    console.log(`  - Missing job_name: ${results.skip_reasons.missing_job_name}`);
    console.log(`  - Missing customer_id: ${results.skip_reasons.missing_customer_id}`);
    console.log(`  - No matching jobs: ${results.skip_reasons.no_matching_jobs}`);
    console.log(`  - Multiple matches (ambiguous): ${results.skip_reasons.multiple_matching_jobs}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${results.errors.length}`);
    }

    const successRate = results.quotes_eligible > 0 
      ? ((results.quotes_backfilled / results.quotes_eligible) * 100).toFixed(1)
      : '0.0';
    
    console.log(`\n✅ Success Rate: ${successRate}%`);
    
    const remainingOrphans = results.quotes_scanned - results.quotes_backfilled;
    console.log(`\n📊 Remaining orphan quotes: ${remainingOrphans}`);
    console.log('='.repeat(60));

    if (!dry_run && results.quotes_backfilled > 0) {
      console.log('\n💡 Next step: Run runJobBackfillSafetyCheckpoint to validate');
    }

    return Response.json({
      ...results,
      success: true,
      remaining_orphans: remainingOrphans,
      ready_for_tier_3: remainingOrphans > 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});