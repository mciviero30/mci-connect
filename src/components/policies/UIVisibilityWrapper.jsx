import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { canSeeUILevel, UI_VISIBILITY_LEVELS } from './UIVisibilityPolicy';

/**
 * Production UI Wrapper
 * Always visible - clean, user-facing components
 */
export function ProductionUI({ children, fallback = null }) {
  return <>{children}</>;
}

/**
 * Debug UI Wrapper
 * Only visible in debug mode (admin or ?debug=true)
 */
export function DebugUI({ children, fallback = null }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const canSee = canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG);

  if (!canSee) return fallback;
  
  return <>{children}</>;
}

/**
 * Admin-Only UI Wrapper
 * Only visible to role === 'admin'
 */
export function AdminOnlyUI({ children, fallback = null }) {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  const canSee = canSeeUILevel(user, UI_VISIBILITY_LEVELS.ADMIN_ONLY);

  if (!canSee) return fallback;
  
  return <>{children}</>;
}

/**
 * Conditional UI Hook
 * Returns visibility flags for use in components
 */
export function useUIVisibility() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
  });

  return {
    canSeeProduction: canSeeUILevel(user, UI_VISIBILITY_LEVELS.PRODUCTION),
    canSeeDebug: canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG),
    canSeeAdmin: canSeeUILevel(user, UI_VISIBILITY_LEVELS.ADMIN_ONLY),
    isDebugMode: canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG),
    isAdmin: user?.role === 'admin',
  };
}