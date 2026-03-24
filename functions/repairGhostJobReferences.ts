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

    // Identify and repair ghost references (job_id doesn't exist)
    const repaired = [];
    const skipped = [];

    for (const quote of quotesWithJobId) {
      try {
        await base44.entities.Job.read(quote.job_id);
        // Job exists, skip
        skipped.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          reason: 'job_exists'
        });
      } catch (error) {
        // Job does not exist - this is a ghost reference, repair it
        try {
          await base44.entities.Quote.update(quote.id, {
            job_id: null,
            job_link_backfilled: false,
            job_link_method: 'repair_ghost_reference'
          });

          repaired.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            invalid_job_id: quote.job_id,
            job_name: quote.job_name,
            customer_id: quote.customer_id,
            action: 'removed_invalid_job_id',
            timestamp: new Date().toISOString()
          });
        } catch (updateError) {
          skipped.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            reason: 'update_failed',
            error: updateError.message
          });
        }
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      repair_summary: {
        total_quotes_checked: quotesWithJobId.length,
        ghost_references_repaired: repaired.length,
        skipped: skipped.length,
        admin_email: user.email
      },
      repaired_quotes: repaired,
      skipped_quotes: skipped,
      next_steps: [
        'Run auditJobSSotReadiness() to verify repair',
        'Check that invalid_references count is now 0',
        'Proceed to manual orphaned quote cleanup via OrphanedQuoteCleanup page',
        'Then enforcement can be enabled'
      ]
    });
  } catch (error) {
    console.error('Error repairing ghost job references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});