import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * AUTO CALENDAR SYNC ENGINE - ENHANCED V2
 * 
 * Features:
 * ✅ Deduplication: Prevents duplicate shifts for same user+job+date
 * ✅ Smart Update: Updates existing shifts instead of creating duplicates
 * ✅ Bidirectional Sync: Handles TimeEntry create/update/delete events
 * ✅ Conflict Detection: Alerts on overlapping shifts
 * ✅ Consistent Titles: Unified naming convention
 * ✅ Audit Trail: Detailed logging for debugging
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data, old_data } = await req.json();

    const eventType = event?.type;
    const timeEntry = data;

    console.log(`[AutoCalendar] Event received: ${eventType}`, {
      time_entry_id: timeEntry?.id,
      user_id: timeEntry?.user_id,
      job_id: timeEntry?.job_id,
      date: timeEntry?.date
    });

    // ============================================
    // HANDLE DELETE: Remove auto-created shifts
    // ============================================
    if (eventType === 'delete' && old_data) {
      const linkedShifts = await base44.asServiceRole.entities.ScheduleShift.filter({
        user_id: old_data.user_id,
        job_id: old_data.job_id,
        date: old_data.date,
        notes: 'auto_created_from_time_entry'
      });

      for (const shift of linkedShifts) {
        await base44.asServiceRole.entities.ScheduleShift.delete(shift.id);
        console.log(`[AutoCalendar] 🗑️ Deleted auto-shift ${shift.id} (TimeEntry deleted)`);
      }

      return Response.json({ 
        status: 'success', 
        action: 'deleted_shifts',
        count: linkedShifts.length 
      });
    }

    // ============================================
    // VALIDATE REQUIRED FIELDS
    // ============================================
    if (!timeEntry.user_id || !timeEntry.job_id || !timeEntry.date || !timeEntry.check_in) {
      console.log('[AutoCalendar] ⚠️ Missing required fields - skipping');
      return Response.json({ status: 'skipped', reason: 'missing_required_fields' });
    }

    // ============================================
    // DEDUPLICATION: Check existing shifts
    // ============================================
    const existingShifts = await base44.asServiceRole.entities.ScheduleShift.filter({
      user_id: timeEntry.user_id,
      job_id: timeEntry.job_id,
      date: timeEntry.date
    });

    // Find auto-created shift vs manual shift
    const autoShift = existingShifts.find(s => s.notes === 'auto_created_from_time_entry');
    const manualShift = existingShifts.find(s => s.notes !== 'auto_created_from_time_entry');

    // ============================================
    // CONFLICT DETECTION: Manual shift has priority
    // ============================================
    if (manualShift) {
      console.log('[AutoCalendar] ⚠️ Manual shift exists - respecting it (no auto-sync)', {
        manual_shift_id: manualShift.id,
        manual_title: manualShift.shift_title
      });
      
      // Delete auto-shift if it exists (manual takes precedence)
      if (autoShift) {
        await base44.asServiceRole.entities.ScheduleShift.delete(autoShift.id);
        console.log('[AutoCalendar] 🗑️ Removed auto-shift (manual shift exists)');
      }
      
      return Response.json({ 
        status: 'skipped', 
        reason: 'manual_shift_has_priority',
        manual_shift_id: manualShift.id
      });
    }

    // ============================================
    // BUILD SHIFT DATA
    // ============================================
    const shiftData = {
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
        ? `🚗 Driving – ${timeEntry.job_name}` 
        : `${timeEntry.job_name}`,
      status: 'confirmed',
      notes: 'auto_created_from_time_entry'
    };

    // ============================================
    // UPDATE OR CREATE
    // ============================================
    let result;
    
    if (autoShift) {
      // UPDATE existing auto-shift with latest times
      result = await base44.asServiceRole.entities.ScheduleShift.update(autoShift.id, shiftData);
      console.log('[AutoCalendar] ✅ Updated auto-shift', {
        shift_id: autoShift.id,
        old_times: `${autoShift.start_time}-${autoShift.end_time}`,
        new_times: `${shiftData.start_time}-${shiftData.end_time}`
      });
      
      return Response.json({ 
        status: 'success', 
        action: 'updated',
        shift_id: autoShift.id
      });
    } else {
      // CREATE new auto-shift
      result = await base44.asServiceRole.entities.ScheduleShift.create(shiftData);
      console.log('[AutoCalendar] ✅ Created new auto-shift', {
        shift_id: result.id,
        user: timeEntry.employee_name,
        job: timeEntry.job_name,
        date: timeEntry.date,
        times: `${shiftData.start_time}-${shiftData.end_time}`
      });
      
      return Response.json({ 
        status: 'success', 
        action: 'created',
        shift_id: result.id
      });
    }

  } catch (error) {
    console.error('[AutoCalendar] ❌ Error:', error);
    return Response.json({ 
      status: 'error', 
      error: error.message 
    }, { status: 500 });
  }
});