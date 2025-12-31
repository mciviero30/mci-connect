import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { usePaginatedEntityList } from "@/components/hooks/usePaginatedEntityList";
import { Clock } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import TimeEntryList from "../components/horarios/TimeEntryList";
import { useLanguage } from "@/components/i18n/LanguageContext";
import LoadMoreButton from "@/components/shared/LoadMoreButton";

export default function Horarios() {
  const { t, language } = useLanguage();
  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000
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
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        <PageHeader
          title={language === 'es' ? 'Revisión de Fichajes' : 'Timesheet Review'}
          description={language === 'es' 
            ? 'Auditoría y Aprobación de Horas Trabajadas para Nómina' 
            : 'Audit and Approval of Worked Hours for Payroll'}
          icon={Clock}
        />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
          <Card className="soft-amber-gradient shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{t('pending')}</p>
                  <p className="text-3xl font-bold">{pendingEntries.length}</p>
                </div>
                <Clock className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-pink-gradient shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{language === 'es' ? 'Horas Pendientes' : 'Pending Hours'}</p>
                  <p className="text-3xl font-bold">{totalPendingHours.toFixed(1)}h</p>
                </div>
                <Clock className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-green-gradient shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{t('approved')}</p>
                  <p className="text-3xl font-bold">{approvedEntries.length}</p>
                </div>
                <Clock className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="soft-cyan-gradient shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">{language === 'es' ? 'Horas Aprobadas' : 'Approved Hours'}</p>
                  <p className="text-3xl font-bold">{totalApprovedHours.toFixed(1)}h</p>
                </div>
                <Clock className="w-10 h-10 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

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
  );
}