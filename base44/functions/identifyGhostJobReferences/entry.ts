import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all quotes with job_id
    const allQuotes = await base44.entities.Quote.list('-created_date', 100);
    const quotesWithJobId = allQuotes.filter(q => q.job_id);

    // Identify ghost references (job_id doesn't exist)
    const ghostReferences = [];
    for (const quote of quotesWithJobId) {
      try {
        await base44.entities.Job.read(quote.job_id);
        // Job exists, skip
      } catch (error) {
        // Job does not exist - this is a ghost reference
        ghostReferences.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          invalid_job_id: quote.job_id,
          job_name: quote.job_name,
          customer_id: quote.customer_id,
          customer_name: quote.customer_name,
          created_date: quote.created_date,
          total: quote.total,
          status: quote.status
        });
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      ghost_references_found: ghostReferences.length,
      ghost_references: ghostReferences.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )
    });
  } catch (error) {
    console.error('Error identifying ghost job references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});