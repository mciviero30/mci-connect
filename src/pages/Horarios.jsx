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
  const isAdmin = user?.role === 'admin' || 
    ['CEO', 'administrator', 'manager'].includes(user?.position) ||
    user?.department === 'HR';

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['timeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date'),
    initialData: [],
  });

  const pendingEntries = timeEntries.filter(e => e.status === 'pending');
  const approvedEntries = timeEntries.filter(e => e.status === 'approved');

  // FIXED: Added missing closing parenthesis
  const totalPendingHours = pendingEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
  const totalApprovedHours = approvedEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Revisión de Fichajes' : 'Timesheet Review'}
          description={language === 'es' 
            ? 'Auditoría y Aprobación de Horas Trabajadas para Nómina' 
            : 'Audit and Approval of Worked Hours for Payroll'}
          icon={Clock}
        />

        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">{t('pending')}</p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{pendingEntries.length}</p>
                </div>
                <Clock className="w-10 h-10 text-amber-600 dark:text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200 dark:border-orange-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium mb-1">{language === 'es' ? 'Horas Pendientes' : 'Pending Hours'}</p>
                  <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{totalPendingHours.toFixed(1)}h</p>
                </div>
                <Clock className="w-10 h-10 text-orange-600 dark:text-orange-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">{t('approved')}</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{approvedEntries.length}</p>
                </div>
                <Clock className="w-10 h-10 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 border-emerald-200 dark:border-emerald-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-1">{language === 'es' ? 'Horas Aprobadas' : 'Approved Hours'}</p>
                  <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{totalApprovedHours.toFixed(1)}h</p>
                </div>
                <Clock className="w-10 h-10 text-emerald-600 dark:text-emerald-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        <TimeEntryList 
          timeEntries={timeEntries} 
          isAdmin={isAdmin} 
          loading={isLoading}
        />
      </div>
    </div>
  );
}