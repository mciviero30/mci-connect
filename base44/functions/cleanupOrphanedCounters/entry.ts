import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CLEANUP: Orphaned Counters
 * 
 * Removes temporary "claim" counters that were created during job/quote numbering
 * but never cleaned up. Keeps only legitimate counters (job, invoice, quote).
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all counters
    const counters = await base44.asServiceRole.entities.Counter.list();

    const results = {
      total_counters: counters.length,
      deleted: 0,
      kept: 0,
      legitimate_counters: []
    };

    // Legitimate counter keys
    const legitimateKeys = ['job', 'invoice', 'quote', 'quote_number', 'invoice_number', 'job_number'];

    for (const counter of counters) {
      const key = counter.counter_key;

      // Delete if it's a temporary claim counter
      if (key.startsWith('job-claim-') || key.startsWith('quote-claim-') || key.startsWith('invoice-claim-')) {
        await base44.asServiceRole.entities.Counter.delete(counter.id);
        results.deleted++;
      } else {
        results.kept++;
        results.legitimate_counters.push({
          key: counter.counter_key,
          value: counter.current_value
        });
      }
    }

    return Response.json({
      success: true,
      message: `Cleaned up ${results.deleted} orphaned counters`,
      results
    });

  } catch (error) {
    console.error('Cleanup failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});