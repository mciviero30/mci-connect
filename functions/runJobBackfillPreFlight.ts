import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Admin only
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('🔍 Starting Job SSOT Pre-Flight Validation...');

    // Fetch all data
    const [jobs, quotes, invoices, timeEntries] = await Promise.all([
      base44.asServiceRole.entities.Job.list(),
      base44.asServiceRole.entities.Quote.list(),
      base44.asServiceRole.entities.Invoice.list(),
      base44.asServiceRole.entities.TimeEntry.list()
    ]);

    // Count quotes missing job_id
    const quotesMissingJobId = quotes.filter(q => !q.job_id || q.job_id === '');
    
    // Count invoices missing job_id
    const invoicesMissingJobId = invoices.filter(i => !i.job_id || i.job_id === '');
    
    // Count jobs without coordinates
    const jobsWithoutCoords = jobs.filter(j => !j.latitude || !j.longitude);
    
    // Count jobs without team
    const jobsWithoutTeam = jobs.filter(j => !j.team_id || j.team_id === '');
    
    // Detect duplicate job names
    const nameGroups = {};
    jobs.forEach(job => {
      const key = `${job.name?.toLowerCase().trim()}_${job.customer_id || job.customer_name}`;
      if (!nameGroups[key]) nameGroups[key] = [];
      nameGroups[key].push(job);
    });
    const duplicateJobNames = Object.entries(nameGroups)
      .filter(([_, jobs]) => jobs.length > 1)
      .map(([key, jobs]) => ({
        name: jobs[0].name,
        customer: jobs[0].customer_name,
        count: jobs.length,
        job_ids: jobs.map(j => j.id)
      }));

    // Analyze matching potential
    const quotesWithInvoice = quotes.filter(q => q.invoice_id && q.invoice_id !== '');
    const quotesWithJobName = quotes.filter(q => q.job_name && q.job_name !== '');

    // Estimate backfill distribution
    const estimatedInvoiceTrace = quotesWithInvoice.length;
    const estimatedNameMatch = Math.floor(quotesMissingJobId.length * 0.15); // Conservative 15%
    const estimatedAutoCreate = quotesMissingJobId.length - estimatedInvoiceTrace - estimatedNameMatch;

    const currentState = {
      total_jobs: jobs.length,
      total_quotes: quotes.length,
      total_invoices: invoices.length,
      total_time_entries: timeEntries.length,
      quotes_missing_job_id: quotesMissingJobId.length,
      quotes_with_invoice_id: quotesWithInvoice.length,
      quotes_with_job_name: quotesWithJobName.length,
      invoices_missing_job_id: invoicesMissingJobId.length,
      duplicate_job_names: duplicateJobNames,
      jobs_without_coordinates: jobsWithoutCoords.length,
      jobs_without_team: jobsWithoutTeam.length,
      jobs_with_job_number: jobs.filter(j => j.job_number).length
    };

    const estimatedChanges = {
      jobs_to_number: jobs.length - currentState.jobs_with_job_number,
      jobs_to_create: estimatedAutoCreate,
      jobs_to_enrich: jobsWithoutTeam.length,
      quotes_to_link: quotesMissingJobId.length,
      quotes_via_invoice_trace: estimatedInvoiceTrace,
      quotes_via_name_match: estimatedNameMatch,
      quotes_via_auto_create: estimatedAutoCreate,
      audit_logs_to_create: (jobs.length * 2) + quotesMissingJobId.length + estimatedAutoCreate
    };

    const riskAssessment = 
      estimatedAutoCreate > 50 ? 'MEDIUM-HIGH' :
      estimatedAutoCreate > 20 ? 'MEDIUM' : 
      'LOW';

    const estimatedRuntime = 
      (estimatedInvoiceTrace * 0.1) + // 0.1s per invoice trace
      (estimatedNameMatch * 0.5) + // 0.5s per name match
      (estimatedAutoCreate * 2) + // 2s per auto-create (with geocoding)
      60; // Base overhead

    const recommendation = 
      currentState.quotes_missing_job_id === 0 ? 'ALREADY_COMPLETE - No backfill needed' :
      duplicateJobNames.length > 5 ? 'REVIEW_DUPLICATES - Manual deduplication recommended before backfill' :
      'PROCEED - Ready for backfill execution';

    const report = {
      timestamp: new Date().toISOString(),
      current_state: currentState,
      estimated_changes: estimatedChanges,
      risk_assessment: riskAssessment,
      estimated_runtime_seconds: Math.ceil(estimatedRuntime),
      estimated_runtime_display: `${Math.floor(estimatedRuntime / 60)} min ${Math.ceil(estimatedRuntime % 60)} sec`,
      recommendation
    };

    console.log('✅ Pre-flight validation complete');
    console.log(JSON.stringify(report, null, 2));

    return Response.json(report);

  } catch (error) {
    console.error('❌ Pre-flight validation failed:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});