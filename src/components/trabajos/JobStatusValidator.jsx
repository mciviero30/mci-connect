import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * JOB STATUS VALIDATOR
 * 
 * Validates job closure conditions:
 * 1. Prevents closing job if there are pending time entries
 * 2. Returns validation status and blocking reasons
 */
export const useJobClosureValidation = (job, timeEntries = []) => {
  return useMemo(() => {
    if (!job) {
      return { 
        canClose: false, 
        reasons: ['No job data'], 
        pendingEntries: [] 
      };
    }

    // Filter time entries for this specific job
    const jobTimeEntries = timeEntries.filter(entry => entry.job_id === job.id);
    const pendingEntries = jobTimeEntries.filter(entry => entry.status === 'pending');

    const reasons = [];
    
    if (pendingEntries.length > 0) {
      reasons.push(`${pendingEntries.length} pending time entries must be approved or rejected`);
    }

    return {
      canClose: reasons.length === 0,
      reasons,
      pendingEntries,
      totalEntries: jobTimeEntries.length
    };
  }, [job, timeEntries]);
};

/**
 * Validates if new time entries can be created for a job
 */
export const canCreateTimeEntry = (job) => {
  if (!job) return { allowed: false, reason: 'Job not found' };
  
  // Block if job is completed or archived
  if (job.status === 'completed' || job.status === 'archived') {
    return { 
      allowed: false, 
      reason: `Job is ${job.status}. Cannot add new time entries to closed jobs.` 
    };
  }

  return { allowed: true, reason: null };
};

/**
 * Server-side validation function that can be called before creating time entries
 */
export const validateTimeEntryCreation = async (jobId) => {
  try {
    const jobs = await base44.entities.Job.filter({ id: jobId });
    const job = jobs[0];
    
    return canCreateTimeEntry(job);
  } catch (error) {
    return { 
      allowed: false, 
      reason: 'Failed to validate job status: ' + error.message 
    };
  }
};