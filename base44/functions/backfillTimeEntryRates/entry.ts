import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * BACKFILL TIME ENTRY RATES
 * 
 * Populates rate_snapshot for existing approved TimeEntries
 * Uses Job.regular_hourly_rate or User.hourly_rate as fallback
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { dry_run = true } = await req.json();

    // Load all approved time entries without rate_snapshot
    const allTimeEntries = await base44.asServiceRole.entities.TimeEntry.filter({ 
      status: 'approved' 
    }, '-date', 10000);

    const needsBackfill = allTimeEntries.filter(te => !te.rate_snapshot);

    const results = {
      total_entries: allTimeEntries.length,
      needs_backfill: needsBackfill.length,
      backfilled: 0,
      errors: []
    };

    if (!dry_run && needsBackfill.length > 0) {
      // Load jobs and users for rate lookup
      const allJobs = await base44.asServiceRole.entities.Job.list('-created_date', 5000);
      const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 500);

      for (const entry of needsBackfill) {
        try {
          // Determine rate from Job or User
          let rate = 60; // Default fallback

          // Try Job first
          const job = allJobs.find(j => j.id === entry.job_id);
          if (job?.regular_hourly_rate) {
            rate = job.regular_hourly_rate;
          } else {
            // Fallback to User
            const userRecord = allUsers.find(u => 
              u.id === entry.user_id || u.email === entry.employee_email
            );
            if (userRecord?.hourly_rate) {
              rate = userRecord.hourly_rate;
            }
          }

          // Update with rate_snapshot
          await base44.asServiceRole.entities.TimeEntry.update(entry.id, {
            rate_snapshot: rate
          });

          results.backfilled++;
          console.log(`✅ Backfilled rate for TimeEntry ${entry.id}: $${rate}/hr`);

        } catch (error) {
          results.errors.push({
            entry_id: entry.id,
            employee: entry.employee_name,
            error: error.message
          });
          console.error(`❌ Failed to backfill TimeEntry ${entry.id}:`, error.message);
        }
      }
    }

    return Response.json({
      success: true,
      dry_run,
      summary: results,
      sample_entries: needsBackfill.slice(0, 10).map(te => ({
        id: te.id,
        employee: te.employee_name,
        job: te.job_name,
        date: te.date,
        hours: te.hours_worked,
        current_rate_snapshot: te.rate_snapshot
      }))
    });

  } catch (error) {
    console.error('[BACKFILL ERROR]', error.message);
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
});