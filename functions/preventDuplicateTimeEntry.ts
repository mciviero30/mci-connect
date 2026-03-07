import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * DUPLICATE TIME ENTRY PREVENTION
 * 
 * PHASE 5 FIX: Prevent duplicate clock-ins for same employee/date
 * 
 * Triggered before TimeEntry.create()
 * Blocks if:
 * - Employee already has open time entry today (check_out is null)
 * - Prevents offline sync duplicates
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process TimeEntry creation events
    if (event.type !== 'create' || event.entity_name !== 'TimeEntry') {
      return Response.json({ success: true, message: 'Not a TimeEntry creation' });
    }

    const newEntry = data;

    // Check for existing open entry on same date
    const existingEntries = await base44.asServiceRole.entities.TimeEntry.filter({
      date: newEntry.date,
      check_out: null
    });

    // Filter by user_id (preferred) or email (fallback)
    const duplicate = existingEntries.find(e => {
      if (newEntry.user_id && e.user_id) {
        return e.user_id === newEntry.user_id;
      }
      return e.employee_email === newEntry.employee_email;
    });

    if (duplicate) {
      console.error('[TIME ENTRY DUPLICATE BLOCK] 🚫 Duplicate clock-in prevented', {
        date: newEntry.date,
        employee_email: newEntry.employee_email,
        existing_entry_id: duplicate.id,
        existing_check_in: duplicate.check_in
      });

      return Response.json({
        success: false,
        error: 'DUPLICATE_TIME_ENTRY',
        message: `You already clocked in today at ${duplicate.check_in}`,
        existing_entry: {
          id: duplicate.id,
          check_in: duplicate.check_in,
          job_name: duplicate.job_name
        },
        resolution: 'Clock out of existing entry before creating new one'
      }, { status: 400 });
    }

    // No duplicate - allow creation
    return Response.json({
      success: true,
      duplicate_check_passed: true,
      date: newEntry.date
    });

  } catch (error) {
    console.error('[TIME ENTRY DUPLICATE BLOCK] Error:', error.message);
    // Fail open - allow creation on validation error
    return Response.json({
      success: true,
      error: error.message,
      validation_skipped: true
    }, { status: 200 });
  }
});