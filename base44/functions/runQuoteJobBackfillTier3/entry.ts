import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * PHASE 3C: Quote → Job Backfill (TIER 3 - CONTROLLED AUTO-CREATE)
 * 
 * FINAL backfill step: Eliminates remaining orphan Quotes by auto-creating Jobs
 * ONLY when no existing Job can be matched.
 * 
 * Method: Auto-create Jobs for unmatched Quotes
 * Confidence: 0.6 (controlled creation)
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

    console.log(`🔧 PHASE 3C: Quote → Job Backfill (Tier 3 - Controlled Auto-Create)`);
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}\n`);

    const results = {
      tier: 3,
      method: 'auto_create',
      dry_run,
      timestamp: new Date().toISOString(),
      orphan_quotes_entering: 0,
      jobs_created: 0,
      quotes_linked: 0,
      quotes_skipped: 0,
      skip_reasons: {
        missing_job_name: 0,
        job_name_too_short: 0,
        missing_customer_id: 0,
        existing_job_found: 0
      },
      changes: [],
      errors: []
    };

    // 1. Fetch all Quotes without job_id
    console.log('📋 Fetching orphan Quotes...');
    const allQuotes = await base44.asServiceRole.entities.Quote.filter({});
    const orphanQuotes = allQuotes.filter(q => !q.job_id && !q.deleted_at);
    
    results.orphan_quotes_entering = orphanQuotes.length;
    console.log(`  Found ${orphanQuotes.length} orphan quotes\n`);

    if (orphanQuotes.length === 0) {
      console.log('✅ No orphan quotes. Phase 3C complete.\n');
      return Response.json({
        ...results,
        success: true,
        message: 'No orphan quotes remaining'
      });
    }

    // 2. Fetch all Jobs for matching check
    console.log('📋 Fetching all Jobs for duplicate check...');
    const allJobs = await base44.asServiceRole.entities.Job.filter({});
    const activeJobs = allJobs.filter(j => !j.deleted_at);
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

    // 3. Process each orphan Quote
    console.log('🔍 Processing orphan Quotes...\n');
    
    for (const quote of orphanQuotes) {
      const quoteLabel = `${quote.quote_number || quote.id}`;
      
      // Safety guard: job_name required
      if (!quote.job_name || quote.job_name.trim() === '') {
        results.quotes_skipped++;
        results.skip_reasons.missing_job_name++;
        console.log(`  ⏭️  ${quoteLabel}: Missing job_name`);
        continue;
      }

      // Safety guard: job_name too short
      if (quote.job_name.trim().length < 3) {
        results.quotes_skipped++;
        results.skip_reasons.job_name_too_short++;
        console.log(`  ⏭️  ${quoteLabel}: job_name too short (${quote.job_name})`);
        continue;
      }

      // Safety guard: customer_id required
      if (!quote.customer_id) {
        results.quotes_skipped++;
        results.skip_reasons.missing_customer_id++;
        console.log(`  ⏭️  ${quoteLabel}: Missing customer_id`);
        continue;
      }

      // Check if Job already exists (safety check)
      const normalizedName = quote.job_name.trim().toLowerCase();
      const key = `${normalizedName}|||${quote.customer_id}`;
      
      const existingJobs = jobsByKey.get(key) || [];
      
      if (existingJobs.length > 0) {
        results.quotes_skipped++;
        results.skip_reasons.existing_job_found++;
        console.log(`  ⏭️  ${quoteLabel}: Job already exists (${existingJobs[0].id})`);
        continue;
      }

      // ELIGIBLE for auto-creation
      if (!dry_run) {
        try {
          // Create new Job
          const newJob = await base44.asServiceRole.entities.Job.create({
            name: quote.job_name.trim(),
            customer_id: quote.customer_id,
            customer_name: quote.customer_name || '',
            status: 'active',
            backfill_source: 'quote_auto_create',
            backfill_confidence: 60,
            backfill_completed_at: new Date().toISOString(),
            // Inherit basic info from Quote
            address: quote.job_address || '',
            description: `Auto-created from Quote ${quote.quote_number || quote.id}`
          });

          // Link Quote to new Job
          await base44.asServiceRole.entities.Quote.update(quote.id, {
            job_id: newJob.id,
            job_link_backfilled: true,
            job_link_method: 'auto_create',
            backfill_confidence: 60
          });

          // Add to lookup to prevent duplicates in same run
          if (!jobsByKey.has(key)) {
            jobsByKey.set(key, []);
          }
          jobsByKey.get(key).push(newJob);

          results.jobs_created++;
          results.quotes_linked++;
          results.changes.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            new_job_id: newJob.id,
            job_name: newJob.name,
            customer_name: quote.customer_name
          });

          console.log(`  ✅ ${quoteLabel} → Created Job ${newJob.id} (${newJob.name})`);
        } catch (error) {
          results.errors.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            error: error.message
          });
          console.error(`  ❌ ${quoteLabel}: ${error.message}`);
        }
      } else {
        // Dry run
        results.jobs_created++;
        results.quotes_linked++;
        results.changes.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          new_job_id: '[DRY RUN]',
          job_name: quote.job_name.trim(),
          customer_name: quote.customer_name
        });
        console.log(`  🔍 DRY RUN: ${quoteLabel} → Would create Job (${quote.job_name})`);
      }
    }

    // 4. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TIER 3 AUTO-CREATE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mode: ${dry_run ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Orphan quotes entering Phase 3C: ${results.orphan_quotes_entering}`);
    console.log(`Jobs auto-created: ${results.jobs_created}`);
    console.log(`Quotes successfully linked: ${results.quotes_linked}`);
    console.log(`Quotes skipped: ${results.quotes_skipped}`);
    console.log('\nSkip Reasons:');
    console.log(`  - Missing job_name: ${results.skip_reasons.missing_job_name}`);
    console.log(`  - job_name too short (<3 chars): ${results.skip_reasons.job_name_too_short}`);
    console.log(`  - Missing customer_id: ${results.skip_reasons.missing_customer_id}`);
    console.log(`  - Existing Job found: ${results.skip_reasons.existing_job_found}`);
    
    if (results.errors.length > 0) {
      console.log(`\n⚠️  Errors: ${results.errors.length}`);
    }

    const successRate = results.orphan_quotes_entering > 0 
      ? ((results.quotes_linked / results.orphan_quotes_entering) * 100).toFixed(1)
      : '0.0';
    
    console.log(`\n✅ Success Rate: ${successRate}%`);
    
    const finalOrphans = results.orphan_quotes_entering - results.quotes_linked;
    console.log(`\n📊 Final orphan quote count: ${finalOrphans}`);
    
    if (finalOrphans === 0) {
      console.log('🎉 ALL QUOTES NOW LINKED! Phase 3C complete.');
    }
    
    console.log('='.repeat(60));

    if (!dry_run && results.quotes_linked > 0) {
      console.log('\n💡 Next step: Run runJobBackfillSafetyCheckpoint to validate');
    }

    return Response.json({
      ...results,
      success: true,
      final_orphan_count: finalOrphans,
      phase_3c_complete: finalOrphans === 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});