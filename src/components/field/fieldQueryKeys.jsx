
/**
 * MCI Field Query Keys - Single Source of Truth
 * 
 * ALL query keys for Field components MUST be defined here.
 * Import this file explicitly wherever FIELD_QUERY_KEYS is needed.
 */

export const FIELD_QUERY_KEYS = {
  FIELD_DIMENSIONS: (jobId) => ['field-dimensions', jobId],
  VERTICAL_MEASUREMENTS: (jobId) => ['vertical-measurements', jobId],
  BENCHMARKS: (jobId) => ['benchmarks', jobId],
  USER: (jobId) => ['field-currentUser', jobId],
  JOB: (jobId) => ['field-job', jobId],
  TASKS: (jobId) => ['field-tasks', jobId],
  WORK_UNITS: (jobId) => ['work-units', jobId],
  PLANS: (jobId) => ['field-plans', jobId],
  PHOTOS: (jobId) => ['field-photos', jobId],
  DOCUMENTS: (jobId) => ['field-documents', jobId],
  MEMBERS: (jobId) => ['field-members', jobId],
  TEAM_MEMBERS: (jobId) => ['field-team-members', jobId],
  CHAT: (jobId) => ['chat-messages', jobId],
  COMPARISONS: (jobId) => ['field-photo-comparisons', jobId],
  ASSIGNMENTS: (jobId) => ['user-job-access', jobId],
  CUSTOMERS: () => ['field-customers'],
  JOBS: () => ['field-jobs'],
};
