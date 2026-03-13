import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only trigger on create events
    if (event?.type !== 'create') {
      return Response.json({ status: 'skipped', reason: 'not_a_create_event' });
    }

    const timeEntry = data;
    
    // Validate required fields
    if (!timeEntry.user_id || !timeEntry.job_id || !timeEntry.date) {
      console.log('[AutoCalendar] Missing required fields', { timeEntry });
      return Response.json({ status: 'skipped', reason: 'missing_required_fields' });
    }

    // Check if shift already exists for this user+job+date
    const existing = await base44.asServiceRole.entities.ScheduleShift.filter({
      user_id: timeEntry.user_id,
      job_id: timeEntry.job_id,
      date: timeEntry.date
    });

    if (existing.length > 0) {
      console.log('[AutoCalendar] Shift already exists - skipping', {
        user_id: timeEntry.user_id,
        job_id: timeEntry.job_id,
        date: timeEntry.date
      });
      return Response.json({ status: 'skipped', reason: 'shift_already_exists' });
    }

    // Create the calendar shift
    const shift = await base44.asServiceRole.entities.ScheduleShift.create({
      user_id: timeEntry.user_id,
      employee_email: timeEntry.employee_email,
      employee_name: timeEntry.employee_name,
      job_id: timeEntry.job_id,
      job_name: timeEntry.job_name,
      date: timeEntry.date,
      start_time: timeEntry.check_in,
      end_time: timeEntry.check_out || '23:59',
      shift_type: timeEntry.work_type === 'driving' ? 'appointment' : 'job_work',
      shift_title: timeEntry.work_type === 'driving' 
        ? `Driving – ${timeEntry.job_name}` 
        : timeEntry.job_name,
      status: 'confirmed',
      notes: 'auto_created_from_time_entry'
    });

    console.log('[AutoCalendar] ✅ Created shift from TimeEntry', {
      shift_id: shift.id,
      user: timeEntry.employee_name,
      job: timeEntry.job_name,
      date: timeEntry.date
    });

    return Response.json({ 
      status: 'success', 
      shift_id: shift.id,
      message: 'Calendar shift created automatically'
    });

  } catch (error) {
    console.error('[AutoCalendar] Error:', error);
    return Response.json({ 
      status: 'error', 
      error: error.message 
    }, { status: 500 });
  }
});