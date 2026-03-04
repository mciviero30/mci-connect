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

    // Only admin can create shifts
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }

    const shiftData = await req.json();
    console.log('📝 Input:', JSON.stringify(shiftData, null, 2));

    // Validate required fields
    if (!shiftData.employee_email || !shiftData.employee_name) {
      return new Response(JSON.stringify({ error: 'Missing employee info' }), { status: 400 });
    }

    // Get today for defaults
    const today = new Date().toISOString().split('T')[0];

    // Build payload with strict defaults
    const payload = {
      user_id: shiftData.user_id || null, // SSOT: preserve user_id from frontend
      employee_email: shiftData.employee_email,
      employee_name: shiftData.employee_name,
      job_id: shiftData.job_id || '',
      job_name: shiftData.job_name || '',
      shift_title: (shiftData.shift_title && shiftData.shift_title.trim()) || 'Scheduled Shift',
      shift_type: shiftData.shift_type || 'job_work',
      date: shiftData.date || today,
      start_time: shiftData.start_time || '08:00',
      end_time: shiftData.end_time || '17:00',
      status: shiftData.status || 'scheduled',
      notes: shiftData.notes || '',
      color: shiftData.color || '',
      custom_color: shiftData.custom_color || '',
    };

    console.log('✅ Payload to save:', JSON.stringify(payload, null, 2));

    // Create shift
    const shift = await base44.asServiceRole.entities.ScheduleShift.create(payload);

    console.log('✅ Created shift ID:', shift.id);
    console.log('✅ Date:', shift.date);
    console.log('✅ Times:', shift.start_time, '-', shift.end_time);

    return new Response(JSON.stringify({
      success: true,
      id: shift.id,
      date: shift.date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      employee_email: shift.employee_email,
      shift_title: shift.shift_title,
      job_id: shift.job_id
    }), { status: 201 });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});