import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    // Check permissions: only admin/managers can create shifts
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403 });
    }

    const shiftData = await req.json();

    // Validate required fields per ScheduleShift schema
    if (!shiftData.date || !shiftData.start_time || !shiftData.end_time) {
      return new Response(JSON.stringify({ error: 'Missing required fields: date, start_time, end_time' }), { status: 400 });
    }

    if (!shiftData.employee_email || !shiftData.employee_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: employee_email, employee_name' }), { status: 400 });
    }

    console.log('📝 Input shift data:', JSON.stringify(shiftData, null, 2));

    // Ensure shift_title has value (fallback if empty)
    const payloadData = {
      ...shiftData,
      shift_title: shiftData.shift_title || shiftData.job_name || 'Scheduled Shift',
      shift_type: shiftData.shift_type || 'job_work',
      status: shiftData.status || 'scheduled'
    };

    console.log('✅ Validated payload:', JSON.stringify(payloadData, null, 2));

    // Create shift using service role (has database write permissions)
    const shift = await base44.asServiceRole.entities.ScheduleShift.create(payloadData);

    console.log('✅ Shift created with ID:', shift.id);
    console.log('📊 Persisted record:', JSON.stringify({
      id: shift.id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      employee_email: shift.employee_email,
      employee_name: shift.employee_name,
      job_id: shift.job_id,
      job_name: shift.job_name,
      shift_title: shift.shift_title,
      shift_type: shift.shift_type,
      status: shift.status,
      notes: shift.notes
    }, null, 2));

    // CRITICAL: Verify shift exists in database query
    const allShifts = await base44.asServiceRole.entities.ScheduleShift.list('-date');
    const persistedShift = allShifts.find(s => s.id === shift.id);

    if (!persistedShift) {
      console.error('❌ CRITICAL: Shift created but not found in query!');
      throw new Error('Shift persisted but verification query failed');
    }

    console.log('✅ Verification: Shift found in database query');

    return new Response(JSON.stringify(shift), { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error.message);
    console.error('📍 Error stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});