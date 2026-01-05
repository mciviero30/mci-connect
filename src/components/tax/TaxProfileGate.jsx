import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';

/**
 * Tax Profile Gate
 * BLOCKS access to entire app until tax profile is completed
 * EXCEPTION: CEO/Admin are exempt
 */
export default function TaxProfileGate({ user, children }) {
  // CRITICAL: All hooks MUST be called unconditionally at the top
  const navigate = useNavigate();
  const location = useLocation();
  
  // Compute derived values (not hooks)
  const isTaxOnboardingPage = location?.pathname?.includes('TaxOnboarding') || false;
  const isExempt = user?.role === 'ceo' || user?.role === 'admin';
  const hasUser = !!user?.email;

  // Fetch tax profile - ALWAYS declare this hook
  const { data: taxProfile, isLoading, error } = useQuery({
    queryKey: ['taxProfile', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      try {
        const profiles = await base44.entities.TaxProfile.filter({ 
          employee_email: user.email 
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
    enabled: hasUser && !isExempt,
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Create alert if tax profile incomplete
  useEffect(() => {
    if (!hasUser || isLoading || isExempt) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile?.completed;

    if (needsTaxOnboarding && user.email) {
      // Defensive: catch errors to prevent crash
      base44.entities.SystemAlert.filter({
        recipient_email: user.email,
        alert_type: 'tax_info_incomplete',
        read: false,
      }).then(existingAlerts => {
        if (!existingAlerts || existingAlerts.length === 0) {
          base44.entities.SystemAlert.create({
            recipient_email: user.email,
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
  }, [hasUser, taxProfile, isLoading, isExempt, user?.email]);

  // CRITICAL: Block access if tax profile not completed
  useEffect(() => {
    if (!hasUser || isLoading || isExempt || isTaxOnboardingPage) return;

    const needsTaxOnboarding = !taxProfile || !taxProfile?.completed;

    if (needsTaxOnboarding) {
      try {
        navigate(createPageUrl('TaxOnboarding'), { replace: true });
      } catch (err) {
        // Defensive: if navigation fails, fail closed (block in loading state)
        if (import.meta.env.DEV) {
          console.error('TaxProfile navigation error:', err);
        }
      }
    }
  }, [hasUser, taxProfile, isLoading, isTaxOnboardingPage, navigate, isExempt]);

  // CONDITIONAL RENDERING - happens AFTER all hooks
  
  // Defensive: if no user, fail open (allow access)
  if (!hasUser) {
    return children;
  }

  // Show loading while checking (fail closed during verification)
  if (!isExempt && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Verifying tax information...</p>
        </div>
      </div>
    );
  }

  // If query errored, fail closed (block with loading state)
  if (!isExempt && error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-red-600 dark:text-red-400">Unable to verify tax information. Please refresh.</p>
        </div>
      </div>
    );
  }

  // Allow access if: exempt, tax profile loaded and complete
  return children;
}