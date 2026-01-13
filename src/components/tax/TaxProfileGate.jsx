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
  const isExempt = userRole === 'ceo' || userRole === 'admin';
  const shouldFetchProfile = !!userEmail && !isExempt && !isFieldRoute;



  // Fetch tax profile - ALWAYS called, enabled flag is stable
  const { data: taxProfile, isLoading, error } = useQuery({
    queryKey: ['taxProfile', userEmail],
    queryFn: async () => {
      if (!userEmail) return null;
      try {
        const profiles = await base44.entities.TaxProfile.filter({ 
          employee_email: userEmail 
        });
        return profiles?.[0] || null;
      } catch (err) {
        // Fail closed: treat query error as incomplete profile
        if (import.meta.env.DEV) {
          console.error('TaxProfile query error:', err);
        }
        return null;
      }
    },
    enabled: shouldFetchProfile,
    retry: 1,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Create alert if tax profile incomplete - stable dependencies
  useEffect(() => {
    if (!userEmail || isLoading || isExempt) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile?.completed;

    if (needsTaxOnboarding) {
      // Defensive: catch errors to prevent crash
      base44.entities.SystemAlert.filter({
        recipient_email: userEmail,
        alert_type: 'tax_info_incomplete',
        read: false,
      }).then(existingAlerts => {
        if (!existingAlerts || existingAlerts.length === 0) {
          base44.entities.SystemAlert.create({
            recipient_email: userEmail,
            alert_type: 'tax_info_incomplete',
            title: 'Tax Information Required',
            message: 'You must complete your tax information before using the system. This is required by federal law.',
            severity: 'critical',
            action_url: '/TaxOnboarding',
          }).catch(err => {
            // Silent fail: alert creation is not critical for gate function
            if (import.meta.env.DEV) {
              console.error('Failed to create tax alert:', err);
            }
          });
        }
      }).catch(err => {
        // Silent fail: alert check is not critical for gate function
        if (import.meta.env.DEV) {
          console.error('Failed to check tax alerts:', err);
        }
      });
    }
  }, [userEmail, taxProfile, isLoading, isExempt]);

  // CONDITIONAL RENDERING - happens AFTER all hooks
  
  // DEV: Log render order
  if (import.meta.env.DEV) {
    console.log('🟢 TaxProfileGate rendering:', {
      userEmail,
      isLoading,
      isExempt,
      isFieldRoute,
      taxProfileCompleted: taxProfile?.completed
    });
  }
  
  // CRITICAL: Field routes are sandboxed - skip all gate logic
  if (isFieldRoute) {
    return children;
  }
  
  // Defensive: if no user, fail open (allow access)
  if (!userEmail) {
    return children;
  }

  // Show loading while checking (fail closed during verification)
  if (!isExempt && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying tax information...</p>
          <p className="text-xs text-slate-500 mt-2">This should only take a moment</p>
        </div>
      </div>
    );
  }

  // If query errored, treat as tax profile missing (redirect to TaxOnboarding)
  if (!isExempt && error && !isTaxOnboardingPage) {
    if (import.meta.env.DEV) {
      console.log('🚨 TaxProfile query error, redirecting to TaxOnboarding');
    }
    return <Navigate to={createPageUrl('TaxOnboarding')} replace />;
  }

  // DECLARATIVE REDIRECT: Block access if tax profile not completed
  if (
    userEmail &&
    !isExempt &&
    !isLoading &&
    !isTaxOnboardingPage &&
    (!taxProfile || !taxProfile.completed)
  ) {
    if (import.meta.env.DEV) {
      console.log('🚨 TaxProfileGate BLOCKING access - redirecting to TaxOnboarding');
    }
    return <Navigate to={createPageUrl('TaxOnboarding')} replace />;
  }
  
  // DEV: Log passthrough
  if (import.meta.env.DEV) {
    console.log('✅ TaxProfileGate allowing access');
  }

  // Allow access if: exempt, tax profile loaded and complete
  return children;
}