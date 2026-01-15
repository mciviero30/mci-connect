import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CURRENT_USER_QUERY_KEY } from '@/components/constants/queryKeys';
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
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);

  const canSee = canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG);

  if (!canSee) return fallback;
  
  return <>{children}</>;
}

/**
 * Admin-Only UI Wrapper
 * Only visible to role === 'admin'
 */
export function AdminOnlyUI({ children, fallback = null }) {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);

  const canSee = canSeeUILevel(user, UI_VISIBILITY_LEVELS.ADMIN_ONLY);

  if (!canSee) return fallback;
  
  return <>{children}</>;
}

/**
 * Conditional UI Hook
 * Returns visibility flags for use in components
 */
export function useUIVisibility() {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData(CURRENT_USER_QUERY_KEY);

  return {
    canSeeProduction: canSeeUILevel(user, UI_VISIBILITY_LEVELS.PRODUCTION),
    canSeeDebug: canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG),
    canSeeAdmin: canSeeUILevel(user, UI_VISIBILITY_LEVELS.ADMIN_ONLY),
    isDebugMode: canSeeUILevel(user, UI_VISIBILITY_LEVELS.DEBUG),
    isAdmin: user?.role === 'admin',
  };
}