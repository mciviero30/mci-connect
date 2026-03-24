import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin-only operation
    if (user?.role !== 'admin' && user?.role !== 'ceo') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    console.log('[markAllOrphanQuotesIntentional] Starting bulk intentional marking...');

    // Find all orphaned quotes
    const allQuotes = await base44.entities.Quote.list('', 1000);
    const orphanedQuotes = allQuotes.filter(q => !q.job_id);

    console.log(`[markAllOrphanQuotesIntentional] Found ${orphanedQuotes.length} orphaned quotes`);

    const marked = [];
    const skipped = [];
    const errors = [];

    for (const quote of orphanedQuotes) {
      try {
        // Skip if already marked as intentional
        if (quote.job_link_intent === 'intentional') {
          skipped.push({
            quote_id: quote.id,
            quote_number: quote.quote_number,
            reason: 'Already marked as intentional'
          });
          continue;
        }

        // Mark as intentional
        await base44.entities.Quote.update(quote.id, {
          job_link_intent: 'intentional',
          job_link_method: 'intentionally_orphaned'
        });

        marked.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          customer_name: quote.customer_name
        });

        console.log(`[markAllOrphanQuotesIntentional] Marked ${quote.quote_number} as intentional`);
      } catch (error) {
        errors.push({
          quote_id: quote.id,
          quote_number: quote.quote_number,
          error: error.message
        });
        console.error(`[markAllOrphanQuotesIntentional] Error marking ${quote.quote_number}:`, error.message);
      }
    }

    return Response.json({
      status: 'success',
      message: 'Bulk intentional marking complete',
      summary: {
        total_orphaned: orphanedQuotes.length,
        marked: marked.length,
        skipped: skipped.length,
        errors: errors.length
      },
      marked_quotes: marked,
      skipped_quotes: skipped,
      errors: errors,
      executed_by: user.email,
      executed_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('[markAllOrphanQuotesIntentional] Error:', error.message);
    return Response.json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
});