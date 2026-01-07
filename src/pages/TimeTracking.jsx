import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Square, Coffee, CheckCircle, XCircle, Calendar, Download, Users, Shield } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import DailyTimeView from "@/components/time-tracking/DailyTimeView";
import WeeklyTimeView from "@/components/time-tracking/WeeklyTimeView";
import TimeReportsView from "@/components/time-tracking/TimeReportsView";
import ManagerApprovalView from "@/components/time-tracking/ManagerApprovalView";
import LiveTimeTracker from "@/components/horarios/LiveTimeTracker";

export default function TimeTracking() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isManager = user?.role === 'admin' || 
    ['manager', 'CEO', 'supervisor', 'administrator'].includes(user?.position) ||
    user?.department === 'HR';

  // Get today's active time entry
  const { data: todayEntry } = useQuery({
    queryKey: ['todayTimeEntry', user?.email],
    queryFn: async () => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const entries = await base44.entities.TimeEntry.filter({
        employee_email: user.email,
        date: today
      });
      return entries.find(e => !e.check_out) || null;
    },
    enabled: !!user,
  });

  // Get this week's entries for summary
  const { data: weekEntries = [] } = useQuery({
    queryKey: ['weekTimeEntries', user?.email, selectedDate],
    queryFn: async () => {
      const start = format(startOfWeek(selectedDate), 'yyyy-MM-dd');
      const end = format(endOfWeek(selectedDate), 'yyyy-MM-dd');
      return await base44.entities.TimeEntry.filter({
        employee_email: user.email,
        date: { $gte: start, $lte: end }
      });
    },
    enabled: !!user,
  });

  // Clock In mutation - used by LiveTimeTracker
  const clockInMutation = useMutation({
    mutationFn: async (timeEntryData) => {
      if (!user?.email || !user?.full_name) {
        throw new Error('User data not available');
      }
      
      // CRITICAL: Ensure all required fields are present
      const completeData = {
        employee_email: user.email,
        employee_name: user.full_name,
        ...timeEntryData,
        status: 'pending'
      };
      
      return await base44.entities.TimeEntry.create(completeData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntry'] });
      queryClient.invalidateQueries({ queryKey: ['weekTimeEntries'] });
      toast({
        title: language === 'es' ? '✅ Entrada registrada' : '✅ Clocked in',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Clock Out
  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!todayEntry) {
        throw new Error('No active time entry found');
      }
      
      const now = new Date();
      const checkIn = new Date(`${todayEntry.date}T${todayEntry.check_in}`);
      const checkOut = now;
      
      const totalMinutes = differenceInMinutes(checkOut, checkIn);
      const breakMinutes = todayEntry.total_break_minutes || 0;
      const workedMinutes = Math.max(0, totalMinutes - breakMinutes);
      const hours = workedMinutes / 60;
      
      const exceeds_max_hours = hours > 14;

      return await base44.entities.TimeEntry.update(todayEntry.id, {
        check_out: format(now, 'HH:mm:ss'),
        hours_worked: Number(hours.toFixed(2)),
        exceeds_max_hours,
        hour_type: hours > 8 ? 'overtime' : 'normal'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntry'] });
      queryClient.invalidateQueries({ queryKey: ['weekTimeEntries'] });
      toast({
        title: language === 'es' ? '¡Salida registrada!' : 'Clocked out!',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  // Start Break
  const startBreakMutation = useMutation({
    mutationFn: async (breakType) => {
      const now = new Date();
      const breaks = [...(todayEntry.breaks || [])];
      breaks.push({
        type: breakType,
        start_time: format(now, 'HH:mm:ss'),
        end_time: null,
        duration_minutes: 0
      });

      return await base44.entities.TimeEntry.update(todayEntry.id, { breaks });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntry'] });
      toast({
        title: language === 'es' ? 'Pausa iniciada' : 'Break started',
        variant: 'success'
      });
    },
  });

  // End Break
  const endBreakMutation = useMutation({
    mutationFn: async () => {
      const now = new Date();
      const breaks = [...todayEntry.breaks];
      const activeBreak = breaks.find(b => !b.end_time);
      
      if (activeBreak) {
        const startTime = new Date(`${todayEntry.date}T${activeBreak.start_time}`);
        const duration = differenceInMinutes(now, startTime);
        activeBreak.end_time = format(now, 'HH:mm:ss');
        activeBreak.duration_minutes = duration;
      }

      const totalBreakMinutes = breaks.reduce((sum, b) => sum + (b.duration_minutes || 0), 0);

      return await base44.entities.TimeEntry.update(todayEntry.id, {
        breaks,
        total_break_minutes: totalBreakMinutes
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntry'] });
      toast({
        title: language === 'es' ? 'Pausa terminada' : 'Break ended',
        variant: 'success'
      });
    },
  });

  const weekTotal = useMemo(() => {
    return weekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  }, [weekEntries]);

  const activeBreak = todayEntry?.breaks?.find(b => !b.end_time);

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-3 md:p-6 space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] flex items-center justify-center shadow-lg shadow-blue-500/20 flex-shrink-0">
              <Clock className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl md:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                {language === 'es' ? 'Control de Tiempo' : 'Time Tracking'}
              </h1>
              <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5 md:mt-1 font-medium flex items-center gap-1.5">
                <Shield className="w-3 h-3 md:w-4 md:h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <span className="truncate">{language === 'es' ? 'Con geofencing' : 'With geofencing'}</span>
              </p>
            </div>
          </div>

          {isManager && (
            <Button onClick={() => setActiveTab('approvals')} variant="outline" className="h-10 md:h-12 px-3 md:px-6 rounded-xl font-bold shadow-md w-full md:w-auto min-h-[44px]">
              <Users className="w-4 h-4 md:w-5 md:h-5 md:mr-2" />
              <span className="hidden sm:inline">{language === 'es' ? 'Aprobar Horas' : 'Approve Hours'}</span>
              <span className="sm:hidden">{language === 'es' ? 'Aprobar' : 'Approve'}</span>
            </Button>
          )}
        </div>

        {/* Live Time Tracker with Geofencing */}
        <LiveTimeTracker 
          trackingType="work"
          onSave={(timeEntryData) => {
            clockInMutation.mutate(timeEntryData);
          }}
          isLoading={clockInMutation.isPending}
        />

        {/* Week Summary - Mobile Optimized */}
        <Card className="bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-800/50 border-slate-200/60 dark:border-slate-700/60 shadow-xl">
          <CardHeader className="pb-3 md:pb-4">
            <CardTitle className="text-base md:text-xl font-black tracking-tight">{language === 'es' ? 'Resumen Semanal' : 'Weekly Summary'}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-2 md:gap-6">
              <div className="text-center p-2 md:p-4 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-slate-900/50 rounded-xl md:rounded-2xl border border-blue-200/40 dark:border-blue-800/40 shadow-md">
                <p className="text-2xl md:text-4xl font-black text-[#507DB4] dark:text-[#6B9DD8] tracking-tight leading-tight">{weekTotal.toFixed(2)}</p>
                <p className="text-[10px] md:text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 md:mt-2 leading-tight">
                  {language === 'es' ? 'Total' : 'Total'}<br className="md:hidden" />
                  <span className="hidden md:inline"> </span>{language === 'es' ? 'Horas' : 'Hours'}
                </p>
              </div>
              <div className="text-center p-2 md:p-4 bg-gradient-to-br from-green-50 to-white dark:from-green-950/20 dark:to-slate-900/50 rounded-xl md:rounded-2xl border border-green-200/40 dark:border-green-800/40 shadow-md">
                <p className="text-2xl md:text-4xl font-black text-green-600 dark:text-green-400 tracking-tight leading-tight">{weekEntries.filter(e => e.status === 'approved').length}</p>
                <p className="text-[10px] md:text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 md:mt-2 leading-tight">
                  {language === 'es' ? 'Aprobadas' : 'Approved'}
                </p>
              </div>
              <div className="text-center p-2 md:p-4 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900/50 rounded-xl md:rounded-2xl border border-amber-200/40 dark:border-amber-800/40 shadow-md">
                <p className="text-2xl md:text-4xl font-black text-amber-600 dark:text-amber-400 tracking-tight leading-tight">{weekEntries.filter(e => e.status === 'pending').length}</p>
                <p className="text-[10px] md:text-sm font-bold text-slate-600 dark:text-slate-400 mt-1 md:mt-2 leading-tight">
                  {language === 'es' ? 'Pendientes' : 'Pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isManager ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
            <TabsTrigger value="daily" className="text-xs md:text-sm min-h-[40px]">{language === 'es' ? 'Diario' : 'Daily'}</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs md:text-sm min-h-[40px]">{language === 'es' ? 'Semanal' : 'Weekly'}</TabsTrigger>
            <TabsTrigger value="reports" className="text-xs md:text-sm min-h-[40px]">{language === 'es' ? 'Reportes' : 'Reports'}</TabsTrigger>
            {isManager && (
              <TabsTrigger value="approvals" className="text-xs md:text-sm min-h-[40px]">{language === 'es' ? 'Aprobar' : 'Approve'}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="daily" className="mt-4 md:mt-6">
            <DailyTimeView user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>

          <TabsContent value="weekly" className="mt-4 md:mt-6">
            <WeeklyTimeView user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>

          <TabsContent value="reports" className="mt-4 md:mt-6">
            <TimeReportsView user={user} />
          </TabsContent>

          {isManager && (
            <TabsContent value="approvals" className="mt-4 md:mt-6">
              <ManagerApprovalView />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}