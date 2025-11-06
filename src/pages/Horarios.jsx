import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Clock } from "lucide-react";
import PageHeader from "../components/shared/PageHeader";
import StatsCard from "../components/shared/StatsCard";
import TimeEntryList from "../components/horarios/TimeEntryList";
import { useLanguage } from "@/components/i18n/LanguageContext";

export default function Horarios() {
  const { t, language } = useLanguage();
  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date'),
    initialData: [],
  });

  const pendingEntries = timeEntries.filter(e => e.status === 'pending');
  const approvedEntries = timeEntries.filter(e => e.status === 'approved');

  const totalPendingHours = pendingEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalApprovedHours = approvedEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Revisión de Fichajes' : 'Timesheet Review'}
          description={language === 'es' 
            ? 'Auditoría y Aprobación de Horas Trabajadas para Nómina' 
            : 'Audit and Approval of Worked Hours for Payroll'}
          icon={Clock}
        />

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard title={t('pending')} value={pendingEntries.length} icon={Clock} color="from-amber-500 to-amber-600" loading={isLoading} />
          <StatsCard title={language === 'es' ? 'Horas Pendientes' : 'Pending Hours'} value={`${totalPendingHours.toFixed(1)}h`} icon={Clock} color="from-amber-500 to-amber-600" loading={isLoading} />
          <StatsCard title={t('approved')} value={approvedEntries.length} icon={Clock} color="from-[#3B9FF3] to-[#2A8FE3]" loading={isLoading} />
          <StatsCard title={language === 'es' ? 'Horas Aprobadas' : 'Approved Hours'} value={`${totalApprovedHours.toFixed(1)}h`} icon={Clock} color="from-[#3B9FF3] to-[#2A8FE3]" loading={isLoading} />
        </div>

        <TimeEntryList timeEntries={timeEntries} isAdmin={isAdmin} loading={isLoading} />
      </div>
    </div>
  );
}