import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // 1. Audit Job statuses
    const allJobs = await base44.entities.Job.list('-created_date', 100);
    const statusDistribution = {};
    allJobs.forEach(job => {
      const status = job.status || 'unknown';
      statusDistribution[status] = (statusDistribution[status] || 0) + 1;
    });

    // 2. Audit orphaned quotes
    const allQuotes = await base44.entities.Quote.list('-created_date', 100);
    const orphanedQuotes = allQuotes.filter(q => !q.job_id);
    const quotesWithValidJobRef = allQuotes.filter(q => q.job_id);

    // Verify all quote job_id references are valid
    const invalidQuoteRefs = [];
    for (const quote of quotesWithValidJobRef) {
      try {
        await base44.entities.Job.read(quote.job_id);
      } catch {
        invalidQuoteRefs.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          invalid_job_id: quote.job_id
        });
      }
    }

    // 3. Audit invoices
    const allInvoices = await base44.entities.Invoice.list('-created_date', 100);
    const invoicesWithoutJobId = allInvoices.filter(i => !i.job_id);
    const invalidInvoiceRefs = [];
    for (const invoice of allInvoices.filter(i => i.job_id)) {
      try {
        await base44.entities.Job.read(invoice.job_id);
      } catch {
        invalidInvoiceRefs.push({
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          invalid_job_id: invoice.job_id
        });
      }
    }

    // 4. Audit time entries
    const allTimeEntries = await base44.entities.TimeEntry.list('-date', 100);
    const timeEntriesWithoutJobId = allTimeEntries.filter(t => !t.job_id);
    const invalidTimeEntryRefs = [];
    for (const entry of allTimeEntries.filter(t => t.job_id)) {
      try {
        await base44.entities.Job.read(entry.job_id);
      } catch {
        invalidTimeEntryRefs.push({
          entry_id: entry.id,
          date: entry.date,
          invalid_job_id: entry.job_id
        });
      }
    }

    // 5. Check for duplicate jobs
    const jobNameCustomerMap = {};
    const duplicateJobs = [];
    allJobs.forEach(job => {
      const key = `${job.name}||${job.customer_id}`;
      if (jobNameCustomerMap[key]) {
        duplicateJobs.push({
          name: job.name,
          customer_id: job.customer_id,
          jobs: [jobNameCustomerMap[key], job.id]
        });
      } else {
        jobNameCustomerMap[key] = job.id;
      }
    });

    return Response.json({
      timestamp: new Date().toISOString(),
      jobs_audit: {
        total_jobs: allJobs.length,
        status_distribution: statusDistribution,
        status_list: Object.entries(statusDistribution).map(([status, count]) => ({
          status,
          count,
          percentage: ((count / allJobs.length) * 100).toFixed(1) + '%'
        }))
      },
      quotes_audit: {
        total_quotes: allQuotes.length,
        with_job_id: quotesWithValidJobRef.length,
        without_job_id: orphanedQuotes.length,
        percentage_linked: ((quotesWithValidJobRef.length / allQuotes.length) * 100).toFixed(1) + '%',
        invalid_references: invalidQuoteRefs.length
      },
      invoices_audit: {
        total_invoices: allInvoices.length,
        with_job_id: allInvoices.filter(i => i.job_id).length,
        without_job_id: invoicesWithoutJobId.length,
        percentage_linked: ((allInvoices.filter(i => i.job_id).length / allInvoices.length) * 100).toFixed(1) + '%',
        invalid_references: invalidInvoiceRefs.length
      },
      time_entries_audit: {
        total_entries: allTimeEntries.length,
        with_job_id: allTimeEntries.filter(t => t.job_id).length,
        without_job_id: timeEntriesWithoutJobId.length,
        percentage_linked: ((allTimeEntries.filter(t => t.job_id).length / allTimeEntries.length) * 100).toFixed(1) + '%',
        invalid_references: invalidTimeEntryRefs.length
      },
      data_integrity: {
        invalid_quote_references: invalidQuoteRefs,
        invalid_invoice_references: invalidInvoiceRefs,
        invalid_time_entry_references: invalidTimeEntryRefs,
        duplicate_jobs: duplicateJobs
      }
    });
  } catch (error) {
    console.error('Error auditing Job SSOT readiness:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});