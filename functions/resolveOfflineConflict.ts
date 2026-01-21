import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * OFFLINE CONFLICT RESOLUTION - FASE 9
 * 
 * Resolves TimeEntry conflicts when user works offline on multiple devices
 * and syncs later. Uses deterministic strategies without user intervention.
 * 
 * Principles:
 * - NO blocking user
 * - NO complex UI
 * - Deterministic resolution
 * - Backend = authority
 * - Full audit trail
 * 
 * Strategies (in order):
 * 1. Server Authority - Backend-validated entries win
 * 2. Last Write Wins - Most recent timestamp
 * 3. Auto-merge - Merge non-overlapping data safely
 */

/**
 * Parse time string to comparable number (minutes from midnight)
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return null;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Check if two time ranges overlap
 */
function hasTimeOverlap(start1, end1, start2, end2) {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  
  if (!s1 || !s2) return false;
  
  // If one range has no end, assume current time overlap
  if (!e1 || !e2) return true;
  
  return s1 < e2 && s2 < e1;
}

/**
 * Detect conflicts for same user/job/date
 */
async function detectConflicts(base44, currentEntry) {
  try {
    // Find potentially conflicting entries
    const potentialConflicts = await base44.asServiceRole.entities.TimeEntry.filter({
      employee_email: currentEntry.employee_email,
      job_id: currentEntry.job_id,
      date: currentEntry.date,
      id: { $ne: currentEntry.id } // Exclude current entry
    });

    const conflicts = [];

    for (const existing of potentialConflicts) {
      // Check for time overlap
      if (hasTimeOverlap(
        currentEntry.check_in,
        currentEntry.check_out,
        existing.check_in,
        existing.check_out
      )) {
        conflicts.push(existing);
      }
    }

    return conflicts;
  } catch (error) {
    console.error('[Conflict Detection Error]', error.message);
    return [];
  }
}

/**
 * Resolve conflict using deterministic strategy
 */
function resolveConflict(currentEntry, conflictingEntry) {
  // STRATEGY A: Server Authority
  // Backend-validated entries always win
  if (conflictingEntry.geofence_validated_backend && !currentEntry.geofence_validated_backend) {
    return {
      winner: conflictingEntry,
      strategy: 'server_authority',
      details: 'Backend-validated entry retained, new entry discarded',
      shouldDiscard: true
    };
  }

  if (currentEntry.geofence_validated_backend && !conflictingEntry.geofence_validated_backend) {
    return {
      winner: currentEntry,
      strategy: 'server_authority',
      details: 'Backend-validated entry retained, existing entry discarded',
      shouldDiscard: false,
      shouldDeleteConflicting: true
    };
  }

  // STRATEGY B: Last Write Wins
  // Compare timestamps
  const currentTime = new Date(currentEntry.updated_at || currentEntry.created_date).getTime();
  const existingTime = new Date(conflictingEntry.updated_at || conflictingEntry.created_date).getTime();

  if (currentTime > existingTime) {
    return {
      winner: currentEntry,
      strategy: 'last_write_wins',
      details: `New entry (${new Date(currentTime).toISOString()}) is more recent than existing (${new Date(existingTime).toISOString()})`,
      shouldDiscard: false,
      shouldDeleteConflicting: true
    };
  } else {
    return {
      winner: conflictingEntry,
      strategy: 'last_write_wins',
      details: `Existing entry (${new Date(existingTime).toISOString()}) is more recent than new (${new Date(currentTime).toISOString()})`,
      shouldDiscard: true
    };
  }

  // STRATEGY C: Auto-merge
  // Not implemented in this phase - would merge non-overlapping breaks
  // For now, Last Write Wins is final
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const currentEntry = data;

    // Skip if already marked as resolved
    if (currentEntry.conflict_detected) {
      return Response.json({ 
        success: true, 
        message: 'Conflict already resolved' 
      });
    }

    // STEP 1: Detect conflicts
    const conflicts = await detectConflicts(base44, currentEntry);

    if (conflicts.length === 0) {
      // No conflicts - continue normally
      return Response.json({ 
        success: true, 
        message: 'No conflicts detected' 
      });
    }

    console.log('[Conflict Detected]', {
      currentEntryId: currentEntry.id,
      employee: currentEntry.employee_name,
      date: currentEntry.date,
      conflictsCount: conflicts.length
    });

    // STEP 2: Resolve each conflict
    let finalResolution = null;

    for (const conflictingEntry of conflicts) {
      const resolution = resolveConflict(currentEntry, conflictingEntry);
      
      const now = new Date().toISOString();

      if (resolution.shouldDiscard) {
        // Current entry is loser - mark it (NO DELETE)
        await base44.asServiceRole.entities.TimeEntry.update(currentEntry.id, {
          conflict_detected: true,
          is_conflict_winner: false,
          conflict_lost_to: conflictingEntry.id,
          conflict_resolution_strategy: resolution.strategy,
          conflict_resolved_at: now,
          conflict_details: `Superseded by entry ${conflictingEntry.id}: ${resolution.details}`
        });

        // Mark conflicting entry as winner
        await base44.asServiceRole.entities.TimeEntry.update(conflictingEntry.id, {
          conflict_detected: true,
          is_conflict_winner: true,
          conflict_resolution_strategy: resolution.strategy,
          conflict_resolved_at: now,
          conflict_details: `Resolved against entry ${currentEntry.id}: ${resolution.details}`
        });

        finalResolution = resolution;
        break; // Stop processing, entry marked as loser
      }

      if (resolution.shouldDeleteConflicting) {
        // Conflicting entry is loser - mark it (NO DELETE)
        await base44.asServiceRole.entities.TimeEntry.update(conflictingEntry.id, {
          conflict_detected: true,
          is_conflict_winner: false,
          conflict_lost_to: currentEntry.id,
          conflict_resolution_strategy: resolution.strategy,
          conflict_resolved_at: now,
          conflict_details: `Superseded by entry ${currentEntry.id}: ${resolution.details}`
        });
      }

      // Mark current entry as winner
      await base44.asServiceRole.entities.TimeEntry.update(currentEntry.id, {
        conflict_detected: true,
        is_conflict_winner: true,
        conflict_resolution_strategy: resolution.strategy,
        conflict_resolved_at: now,
        conflict_details: `Resolved against entry ${conflictingEntry.id}: ${resolution.details}`
      });

      finalResolution = resolution;
    }

    // STEP 3: Emit telemetry (if conflict was resolved)
    if (finalResolution) {
      console.log('[🎯 Geofence Telemetry]', {
        event_type: 'offline_conflict_resolved',
        user_email: currentEntry.employee_email,
        job_id: currentEntry.job_id,
        source: 'backend',
        timestamp: new Date().toISOString(),
        metadata: {
          strategy_used: finalResolution.strategy,
          conflicts_count: conflicts.length,
          winner_id: finalResolution.winner.id,
          details: finalResolution.details
        }
      });
    }

    console.log('[Conflict Resolution Complete]', {
      currentEntryId: currentEntry.id,
      strategy: finalResolution?.strategy,
      discarded: finalResolution?.shouldDiscard,
      details: finalResolution?.details
    });

    return Response.json({ 
      success: true,
      conflictDetected: true,
      resolution: finalResolution
    });

  } catch (error) {
    console.error('[Offline Conflict Resolution Error]', error.message);
    
    // CRITICAL: DO NOT block sync on resolution error
    // Just log and continue
    return Response.json({ 
      success: false, 
      error: error.message 
    }, { status: 200 }); // Return 200 to prevent automation retry
  }
});