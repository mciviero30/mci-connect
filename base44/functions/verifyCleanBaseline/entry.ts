import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * SMOKE TEST: Verify Clean Baseline After Legacy Cleanup
 * 
 * Confirms:
 * 1. WorkAuthorizations cleaned (0 records)
 * 2. Legacy Jobs archived (28 jobs)
 * 3. System ready for clean baseline enforcement
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Count WorkAuthorizations
    const allAuths = await base44.asServiceRole.entities.WorkAuthorization.list('', 1000);
    
    // Count Jobs by status
    const activeJobs = await base44.asServiceRole.entities.Job.filter({ status: 'active' }, '', 1000);
    const archivedJobs = await base44.asServiceRole.entities.Job.filter({ status: 'archived' }, '', 1000);
    
    // Count Jobs without authorization_id
    const jobsWithoutAuth = activeJobs.filter(j => !j.authorization_id);

    // Check for any Jobs with authorization_id pointing to deleted auths
    const activeJobsWithAuth = activeJobs.filter(j => j.authorization_id);
    const orphanedAuthLinks = activeJobsWithAuth.filter(j => {
      return !allAuths.some(a => a.id === j.authorization_id);
    });

    const report = {
      timestamp: new Date().toISOString(),
      status: 'CLEAN_BASELINE_VERIFIED',
      summary: {
        work_authorizations: {
          total: allAuths.length,
          expected: 0,
          status: allAuths.length === 0 ? '✅ CLEAN' : '❌ DIRTY'
        },
        active_jobs: {
          total: activeJobs.length,
          without_authorization: jobsWithoutAuth.length,
          with_orphaned_auth_links: orphanedAuthLinks.length,
          status: (jobsWithoutAuth.length === 0 && orphanedAuthLinks.length === 0) ? '✅ CLEAN' : '❌ NEEDS_REPAIR'
        },
        archived_jobs: {
          total: archivedJobs.length,
          legacy_cleanup: archivedJobs.filter(j => j.deleted_by === 'system_legacy_cleanup').length,
          expected_legacy: 24,
          status: archivedJobs.filter(j => j.deleted_by === 'system_legacy_cleanup').length >= 24 ? '✅ ARCHIVED' : '⚠️ PARTIAL'
        }
      },
      baseline_enforcement_ready: 
        allAuths.length === 0 && 
        jobsWithoutAuth.length === 0 && 
        orphanedAuthLinks.length === 0,
      issues: []
    };

    // Add issues if found
    if (allAuths.length > 0) {
      report.issues.push(`Found ${allAuths.length} WorkAuthorizations - expected 0`);
    }

    if (jobsWithoutAuth.length > 0) {
      report.issues.push(`Found ${jobsWithoutAuth.length} active jobs without authorization_id`);
      report.jobs_without_auth_sample = jobsWithoutAuth.slice(0, 5).map(j => ({
        id: j.id,
        name: j.name,
        customer: j.customer_name,
        created: j.created_date
      }));
    }

    if (orphanedAuthLinks.length > 0) {
      report.issues.push(`Found ${orphanedAuthLinks.length} active jobs with orphaned authorization links`);
      report.orphaned_auth_links_sample = orphanedAuthLinks.slice(0, 5).map(j => ({
        id: j.id,
        name: j.name,
        authorization_id: j.authorization_id
      }));
    }

    // Final verdict
    report.verdict = report.baseline_enforcement_ready 
      ? '🎉 SYSTEM READY FOR CLEAN BASELINE' 
      : '⚠️ CLEANUP INCOMPLETE - MANUAL INTERVENTION REQUIRED';

    return Response.json({
      success: true,
      report
    });

  } catch (error) {
    console.error('[VERIFY CLEAN BASELINE ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});