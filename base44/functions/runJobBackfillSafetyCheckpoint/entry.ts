import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('🔍 Starting Job SSOT Phase 2 Safety Checkpoint...');

    // ============================================
    // 1. DATA SNAPSHOT - EXACT COUNTS
    // ============================================
    
    const [jobs, quotes, invoices, timeEntries, expenses, assignments] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Quote.list(),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.TimeEntry.list(),
      base44.asServiceRole.entities.Expense.list(),
      base44.asServiceRole.entities.JobAssignment.list()
    ]);

    // Count job_id coverage
    const countCoverage = (records) => {
      const total = records.length;
      const withJobId = records.filter(r => r.job_id && r.job_id !== '').length;
      const missingJobId = total - withJobId;
      return {
        total,
        with_job_id: withJobId,
        missing_job_id: missingJobId,
        pct_with_job_id: total > 0 ? ((withJobId / total) * 100).toFixed(1) : '0.0',
        pct_missing_job_id: total > 0 ? ((missingJobId / total) * 100).toFixed(1) : '0.0'
      };
    };

    const dataSnapshot = {
      Job: {
        total: jobs.length,
        with_job_number: jobs.filter(j => j.job_number).length,
        with_backfill_fields: jobs.filter(j => j.backfill_source || j.backfill_completed_at).length
      },
      Quote: countCoverage(quotes),
      Invoice: countCoverage(invoices),
      TimeEntry: countCoverage(timeEntries),
      Expense: countCoverage(expenses),
      JobAssignment: countCoverage(assignments)
    };

    // ============================================
    // 2. DUPLICATE DETECTION
    // ============================================

    // Duplicate job names
    const jobNameGroups = {};
    jobs.forEach(job => {
      const key = `${job.name?.toLowerCase().trim()}_${job.customer_id || job.customer_name}`;
      if (!jobNameGroups[key]) jobNameGroups[key] = [];
      jobNameGroups[key].push({ id: job.id, name: job.name, customer: job.customer_name });
    });
    const duplicateJobNames = Object.entries(jobNameGroups)
      .filter(([_, jobs]) => jobs.length > 1)
      .map(([key, jobs]) => ({
        name: jobs[0].name,
        customer: jobs[0].customer,
        count: jobs.length,
        job_ids: jobs.map(j => j.id)
      }));

    // Duplicate job numbers
    const jobNumberCounts = {};
    jobs.forEach(j => {
      if (j.job_number) {
        jobNumberCounts[j.job_number] = (jobNumberCounts[j.job_number] || 0) + 1;
      }
    });
    const duplicateJobNumbers = Object.entries(jobNumberCounts)
      .filter(([_, count]) => count > 1)
      .map(([number, count]) => ({ job_number: number, count }));

    // ============================================
    // 3. REFERENCE INTEGRITY
    // ============================================

    // Quotes referencing non-existent jobs
    const jobIds = new Set(jobs.map(j => j.id));
    const quotesWithInvalidJobRef = quotes.filter(q => 
      q.job_id && q.job_id !== '' && !jobIds.has(q.job_id)
    );

    const invoicesWithInvalidJobRef = invoices.filter(i =>
      i.job_id && i.job_id !== '' && !jobIds.has(i.job_id)
    );

    const timeEntriesWithInvalidJobRef = timeEntries.filter(t =>
      t.job_id && t.job_id !== '' && !jobIds.has(t.job_id)
    );

    // ============================================
    // 4. QUOTE LINKAGE ANALYSIS
    // ============================================

    const quotesWithInvoice = quotes.filter(q => q.invoice_id && q.invoice_id !== '');
    const quotesBackfilled = quotes.filter(q => q.job_link_backfilled === true);
    
    // Quotes missing job_id but have invoice_id (trace candidates)
    const quotesWithInvoiceButNoJob = quotes.filter(q => 
      (q.invoice_id && q.invoice_id !== '') && 
      (!q.job_id || q.job_id === '')
    );

    // Invoices referenced by quotes
    const invoiceIds = new Set(invoices.map(i => i.id));
    const quotesWithOrphanInvoice = quotesWithInvoice.filter(q =>
      !invoiceIds.has(q.invoice_id)
    );

    // ============================================
    // 5. CREATION FLOW PATTERNS
    // ============================================

    // Jobs created with backfill tracking
    const jobsWithBackfillSource = jobs.filter(j => j.backfill_source);
    const backfillSourceBreakdown = {};
    jobsWithBackfillSource.forEach(j => {
      backfillSourceBreakdown[j.backfill_source] = (backfillSourceBreakdown[j.backfill_source] || 0) + 1;
    });

    // Quotes with backfill method
    const quotesWithBackfillMethod = quotes.filter(q => q.job_link_method);
    const backfillMethodBreakdown = {};
    quotesWithBackfillMethod.forEach(q => {
      backfillMethodBreakdown[q.job_link_method] = (backfillMethodBreakdown[q.job_link_method] || 0) + 1;
    });

    // ============================================
    // 6. RISK INDICATORS
    // ============================================

    const riskIndicators = {
      quotes_with_invalid_job_ref: quotesWithInvalidJobRef.length,
      invoices_with_invalid_job_ref: invoicesWithInvalidJobRef.length,
      time_entries_with_invalid_job_ref: timeEntriesWithInvalidJobRef.length,
      duplicate_job_names: duplicateJobNames.length,
      duplicate_job_numbers: duplicateJobNumbers.length,
      quotes_with_orphan_invoice: quotesWithOrphanInvoice.length,
      quotes_ready_for_invoice_trace: quotesWithInvoiceButNoJob.length
    };

    // ============================================
    // 7. READINESS ASSESSMENT
    // ============================================

    const criticalBlockers = [];
    const warnings = [];

    if (duplicateJobNumbers.length > 0) {
      criticalBlockers.push(`CRITICAL: ${duplicateJobNumbers.length} duplicate job_numbers detected`);
    }

    if (quotesWithInvalidJobRef.length > 0) {
      criticalBlockers.push(`CRITICAL: ${quotesWithInvalidJobRef.length} quotes reference non-existent jobs`);
    }

    if (invoicesWithInvalidJobRef.length > 0) {
      criticalBlockers.push(`CRITICAL: ${invoicesWithInvalidJobRef.length} invoices reference non-existent jobs`);
    }

    if (duplicateJobNames.length > 10) {
      warnings.push(`WARNING: ${duplicateJobNames.length} duplicate job names detected (may complicate name matching)`);
    }

    if (quotesWithOrphanInvoice.length > 0) {
      warnings.push(`WARNING: ${quotesWithOrphanInvoice.length} quotes reference deleted invoices`);
    }

    const isReadyForPhase2 = criticalBlockers.length === 0;

    // ============================================
    // FINAL REPORT
    // ============================================

    const report = {
      checkpoint: 'JOB SSOT – PHASE 2 READINESS CHECKPOINT',
      timestamp: new Date().toISOString(),
      
      data_snapshot: dataSnapshot,
      
      duplicates: {
        duplicate_job_names: duplicateJobNames,
        duplicate_job_numbers: duplicateJobNumbers
      },
      
      reference_integrity: {
        quotes_with_invalid_job_ref: quotesWithInvalidJobRef.length,
        invoices_with_invalid_job_ref: invoicesWithInvalidJobRef.length,
        time_entries_with_invalid_job_ref: timeEntriesWithInvalidJobRef.length,
        invalid_references_details: {
          quotes: quotesWithInvalidJobRef.map(q => ({ id: q.id, quote_number: q.quote_number, job_id: q.job_id })),
          invoices: invoicesWithInvalidJobRef.map(i => ({ id: i.id, invoice_number: i.invoice_number, job_id: i.job_id })),
          time_entries: timeEntriesWithInvalidJobRef.map(t => ({ id: t.id, date: t.date, job_id: t.job_id }))
        }
      },
      
      quote_linkage_analysis: {
        total_quotes: quotes.length,
        quotes_with_job_id: quotes.length - dataSnapshot.Quote.missing_job_id,
        quotes_missing_job_id: dataSnapshot.Quote.missing_job_id,
        quotes_with_invoice_id: quotesWithInvoice.length,
        quotes_ready_for_invoice_trace: quotesWithInvoiceButNoJob.length,
        quotes_already_backfilled: quotesBackfilled.length,
        backfill_method_breakdown: backfillMethodBreakdown
      },
      
      job_creation_patterns: {
        total_jobs: jobs.length,
        jobs_with_backfill_tracking: jobsWithBackfillSource.length,
        backfill_source_breakdown: backfillSourceBreakdown
      },
      
      risk_indicators: riskIndicators,
      
      readiness_assessment: {
        is_ready_for_phase_2: isReadyForPhase2,
        critical_blockers: criticalBlockers,
        warnings: warnings,
        recommendation: isReadyForPhase2 
          ? '✅ System is safe to proceed to Phase 2 backfill (link-only, no creation).'
          : '⛔ Backfill must pause. Blocking risks identified.'
      }
    };

    console.log('✅ Safety checkpoint complete');
    console.log(JSON.stringify(report, null, 2));

    return Response.json(report);

  } catch (error) {
    console.error('❌ Safety checkpoint failed:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});