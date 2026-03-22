import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * QUICK TEST: Clock-in and verify shift creation
 * 
 * Creates a TimeEntry and waits 10 seconds to see if the automation creates a shift
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    const { user_id, job_id } = await req.json();

    if (!user_id || !job_id) {
      return Response.json({ 
        error: 'Missing required fields',
        required: { user_id: 'string', job_id: 'string' }
      }, { status: 400 });
    }

    // Get user and job details
    const employee = await base44.entities.EmployeeDirectory.filter({ user_id });
    const job = await base44.entities.Job.filter({ id: job_id });

    if (employee.length === 0 || job.length === 0) {
      return Response.json({ 
        error: 'User or job not found' 
      }, { status: 404 });
    }

    const emp = employee[0];
    const selectedJob = job[0];
    const testDate = new Date().toISOString().split('T')[0];

    console.log(`[QuickTest] Creating TimeEntry for ${emp.full_name} at ${selectedJob.name}`);

    // Create TimeEntry
    const timeEntry = await base44.entities.TimeEntry.create({
      user_id: emp.user_id,
      employee_email: emp.employee_email,
      employee_name: emp.full_name,
      job_id: selectedJob.id,
      job_name: selectedJob.name,
      date: testDate,
      check_in: '14:00:00',
      check_out: '15:00:00',
      hours_worked: 1
    });

    console.log(`[QuickTest] ✅ TimeEntry created: ${timeEntry.id}`);
    console.log(`[QuickTest] ⏳ Waiting 10 seconds for automation...`);

    // Wait for automation
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Check if shift was created
    const shifts = await base44.asServiceRole.entities.ScheduleShift.filter({
      user_id: emp.user_id,
      job_id: selectedJob.id,
      date: testDate
    });

    console.log(`[QuickTest] Found ${shifts.length} shift(s)`);

    const autoShift = shifts.find(s => s.notes === 'auto_created_from_time_entry');

    return Response.json({
      success: !!autoShift,
      time_entry: {
        id: timeEntry.id,
        user: emp.full_name,
        job: selectedJob.name,
        date: testDate,
        times: '14:00-15:00'
      },
      shift: autoShift ? {
        id: autoShift.id,
        title: autoShift.shift_title,
        times: `${autoShift.start_time}-${autoShift.end_time}`,
        status: autoShift.status
      } : null,
      message: autoShift 
        ? '✅ Automation working! Shift created automatically.' 
        : '⚠️ No shift created - automation may not have fired yet (wait longer or check automation status)'
    });

  } catch (error) {
    console.error('❌ [QuickTest] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});