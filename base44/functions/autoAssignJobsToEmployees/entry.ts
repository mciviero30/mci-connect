import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data } = payload;

    // Only trigger on job create/update
    if (event.type !== 'create' && event.type !== 'update') {
      return Response.json({ success: false, reason: 'Not create or update event' });
    }

    const jobId = event.entity_id;
    const job = data || await base44.asServiceRole.entities.Job.get(jobId);

    // Only assign active jobs
    if (job.status !== 'active') {
      return Response.json({ success: false, reason: 'Job not active' });
    }

    // Get all active employees
    const activeEmployees = await base44.asServiceRole.entities.EmployeeProfile.filter({
      is_active: true
    }, '', 1000);

    console.log(`Assigning job ${job.name} (${jobId}) to ${activeEmployees.length} employees`);

    // Get User emails for each EmployeeProfile
    const userIds = activeEmployees.map(e => e.user_id).filter(Boolean);
    const users = await base44.asServiceRole.entities.User.filter(
      { id: { $in: userIds } },
      '',
      1000
    );
    
    const userEmailMap = Object.fromEntries(users.map(u => [u.id, u.email]));

    // Create assignments for each active employee
    const assignments = activeEmployees.map(emp => {
      const userEmail = userEmailMap[emp.user_id];
      if (!userEmail || !emp.user_id) return null;

      return {
        user_id: emp.user_id,
        employee_email: userEmail, // Use REAL email from User entity
        employee_name: emp.full_name,
        job_id: jobId,
        job_name: job.name,
        date: new Date().toISOString().split('T')[0],
        start_time: '08:00',
        end_time: '17:00',
        event_type: 'job_milestone'
      };
    }).filter(Boolean); // Remove nulls

    if (assignments.length > 0) {
      await base44.asServiceRole.entities.JobAssignment.bulkCreate(assignments);
    }

    return Response.json({ 
      success: true, 
      assignmentsCreated: assignments.length,
      jobName: job.name
    });
  } catch (error) {
    console.error('Error auto-assigning jobs:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});