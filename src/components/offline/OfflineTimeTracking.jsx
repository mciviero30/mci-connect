import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useEnhancedOfflineSync } from './EnhancedOfflineSync';

// Enhanced offline time tracking with intelligent sync
export function useOfflineTimeTracking(user) {
  const { isOnline, queueMutation, getCachedData, cacheData } = useEnhancedOfflineSync();
  const [pendingEntries, setPendingEntries] = useState([]);

  // Load pending entries from local storage
  useEffect(() => {
    const cached = getCachedData('pending_time_entries') || [];
    setPendingEntries(cached);
  }, []);

  // Clock in with offline support
  const clockIn = async (jobId, jobName) => {
    const entry = {
      employee_email: user.email,
      employee_name: user.full_name,
      job_id: jobId,
      job_name: jobName,
      date: new Date().toISOString().split('T')[0],
      check_in: new Date().toTimeString().split(' ')[0],
      status: 'pending',
      _offline_id: `offline_${Date.now()}`,
      _synced: false
    };

    if (isOnline) {
      try {
        const created = await base44.entities.TimeEntry.create(entry);
        return created;
      } catch (error) {
        // Fallback to offline
        console.warn('Failed to clock in online, saving offline:', error);
        queueMutation({ entity: 'TimeEntry', operation: 'create', data: entry });
        const updated = [...pendingEntries, entry];
        setPendingEntries(updated);
        cacheData('pending_time_entries', updated);
        return entry;
      }
    } else {
      // Offline mode
      queueMutation({ entity: 'TimeEntry', operation: 'create', data: entry });
      const updated = [...pendingEntries, entry];
      setPendingEntries(updated);
      cacheData('pending_time_entries', updated);
      return entry;
    }
  };

  // Clock out with offline support
  const clockOut = async (entryId) => {
    const updateData = {
      check_out: new Date().toTimeString().split(' ')[0]
    };

    if (isOnline) {
      try {
        await base44.entities.TimeEntry.update(entryId, updateData);
        return true;
      } catch (error) {
        console.warn('Failed to clock out online, saving offline:', error);
        queueMutation({
          entity: 'TimeEntry',
          operation: 'update',
          recordId: entryId,
          data: updateData
        });
        return true;
      }
    } else {
      queueMutation({
        entity: 'TimeEntry',
        operation: 'update',
        recordId: entryId,
        data: updateData
      });
      return true;
    }
  };

  // Add break with offline support
  const addBreak = async (entryId, breakType, duration) => {
    const entry = pendingEntries.find(e => e.id === entryId || e._offline_id === entryId);
    const breaks = entry?.breaks || [];
    
    const newBreak = {
      type: breakType,
      start_time: new Date().toTimeString().split(' ')[0],
      duration_minutes: duration
    };

    const updateData = {
      breaks: [...breaks, newBreak],
      total_break_minutes: (entry?.total_break_minutes || 0) + duration
    };

    if (isOnline) {
      try {
        await base44.entities.TimeEntry.update(entryId, updateData);
        return true;
      } catch (error) {
        queueMutation({
          entity: 'TimeEntry',
          operation: 'update',
          recordId: entryId,
          data: updateData
        });
        return true;
      }
    } else {
      queueMutation({
        entity: 'TimeEntry',
        operation: 'update',
        recordId: entryId,
        data: updateData
      });
      return true;
    }
  };

  return {
    clockIn,
    clockOut,
    addBreak,
    pendingEntries,
    isOnline
  };
}