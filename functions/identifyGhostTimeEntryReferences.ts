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

    // Identify ghost references (job_id doesn't exist)
    const ghostReferences = [];
    for (const entry of entriesWithJobId) {
      try {
        await base44.entities.Job.read(entry.job_id);
        // Job exists, skip
      } catch (error) {
        // Job does not exist - this is a ghost reference
        ghostReferences.push({
          time_entry_id: entry.id,
          invalid_job_id: entry.job_id,
          job_name: entry.job_name,
          employee_email: entry.employee_email,
          employee_name: entry.employee_name,
          user_id: entry.user_id,
          date: entry.date,
          hours_worked: entry.hours_worked,
          created_date: entry.created_date,
          status: entry.status
        });
      }
    }

    return Response.json({
      timestamp: new Date().toISOString(),
      ghost_references_found: ghostReferences.length,
      ghost_references: ghostReferences.sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      )
    });
  } catch (error) {
    console.error('Error identifying ghost time entry references:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});