import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

/**
 * Tax Profile Gate
 * BLOCKS access to entire app until tax profile is completed
 * EXCEPTION: CEO/Admin are exempt
 * 
 * CRITICAL: Reads user from cache, not props, for stability
 */
export default function TaxProfileGate({ children }) {
  // CRITICAL: All hooks MUST be called unconditionally at the top
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // Read user from cache (stable, doesn't cause prop changes)
  const user = queryClient.getQueryData(['currentUser']);
  
  // Compute stable derived values BEFORE hooks
  const userEmail = user?.email || null;
  const userRole = user?.role || null;
  const isTaxOnboardingPage = location?.pathname?.includes('TaxOnboarding') || false;
  const isFieldRoute = location?.pathname?.includes('/Field') || false;
  const isOnboardingPage = location?.pathname?.includes('OnboardingWizard') || false;
  const isExempt = userRole === 'ceo' || userRole === 'admin';
  
  // CRITICAL: Don't check tax until onboarding is complete
  const onboardingIncomplete = user && user.onboarding_completed !== true;
  const shouldFetchProfile = !!userEmail && !isExempt && !isFieldRoute && !onboardingIncomplete;



  // Fetch tax profile - ONLY when truly needed
  const { data: taxProfile, isLoading, error } = useQuery({
    queryKey: ['taxProfile', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      const profiles = await base44.entities.TaxProfile.filter({ 
        employee_email: userEmail 
      });
      return profiles?.[0] || null;
    },
    enabled: shouldFetchProfile,
    retry: 0,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // REMOVED: Alert creation - not needed, causes extra queries

  // EARLY EXITS - ZERO UI BLOCKING
  
  // Skip gate for special routes (Field, Onboarding, TaxOnboarding itself)
  if (isFieldRoute || isOnboardingPage || isTaxOnboardingPage) {
    return children;
  }
  
  // No user = allow access (defensive)
  if (!userEmail) {
    return children;
  }
  
  // Onboarding incomplete = skip tax check entirely
  if (onboardingIncomplete) {
    return children;
  }

  // Exempt users (admin/CEO) skip tax check
  if (isExempt) {
    return children;
  }

  // ONLY NOW check tax - redirect immediately if incomplete (no loading screen)
  if (!isLoading && (!taxProfile || !taxProfile.completed)) {
    return <Navigate to={createPageUrl('TaxOnboarding')} replace />;
  }

  // All checks passed OR still loading (fail open)
  return children;
}