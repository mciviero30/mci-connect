import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * CALENDAR DEDUPLICATION CLEANUP
 * 
 * Removes duplicate ScheduleShifts for the same user+job+date combination.
 * Priority: Manual shifts > Auto-created shifts
 * 
 * Run this once to clean up existing duplicates.
 */

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 });
  }

  try {
    console.log('🧹 [Cleanup] Starting duplicate shifts cleanup...');

    // Get all shifts
    const allShifts = await base44.asServiceRole.entities.ScheduleShift.list();
    
    // Group by user+job+date
    const groups = {};
    
    for (const shift of allShifts) {
      const key = `${shift.user_id || shift.employee_email}|${shift.job_id}|${shift.date}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(shift);
    }

    // Find and resolve duplicates
    const duplicateGroups = Object.entries(groups).filter(([_, shifts]) => shifts.length > 1);
    
    console.log(`[Cleanup] Found ${duplicateGroups.length} groups with duplicates`);

    let deletedCount = 0;
    const deletionLog = [];

    for (const [key, shifts] of duplicateGroups) {
      const [userId, jobId, date] = key.split('|');
      
      // Sort by priority: manual first, then by created_date (newest first)
      const sortedShifts = shifts.sort((a, b) => {
        // Manual shifts have priority
        const aManual = a.notes !== 'auto_created_from_time_entry' && a.notes !== 'auto_generated';
        const bManual = b.notes !== 'auto_created_from_time_entry' && b.notes !== 'auto_generated';
        
        if (aManual && !bManual) return -1;
        if (!aManual && bManual) return 1;
        
        // Both same type - keep newest
        return new Date(b.created_date) - new Date(a.created_date);
      });

      // Keep first (highest priority), delete rest
      const toKeep = sortedShifts[0];
      const toDelete = sortedShifts.slice(1);

      console.log(`\n[Cleanup] Group: ${userId} | ${jobId} | ${date}`);
      console.log(`  ✅ Keeping: ${toKeep.shift_title} (${toKeep.notes || 'manual'}) - ${toKeep.id}`);

      for (const shift of toDelete) {
        await base44.asServiceRole.entities.ScheduleShift.delete(shift.id);
        deletedCount++;
        
        console.log(`  🗑️ Deleted: ${shift.shift_title} (${shift.notes || 'manual'}) - ${shift.id}`);
        
        deletionLog.push({
          deleted_id: shift.id,
          deleted_title: shift.shift_title,
          deleted_type: shift.notes || 'manual',
          kept_id: toKeep.id,
          kept_title: toKeep.shift_title,
          user: userId,
          job: jobId,
          date
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Cleanup complete: ${deletedCount} duplicate shifts removed`);
    console.log('='.repeat(60));

    return Response.json({
      success: true,
      total_shifts: allShifts.length,
      duplicate_groups: duplicateGroups.length,
      deleted_count: deletedCount,
      deletion_log: deletionLog
    });

  } catch (error) {
    console.error('❌ [Cleanup] Error:', error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});