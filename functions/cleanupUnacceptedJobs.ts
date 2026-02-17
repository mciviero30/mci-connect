import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * CLEANUP: Remove Jobs created from Quotes that were never accepted
 * 
 * Only deletes jobs where:
 * - field_accepted_at is null/missing (never accepted by client)
 * - backfill_source is 'quote' or 'quote_auto_create' (came from quote, not invoice)
 * - NOT already deleted
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all jobs
    const allJobs = await base44.asServiceRole.entities.Job.list();
    
    // Filter: unaccepted jobs from quotes only
    const jobsToDelete = allJobs.filter(job => 
      !job.field_accepted_at && // Never accepted
      (job.backfill_source === 'quote' || job.backfill_source === 'quote_auto_create') && // From quote
      !job.deleted_at // Not already deleted
    );

    const results = {
      total_unaccepted_quote_jobs: jobsToDelete.length,
      deleted: 0,
      errors: []
    };

    for (const job of jobsToDelete) {
      try {
        await base44.asServiceRole.entities.Job.update(job.id, {
          deleted_at: new Date().toISOString(),
          deleted_by: 'system_unaccepted_cleanup',
          status: 'archived'
        });
        results.deleted++;
      } catch (error) {
        results.errors.push({
          job_id: job.id,
          job_name: job.name,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Archived ${results.deleted} unaccepted jobs from quotes`,
      results
    });

  } catch (error) {
    console.error('Cleanup unaccepted jobs failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});