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

    // Validate core required fields
    if (!shiftData.employee_email || !shiftData.employee_name) {
      return new Response(JSON.stringify({ error: 'Missing required fields: employee_email, employee_name' }), { status: 400 });
    }

    console.log('📝 Input shift data:', JSON.stringify(shiftData, null, 2));

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Set defaults
    const date = shiftData.date || today;
    const startTime = shiftData.start_time || '08:00';
    const endTime = shiftData.end_time || '17:00';

    // Calculate ISO timestamps for calendar compatibility
    const startAt = new Date(`${date}T${startTime}:00`).toISOString();
    const endAt = new Date(`${date}T${endTime}:00`).toISOString();

    // Ensure all fields have defaults (date falls within visible range)
    const payloadData = {
      ...shiftData,
      date,
      start_time: startTime,
      end_time: endTime,
      start_at: startAt,
      end_at: endAt,
      shift_title: (shiftData.shift_title && shiftData.shift_title.trim()) || shiftData.job_name || 'Scheduled Shift',
      shift_type: shiftData.shift_type || 'job_work',
      status: shiftData.status || 'scheduled'
    };

    console.log('✅ Validated payload:', JSON.stringify(payloadData, null, 2));

    // Create shift using service role (has database write permissions)
    const shift = await base44.asServiceRole.entities.ScheduleShift.create(payloadData);

    console.log('✅ ═══════════════════════════════════════');
    console.log('✅ SHIFT PERSISTED SUCCESSFULLY');
    console.log('✅ ═══════════════════════════════════════');
    console.log(`✅ ID: ${shift.id}`);
    console.log(`✅ DATE: ${shift.date}`);
    console.log(`✅ START_TIME: ${shift.start_time}`);
    console.log(`✅ END_TIME: ${shift.end_time}`);
    console.log(`✅ TITLE: ${shift.shift_title}`);
    console.log(`✅ EMPLOYEE: ${shift.employee_name} (${shift.employee_email})`);
    console.log(`✅ JOB: ${shift.job_name || 'N/A'} (${shift.job_id || 'N/A'})`);
    console.log('✅ ═══════════════════════════════════════');

    // CRITICAL: Verify shift exists in database
    const allShifts = await base44.asServiceRole.entities.ScheduleShift.list('-date');
    const persistedShift = allShifts.find(s => s.id === shift.id);

    if (!persistedShift) {
      console.error('❌ CRITICAL: Shift created but not found in query!');
      throw new Error('Shift persisted but verification query failed');
    }

    console.log('✅ Verification: Shift found in database query - READY TO RENDER');

    return new Response(JSON.stringify(shift), { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error.message);
    console.error('📍 Error stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});