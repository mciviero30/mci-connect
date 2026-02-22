import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/ui/toast";
import { LanguageProvider, useLanguage } from "@/components/i18n/LanguageContext";
import { PermissionsProvider } from "@/components/permissions/PermissionsContext";
import { UIProvider, useUI } from "@/components/contexts/FieldModeContext";
import MobileOptimizations from "@/components/shared/MobileOptimizations";
import ServiceWorkerRegistration from "@/components/pwa/ServiceWorkerRegistration";
import { SyncQueueProvider } from "@/components/pwa/SyncQueueManager";
import BackgroundSyncManager from "@/components/mobile/BackgroundSyncManager";
import InstallPrompt from "@/components/mobile/InstallPrompt";
import NotificationEngine from "@/components/notifications/NotificationEngine";
import UniversalNotificationEngine from "@/components/notifications/UniversalNotificationEngine";
import CustomerNotificationEngine from "@/components/notifications/CustomerNotificationEngine";
import UniversalPushManager from "@/components/notifications/IOSPushManager";
import SessionTimeoutManager from "@/components/security/SessionTimeoutManager";
import OfflineBanner from "@/components/resilience/OfflineBanner";
import { LayoutGates } from '@/components/layout/LayoutGates';
import { LayoutHeader } from '@/components/layout/LayoutHeader';
import { LayoutMainContent } from '@/components/layout/LayoutMainContent';
import { LayoutSidebar } from '@/components/layout/LayoutSidebar';
import { SidebarProvider } from "@/components/ui/sidebar";
import { getNavigationForRole } from "@/components/core/roleRules";

const LayoutContentWrapper = ({ children, currentPageName, user }) => {
        const { isFieldMode, isFocusMode, toggleFocusMode, shouldHideSidebar } = useUI();
        const navigate = useNavigate();
        const queryClient = useQueryClient();
        const { language, changeLanguage } = useLanguage();
        const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
        const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
        const sidebarContentRef = useRef(null);
        const location = useLocation();

        // DEFENSIVE NAVIGATION COMPUTATION: Always returns array
        const navigation = React.useMemo(() => {
          if (!user) return [];
          // Force role to be read directly, not from cache
          const freshUser = { ...user, role: user.role?.toLowerCase() };
          const nav = getNavigationForRole(freshUser);
          return Array.isArray(nav) ? nav : [];
        }, [user?.id, user?.role]);

  const { data: pendingExpenses } = useQuery({
    queryKey: ['pendingExpensesCount', user?.email, user?.role],
    queryFn: async () => {
      if (!user) return 0;
      if (user.role === 'admin') {
        const expenses = await base44.entities.Expense.filter({ status: 'pending' }, '', 100);
        return expenses.length;
      } else {
        const expenses = await base44.entities.Expense.filter({
          employee_email: user.email,
          status: 'pending'
        }, '', 20);
        return expenses.length;
      }
    },
    enabled: !!user,
    initialData: 0,
    staleTime: 60000,
    gcTime: 300000,
    refetchInterval: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const { data: clientMemberships = [] } = useQuery({
    queryKey: ['client-memberships-check', user?.email, user?.role],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email && user?.role !== 'admin',
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const isClientOnly = clientMemberships.length > 0 && user?.role !== 'admin';

  return (
    <LayoutGates 
      user={user} 
      isClientOnly={isClientOnly}
      location={location}
      navigate={navigate}
      queryClient={queryClient}
    >
      <SidebarProvider>
        <ServiceWorkerRegistration />
        <BackgroundSyncManager />
        <InstallPrompt />
        <MobileOptimizations />
        <SyncQueueProvider>

          {user && user.employment_status !== 'deleted' && (
            <ErrorBoundary fallback={<div />}>
              <NotificationEngine user={user} />
              <UniversalNotificationEngine user={user} />
              <CustomerNotificationEngine user={user} />
              <UniversalPushManager user={user} />
              <SessionTimeoutManager />
            </ErrorBoundary>
          )}

          <OfflineBanner language={language} />
          
          <div className="min-h-screen flex w-full bg-[#F8FAFC] dark:bg-[#181818]">
            {!shouldHideSidebar && (
              <LayoutSidebar
                navigation={navigation}
                location={location}
                pendingExpenses={pendingExpenses}
                sidebarContentRef={sidebarContentRef}
                user={user}
                theme={theme}
                setTheme={setTheme}
                language={language}
                changeLanguage={changeLanguage}
                profileImage={user?.profile_photo_url || user?.avatar_image_url}
                imageKey={user?.profile_last_updated || user?.id}
              />
            )}

            <LayoutHeader
              user={user}
              theme={theme}
              setTheme={setTheme}
              toggleFocusMode={toggleFocusMode}
              isFieldMode={isFieldMode}
              isFocusMode={isFocusMode}
              shouldHideSidebar={shouldHideSidebar}
            />

            <LayoutMainContent
              children={children}
              currentPageName={currentPageName}
              isFocusMode={isFocusMode}
              isFieldMode={isFieldMode}
              toggleFocusMode={toggleFocusMode}
              shouldHideSidebar={shouldHideSidebar}
              user={user}
              pendingExpenses={pendingExpenses}
              navigation={getNavigationForRole(user)}
              globalSearchOpen={globalSearchOpen}
              setGlobalSearchOpen={setGlobalSearchOpen}
            />
          </div>
        </SyncQueueProvider>
      </SidebarProvider>
    </LayoutGates>
  );
};

export default function Layout({ children, currentPageName }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: async () => {
      try {
        // Always force fresh data on mount
        sessionStorage.removeItem('auth_redirect_pending');
        return await base44.auth.me();
      } catch (err) {
        if (err?.status === 401 || err?.message?.includes('401')) {
          const hasRedirected = sessionStorage.getItem('auth_redirect_pending');
          if (!hasRedirected) {
            sessionStorage.setItem('auth_redirect_pending', 'true');
            base44.auth.redirectToLogin();
          }
          return null;
        }
        throw err;
      }
    },
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: false,
  });

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(regs => {
        regs.forEach(r => r.unregister());
      });
    }
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user && !isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="text-center">
          <p className="text-slate-600 dark:text-slate-400 mb-4">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <ErrorBoundary>
        <LanguageProvider>
          <PermissionsProvider>
            <UIProvider>
              {isLoading ? (
                <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
                  <div className="w-12 h-12 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : !user ? (
                <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
                  <div className="text-center">
                    <p className="text-slate-600 dark:text-slate-400 mb-4">Redirecting to login...</p>
                  </div>
                </div>
              ) : (
                <LayoutContentWrapper 
                  currentPageName={currentPageName} 
                  user={user}
                >
                  {children}
                </LayoutContentWrapper>
              )}
            </UIProvider>
          </PermissionsProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </ToastProvider>
  );
}