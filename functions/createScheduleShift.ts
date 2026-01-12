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

    // Create shift using service role (has database write permissions)
    const shift = await base44.asServiceRole.entities.ScheduleShift.create(shiftData);

    console.log('✅ Shift created successfully:', shift.id);

    return new Response(JSON.stringify(shift), { status: 201 });
  } catch (error) {
    console.error('❌ Error creating shift:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});