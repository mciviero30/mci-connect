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

    // Validate required fields
    if (!shiftData.date || !shiftData.start_time || !shiftData.end_time) {
      return new Response(JSON.stringify({ error: 'Missing required fields: date, start_time, end_time' }), { status: 400 });
    }

    console.log('📝 Creating shift with data:', JSON.stringify(shiftData, null, 2));

    // Create shift using service role (has database write permissions)
    const shift = await base44.asServiceRole.entities.ScheduleShift.create(shiftData);

    console.log('✅ Shift created with ID:', shift.id);
    console.log('📊 Full persisted record:', JSON.stringify(shift, null, 2));

    // CRITICAL: Immediately query to confirm what was persisted
    const allShifts = await base44.asServiceRole.entities.ScheduleShift.list('-date');
    const persistedShift = allShifts.find(s => s.id === shift.id);

    console.log('🔍 Verification query - shift in DB:', persistedShift ? '✅ FOUND' : '❌ NOT FOUND');
    if (persistedShift) {
      console.log('📋 Database record fields:', {
        id: persistedShift.id,
        date: persistedShift.date,
        start_time: persistedShift.start_time,
        end_time: persistedShift.end_time,
        employee_email: persistedShift.employee_email,
        employee_name: persistedShift.employee_name,
        job_id: persistedShift.job_id,
        job_name: persistedShift.job_name,
        shift_type: persistedShift.shift_type,
        status: persistedShift.status,
        shift_title: persistedShift.shift_title,
        notes: persistedShift.notes
      });
    }

    return new Response(JSON.stringify(shift), { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error.message);
    console.error('📍 Error stack:', error.stack);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});