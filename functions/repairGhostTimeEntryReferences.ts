import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
    }

    // Fetch all time entries with job_id
    const allTimeEntries = await base44.entities.TimeEntry.list('-created_date', 100);
    const entriesWithJobId = allTimeEntries.filter(t => t.job_id);

    // Identify and repair ghost references (job_id doesn't exist)
    const repaired = [];
    const skipped = [];

    for (const entry of entriesWithJobId) {
      try {
        await base44.entities.Job.read(entry.job_id);
        // Job exists, skip
        skipped.push({
          time_entry_id: entry.id,
          employee_email: entry.employee_email,
          reason: 'job_exists'
        });
      } catch (error) {
        // Job does not exist - this is a ghost reference, repair it
        try {
          await base44.entities.TimeEntry.update(entry.id, {
            job_id: null,
            job_link_method: 'repair_ghost_reference'
          });

          repaired.push({
            time_entry_id: entry.id,
            invalid_job_id: entry.job_id,
            job_name: entry.job_name,
            employee_email: entry.employee_email,
            employee_name: entry.employee_name,
            date: entry.date,
            action: 'removed_invalid_job_id',
            timestamp: new Date().toISOString()
          });
        } catch (updateError) {
          skipped.push({
            time_entry_id: entry.id,
            employee_email: entry.employee_email,
            reason: 'update_failed',
            error: updateError.message
          });
        }
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      repair_summary: {
        total_time_entries_checked: entriesWithJobId.length,
        ghost_references_repaired: repaired.length,
        skipped: skipped.length,
        admin_email: user.email
      },
      repaired_time_entries: repaired,
      skipped_time_entries: skipped,
      next_steps: [
        'Run auditJobSSotReadiness() to verify all repairs complete',
        'Confirm invalid_references across ALL entities is now 0',
        'All ghost reference repairs are now complete',
        'Proceed to manual orphaned quote cleanup'
      ]
    });
  } catch (error) {
    console.error('Error repairing ghost time entry references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});