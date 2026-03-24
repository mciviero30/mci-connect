import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Scheduled task to permanently delete quotes and invoices that were soft-deleted
 * more than 30 days ago. Runs daily.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Only admins can trigger this
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const deleteCutoffDate = thirtyDaysAgo.toISOString();

    console.log(`[Cleanup] Starting cleanup for documents deleted before ${deleteCutoffDate}`);

    // Clean up deleted quotes
    const deletedQuotes = await base44.asServiceRole.entities.Quote.filter({
      deleted_at: { $lt: deleteCutoffDate }
    }, '', 1000);

    let deletedQuotesCount = 0;
    for (const quote of deletedQuotes) {
      try {
        await base44.asServiceRole.entities.Quote.delete(quote.id);
        deletedQuotesCount++;
      } catch (err) {
        console.warn(`Failed to delete quote ${quote.id}:`, err.message);
      }
    }

    // Clean up deleted invoices
    const deletedInvoices = await base44.asServiceRole.entities.Invoice.filter({
      deleted_at: { $lt: deleteCutoffDate }
    }, '', 1000);

    let deletedInvoicesCount = 0;
    for (const invoice of deletedInvoices) {
      try {
        await base44.asServiceRole.entities.Invoice.delete(invoice.id);
        deletedInvoicesCount++;
      } catch (err) {
        console.warn(`Failed to delete invoice ${invoice.id}:`, err.message);
      }
    }

    console.log(`[Cleanup] Permanently deleted ${deletedQuotesCount} quotes and ${deletedInvoicesCount} invoices`);

    return Response.json({
      success: true,
      deletedQuotes: deletedQuotesCount,
      deletedInvoices: deletedInvoicesCount
    });
  } catch (error) {
    console.error('[Cleanup] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});