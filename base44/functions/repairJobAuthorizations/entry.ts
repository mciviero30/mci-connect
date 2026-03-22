import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * REPAIR: Missing Job Work Authorizations
 * 
 * Creates legacy WorkAuthorization records for Jobs missing authorization_id
 * Marks them as backfilled for audit trail
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

    // Get all jobs without authorization
    const jobs = await base44.asServiceRole.entities.Job.list();
    const jobsWithoutAuth = jobs.filter(j => !j.authorization_id);

    const results = {
      total_jobs_without_auth: jobsWithoutAuth.length,
      created_authorizations: 0,
      linked_jobs: 0,
      errors: []
    };

    for (const job of jobsWithoutAuth) {
      try {
        // Create legacy WorkAuthorization
        const auth = await base44.asServiceRole.entities.WorkAuthorization.create({
          customer_id: job.customer_id || 'unknown',
          customer_name: job.customer_name || 'Unknown Customer',
          authorization_type: job.billing_type || 'fixed',
          approval_source: 'verbal',
          approved_at: job.created_date,
          verified_by_user_id: user.id,
          verified_by_email: user.email,
          verified_by_name: user.full_name,
          verification_notes: `Auto-created during data repair for legacy job (${new Date().toISOString()})`,
          backfill_auto_generated: true,
          backfill_confidence: 50,
          linked_quote_id: job.quote_id
        });

        results.created_authorizations++;

        // Link job to authorization
        await base44.asServiceRole.entities.Job.update(job.id, {
          authorization_id: auth.id
        });

        results.linked_jobs++;

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
      message: `Created ${results.created_authorizations} authorizations and linked ${results.linked_jobs} jobs`,
      results
    });

  } catch (error) {
    console.error('Repair failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});