
/**
 * Centralized query keys for React Query
 * Prevents key inconsistencies across the app
 */

export const CURRENT_USER_QUERY_KEY = ['currentUser'];

// Document queries
export const QUOTES_QUERY_KEY = (statusFilter = 'all', teamFilter = 'all') => 
  ['quotes', statusFilter, teamFilter];
export const INVOICES_QUERY_KEY = (statusFilter = 'all', teamFilter = 'all') => 
  ['invoices', statusFilter, teamFilter];
export const QUOTES_STATS_QUERY_KEY = (customerIds) => 
  ['quotesStats', customerIds];
export const INVOICES_STATS_QUERY_KEY = (customerIds) => 
  ['invoicesStats', customerIds];

// Entity queries
export const CUSTOMERS_QUERY_KEY = 'customers';
export const JOBS_QUERY_KEY = 'activeJobs';
export const TEAMS_QUERY_KEY = 'teams';
export const EXPENSES_QUERY_QUERY_KEY = 'expenses';
export const TIME_ENTRIES_QUERY_KEY = 'timeEntries';
export const DRIVING_LOGS_QUERY_KEY = 'drivingLogs';
export const EMPLOYEES_QUERY_KEY = 'employees';
export const RECOGNITIONS_QUERY_KEY = 'recognitions';
export const CERTIFICATIONS_QUERY_KEY = (email) => ['certifications', email];

// Dashboard queries
export const DASHBOARD_PREFS_QUERY_KEY = (email) => ['dashboardPreferences', email];
export const MY_TIME_ENTRIES_QUERY_KEY = (email) => ['myTimeEntries', email];
export const MY_EXPENSES_QUERY_KEY = (email) => ['myExpenses', email];
export const MY_DRIVING_LOGS_QUERY_KEY = (email) => ['myDrivingLogs', email];
export const MY_ASSIGNMENTS_QUERY_KEY = (email) => ['myAssignments', email];
export const PENDING_TIME_ENTRIES_QUERY_KEY = 'pendingTimeEntries';
export const PENDING_EXPENSES_COUNT_QUERY_KEY = (email) => ['pendingExpensesCount', email];

// Onboarding queries
export const ONBOARDING_FORMS_QUERY_KEY = (email) => ['onboardingForms', email];

// Agreements & Tax
export const AGREEMENT_SIGNATURES_QUERY_KEY = (email) => ['agreementSignatures', email];
export const TAX_PROFILE_QUERY_KEY = (email) => ['taxProfile', email];
