import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedEntityList } from "@/components/hooks/usePaginatedEntityList";
import { Clock } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import StatsSummaryGrid from "../components/shared/StatsSummaryGrid";
import TimeEntryList from "../components/horarios/TimeEntryList";
import { useLanguage } from "@/components/i18n/LanguageContext";
import LoadMoreButton from "@/components/shared/LoadMoreButton";
import SectionErrorBoundary from "@/components/errors/SectionErrorBoundary";

export default function Horarios() {
  const { t, language } = useLanguage();
  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  const isAdmin = user?.role === 'admin' || 
    ['CEO', 'administrator', 'manager'].includes(user?.position) ||
    user?.department === 'HR';

  const { 
    items: timeEntries = [], 
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    loadMore,
    totalLoaded
  } = usePaginatedEntityList({
    queryKey: 'timeEntries',
    fetchFn: async ({ skip, limit }) => {
      const entries = await base44.entities.TimeEntry.list('-date', limit + skip);
      return entries.slice(skip, skip + limit);
    },
    pageSize: 50,
    staleTime: 3 * 60 * 1000,
  });

  // Memoize expensive calculations
  const { pendingEntries, approvedEntries, totalPendingHours, totalApprovedHours } = useMemo(() => {
    const pending = timeEntries.filter(e => e.status === 'pending');
    const approved = timeEntries.filter(e => e.status === 'approved');
    return {
      pendingEntries: pending,
      approvedEntries: approved,
      totalPendingHours: pending.reduce((sum, e) => sum + (e.hours_worked || 0), 0),
      totalApprovedHours: approved.reduce((sum, e) => sum + (e.hours_worked || 0), 0)
    };
  }, [timeEntries]);

  return (
    <SectionErrorBoundary 
      section={language === 'es' ? 'Horarios' : 'Time Tracking'} 
      language={language}
    >
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-slate-900 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          <PageHeader
            title={language === 'es' ? 'Revisión de Fichajes' : 'Timesheet Review'}
            description={language === 'es' 
              ? 'Auditoría y Aprobación de Horas Trabajadas para Nómina' 
              : 'Audit and Approval of Worked Hours for Payroll'}
            icon={Clock}
            actions={null}
          />

          <StatsSummaryGrid 
            stats={[
              { label: t('pending'), value: pendingEntries.length, icon: Clock, gradient: 'soft-amber-gradient' },
              { label: language === 'es' ? 'Horas Pendientes' : 'Pending Hours', value: `${totalPendingHours.toFixed(1)}h`, icon: Clock, gradient: 'soft-pink-gradient' },
              { label: t('approved'), value: approvedEntries.length, icon: Clock, gradient: 'soft-green-gradient' },
              { label: language === 'es' ? 'Horas Aprobadas' : 'Approved Hours', value: `${totalApprovedHours.toFixed(1)}h`, icon: Clock, gradient: 'soft-cyan-gradient' }
            ]}
            loading={isLoading}
          />

          <TimeEntryList 
            timeEntries={timeEntries} 
            isAdmin={isAdmin} 
            loading={isLoading}
          />

          {hasNextPage && (
            <LoadMoreButton 
              onLoadMore={loadMore}
              hasMore={hasNextPage}
              isLoading={isFetchingNextPage}
              totalLoaded={totalLoaded}
              language={language}
            />
          )}
        </div>
      </div>
    </SectionErrorBoundary>
  );
}