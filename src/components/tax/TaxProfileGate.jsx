import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { CURRENT_USER_QUERY_KEY, TAX_PROFILE_QUERY_KEY } from '@/components/constants/queryKeys';

/**
 * Tax Profile Gate
 * BLOCKS access to entire app until tax profile is completed
 * EXCEPTION: CEO/Admin are exempt
 * 
 * CRITICAL: Reads user from cache, not props, for stability
 */
export default function TaxProfileGate({ children }) {
  // CRITICAL: ALL HOOKS MUST BE CALLED UNCONDITIONALLY AT THE TOP
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Read user from cache (stable, doesn't cause prop changes)
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);
  
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

  // ALL HOOKS - called unconditionally
  // Fetch tax profile - ONLY when truly needed
  const { data: taxProfile, isLoading, error } = useQuery({
    queryKey: TAX_PROFILE_QUERY_KEY(userEmail),
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

  // Handle redirect in useEffect to prevent render loop
  useEffect(() => {
    // Only redirect if all conditions are met
    const shouldRedirect = 
      !isFieldRoute && 
      !isOnboardingPage && 
      !isTaxOnboardingPage && 
      userEmail && 
      !onboardingIncomplete && 
      !isExempt && 
      !isLoading && 
      (!taxProfile || !taxProfile.completed);

    if (shouldRedirect) {
      console.log('[TaxProfileGate] 🚫 REDIRECTING to tax onboarding', { 
        userEmail, 
        hasTaxProfile: !!taxProfile, 
        isCompleted: taxProfile?.completed 
      });
      navigate(createPageUrl('TaxOnboarding'), { replace: true });
    }
  }, [isFieldRoute, isOnboardingPage, isTaxOnboardingPage, userEmail, onboardingIncomplete, isExempt, isLoading, taxProfile, navigate]);

  // EARLY EXITS - ZERO UI BLOCKING
  // CRITICAL: Always return children wrapped in fragment for consistent tree shape
  
  // Skip gate for special routes (Field, Onboarding, TaxOnboarding itself)
  if (isFieldRoute || isOnboardingPage || isTaxOnboardingPage) {
    console.log('[TaxProfileGate] Special route detected - passing through', { 
      isFieldRoute, isOnboardingPage, isTaxOnboardingPage 
    });
    return <>{children}</>;
  }
  
  // No user = allow access (defensive)
  if (!userEmail) {
    console.log('[TaxProfileGate] No user email - passing through');
    return <>{children}</>;
  }
  
  // Onboarding incomplete = skip tax check entirely
  if (onboardingIncomplete) {
    console.log('[TaxProfileGate] Onboarding incomplete - passing through', { userEmail });
    return <>{children}</>;
  }

  // Exempt users (admin/CEO) skip tax check
  if (isExempt) {
    console.log('[TaxProfileGate] User exempt (admin/CEO) - passing through', { userEmail, userRole });
    return <>{children}</>;
  }

  // All checks passed - always render children
  // Redirect is handled in useEffect above
  console.log('[TaxProfileGate] Rendering children', { userEmail, isLoading, hasTaxProfile: !!taxProfile });
  return <>{children}</>;
}