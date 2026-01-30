import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * EMERGENCY REPAIR: Create WorkAuthorizations for ALL Jobs
 * 
 * Creates authorization for EVERY job regardless of activity
 * This is a one-time migration to fix production state
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    // Load ALL jobs without authorization
    const allJobs = await base44.asServiceRole.entities.Job.list('-created_date', 1000);
    const jobsNeedingAuth = allJobs.filter(j => !j.authorization_id);

    const results = {
      total_jobs: allJobs.length,
      needs_repair: jobsNeedingAuth.length,
      repaired: 0,
      errors: []
    };

    console.log(`📊 Found ${jobsNeedingAuth.length} jobs without authorization`);

    if (!dry_run) {
      for (const job of jobsNeedingAuth) {
        try {
          // Determine auth type from job billing_type
          let authType = 'fixed';
          if (job.billing_type === 'time_materials') {
            authType = 'tm';
          }

          // Create WorkAuthorization
          const authorization = await base44.asServiceRole.entities.WorkAuthorization.create({
            customer_id: job.customer_id || '',
            customer_name: job.customer_name || 'Unknown Customer',
            authorization_type: authType,
            approval_source: 'contract',
            authorization_number: job.job_number || `MIGRATION-${job.id.slice(-8)}`,
            approved_amount: job.contract_amount || 0,
            approved_at: job.created_date || new Date().toISOString(),
            verified_by_user_id: user.id,
            verified_by_email: user.email,
            verified_by_name: user.full_name,
            verification_notes: `Emergency migration - auto-created for existing job: ${job.name}`,
            status: 'approved',
            backfill_auto_generated: true,
            backfill_confidence: 100
          });

          // Link Job to Authorization
          await base44.asServiceRole.entities.Job.update(job.id, {
            authorization_id: authorization.id
          });

          results.repaired++;
          console.log(`✅ Created auth ${authorization.id} for Job ${job.name}`);

        } catch (error) {
          results.errors.push({
            job_id: job.id,
            job_name: job.name,
            error: error.message
          });
          console.error(`❌ Failed for Job ${job.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: results,
      preview: jobsNeedingAuth.slice(0, 10).map(j => ({
        job_id: j.id,
        job_name: j.name,
        customer: j.customer_name,
        billing_type: j.billing_type,
        proposed_auth_type: j.billing_type === 'time_materials' ? 'tm' : 'fixed'
      }))
    });

  } catch (error) {
    console.error('[EMERGENCY REPAIR ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});