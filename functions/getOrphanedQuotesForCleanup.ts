import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch ALL orphaned quotes
    const orphanedQuotes = await base44.entities.Quote.filter({
      job_id: { $exists: false }
    }, '-created_date', 100);

    // For each orphaned quote, find existing jobs with same (job_name + customer_id)
    const enrichedOrphans = await Promise.all(
      orphanedQuotes.map(async (quote) => {
        // Find existing jobs with same name + customer
        let matchingJobs = [];
        if (quote.job_name && quote.customer_id) {
          matchingJobs = await base44.entities.Job.filter({
            name: quote.job_name,
            customer_id: quote.customer_id
          }, '', 10);
        }

        return {
          quote_id: quote.id,
          quote_number: quote.quote_number,
          job_name: quote.job_name,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          created_date: quote.created_date,
          total: quote.total,
          status: quote.status,
          matching_jobs: matchingJobs.map(j => ({
            job_id: j.id,
            job_number: j.job_number,
            name: j.name,
            status: j.status,
            created_date: j.created_date,
            backfill_source: j.backfill_source
          }))
        };
      })
    );

    return Response.json({
      orphaned_count: enrichedOrphans.length,
      orphaned_quotes: enrichedOrphans.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )
    });
  } catch (error) {
    console.error('Error fetching orphaned quotes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});