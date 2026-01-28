import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only enforcement
    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[enableJobSSotEnforcement] Starting enforcement activation...');

    // PREREQUISITE 1: Check for ghost references
    console.log('[enableJobSSotEnforcement] Checking for ghost references...');
    
    const quotesWithInvalidJob = [];
    const allQuotes = await base44.entities.Quote.list('', 1000);
    for (const quote of allQuotes) {
      if (quote.job_id) {
        try {
          await base44.entities.Job.read(quote.job_id);
        } catch (e) {
          quotesWithInvalidJob.push({ quote_id: quote.id, quote_number: quote.quote_number, job_id: quote.job_id });
        }
      }
    }

    const invoicesWithInvalidJob = [];
    const allInvoices = await base44.entities.Invoice.list('', 1000);
    for (const invoice of allInvoices) {
      if (invoice.job_id) {
        try {
          await base44.entities.Job.read(invoice.job_id);
        } catch (e) {
          invoicesWithInvalidJob.push({ invoice_id: invoice.id, invoice_number: invoice.invoice_number, job_id: invoice.job_id });
        }
      }
    }

    const timeEntriesWithInvalidJob = [];
    const allTimeEntries = await base44.entities.TimeEntry.list('', 1000);
    for (const entry of allTimeEntries) {
      if (entry.job_id) {
        try {
          await base44.entities.Job.read(entry.job_id);
        } catch (e) {
          timeEntriesWithInvalidJob.push({ entry_id: entry.id, job_id: entry.job_id });
        }
      }
    }

    if (quotesWithInvalidJob.length > 0 || invoicesWithInvalidJob.length > 0 || timeEntriesWithInvalidJob.length > 0) {
      return Response.json({
        status: 'failed',
        reason: 'Invalid job references detected',
        invalid_quotes: quotesWithInvalidJob,
        invalid_invoices: invoicesWithInvalidJob,
        invalid_time_entries: timeEntriesWithInvalidJob,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // PREREQUISITE 2: Check that ALL Quotes without job_id are marked as intentional
    console.log('[enableJobSSotEnforcement] Checking for orphaned quotes without intentional marker...');
    
    const orphanedQuotes = allQuotes.filter(q => !q.job_id);
    const quotesWithoutIntentionalMarker = orphanedQuotes.filter(q => 
      q.job_link_method !== 'intentionally_orphaned'
    );

    // Defensive logging: show what fields are present on first orphaned quote
    if (orphanedQuotes.length > 0) {
      console.log('[enableJobSSotEnforcement] Sample orphaned quote fields:', Object.keys(orphanedQuotes[0]));
      console.log('[enableJobSSotEnforcement] job_link_method =', orphanedQuotes[0].job_link_method);
    }

    if (quotesWithoutIntentionalMarker.length > 0) {
      return Response.json({
        status: 'failed',
        reason: 'Orphaned quotes without intentional marker found',
        unreviewed_quotes_count: quotesWithoutIntentionalMarker.length,
        sample_quotes: quotesWithoutIntentionalMarker.slice(0, 5).map(q => ({
          quote_id: q.id,
          quote_number: q.quote_number,
          customer_name: q.customer_name,
          job_link_method: q.job_link_method || 'MISSING'
        })),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // PREREQUISITE 3: Check for duplicate jobs
    console.log('[enableJobSSotEnforcement] Checking for duplicate jobs...');
    
    const allJobs = await base44.entities.Job.list('', 1000);
    const duplicates = [];
    const jobMap = {};
    
    for (const job of allJobs) {
      const key = `${job.customer_id || 'NO_CUSTOMER'}::${job.name}`;
      if (jobMap[key]) {
        duplicates.push({ job1: jobMap[key], job2: job.id });
      } else {
        jobMap[key] = job.id;
      }
    }

    if (duplicates.length > 0) {
      return Response.json({
        status: 'failed',
        reason: 'Duplicate jobs detected',
        duplicates_count: duplicates.length,
        duplicates: duplicates.slice(0, 5),
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // ALL PREREQUISITES PASSED - ACTIVATE ENFORCEMENT
    console.log('[enableJobSSotEnforcement] All prerequisites passed. Activating enforcement...');

    // Get or create CompanySettings
    let settings = null;
    try {
      const settingsList = await base44.entities.CompanySettings.list('', 1);
      settings = settingsList[0];
    } catch (e) {
      // No settings exist, create one
      settings = await base44.entities.CompanySettings.create({
        job_ssot_enforced: true,
        job_ssot_enforced_at: new Date().toISOString(),
        job_ssot_version: 1
      });
    }

    // Update existing settings
    if (settings) {
      settings = await base44.entities.CompanySettings.update(settings.id, {
        job_ssot_enforced: true,
        job_ssot_enforced_at: new Date().toISOString(),
        job_ssot_version: 1
      });
    }

    console.log('[enableJobSSotEnforcement] Enforcement activated successfully');

    // CONFIRMATION: Re-read settings and return summary
    const confirmedSettings = await base44.entities.CompanySettings.read(settings.id);

    return Response.json({
      status: 'success',
      message: 'Job SSOT enforcement activated',
      activation_timestamp: new Date().toISOString(),
      enforcement_summary: {
        job_ssot_enforced: confirmedSettings.job_ssot_enforced,
        job_ssot_enforced_at: confirmedSettings.job_ssot_enforced_at,
        job_ssot_version: confirmedSettings.job_ssot_version
      },
      audit_results: {
        total_jobs: allJobs.length,
        total_quotes: allQuotes.length,
        orphaned_quotes_intentional: orphanedQuotes.length,
        total_invoices: allInvoices.length,
        total_time_entries: allTimeEntries.length,
        invalid_references: 0,
        duplicate_jobs: 0
      },
      next_steps: [
        'Job SSOT enforcement is now ACTIVE',
        'Invalid job_id writes will be blocked by guardrails',
        'All Quotes without job_id must have job_link_intent=intentional',
        'Monitor for any enforcement violations in logs'
      ],
      activated_by: user.email,
      activated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[enableJobSSotEnforcement] Error:', error.message);
    return Response.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});