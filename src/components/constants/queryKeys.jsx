/**
 * Centralized React Query Keys
 * SINGLE SOURCE OF TRUTH for cache keys
 * 
 * CRITICAL: Use these constants everywhere to prevent cache inconsistencies
 */

// Authenticated user query key - MUST be used everywhere
export const CURRENT_USER_QUERY_KEY = ['currentUser'];

// Other shared keys
export const NOTIFICATIONS_QUERY_KEY = (userEmail) => ['notifications', userEmail];
export const AGREEMENT_SIGNATURES_QUERY_KEY = (userEmail) => ['agreementSignatures', userEmail];
export const TAX_PROFILE_QUERY_KEY = (userEmail) => ['taxProfile', userEmail];
export const ONBOARDING_FORMS_QUERY_KEY = (userEmail) => ['onboardingForms', userEmail];