import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Play, Square, Coffee, CheckCircle, XCircle, Calendar, Download, Users } from "lucide-react";
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay, differenceInMinutes } from "date-fns";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import DailyTimeView from "@/components/time-tracking/DailyTimeView";
import WeeklyTimeView from "@/components/time-tracking/WeeklyTimeView";
import TimeReportsView from "@/components/time-tracking/TimeReportsView";
import ManagerApprovalView from "@/components/time-tracking/ManagerApprovalView";

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

  // Clock In
  const clockInMutation = useMutation({
    mutationFn: async (jobId) => {
      if (!user?.email || !user?.full_name) {
        throw new Error('User data not available');
      }
      
      const now = new Date();
      return await base44.entities.TimeEntry.create({
        employee_email: user.email,
        employee_name: user.full_name,
        date: format(now, 'yyyy-MM-dd'),
        check_in: format(now, 'HH:mm:ss'),
        job_id: jobId || '',
        job_name: '',
        breaks: [],
        total_break_minutes: 0,
        status: 'pending',
        geofence_validated: false,
        requires_location_review: false,
        exceeds_max_hours: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayTimeEntry'] });
      queryClient.invalidateQueries({ queryKey: ['weekTimeEntries'] });
      toast.success(language === 'es' ? '¡Entrada registrada!' : 'Clocked in!');
    },
    onError: (error) => {
      toast.error((language === 'es' ? 'Error: ' : 'Error: ') + error.message);
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
      toast.success(language === 'es' ? '¡Salida registrada!' : 'Clocked out!');
    },
    onError: (error) => {
      toast.error((language === 'es' ? 'Error: ' : 'Error: ') + error.message);
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
      toast.success(language === 'es' ? 'Pausa iniciada' : 'Break started');
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
      toast.success(language === 'es' ? 'Pausa terminada' : 'Break ended');
    },
  });

  const weekTotal = useMemo(() => {
    return weekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  }, [weekEntries]);

  const activeBreak = todayEntry?.breaks?.find(b => !b.end_time);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#181818] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
              <Clock className="w-8 h-8 text-blue-600" />
              {language === 'es' ? 'Control de Tiempo' : 'Time Tracking'}
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {language === 'es' ? 'Registra tus horas de trabajo' : 'Track your working hours'}
            </p>
          </div>

          {isManager && (
            <Button onClick={() => setActiveTab('approvals')} variant="outline">
              <Users className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Aprobar Horas' : 'Approve Hours'}
            </Button>
          )}
        </div>

        {/* Clock In/Out Card */}
        <Card className="bg-gradient-to-br from-blue-50 to-white dark:from-slate-800 dark:to-slate-900 border-2 border-blue-100 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{format(new Date(), 'EEEE, MMMM d, yyyy')}</span>
              <Badge variant={todayEntry ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                {todayEntry ? (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Activo' : 'Active'}
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Fuera' : 'Off'}
                  </>
                )}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!todayEntry ? (
              <Button
                size="lg"
                onClick={() => clockInMutation.mutate()}
                disabled={clockInMutation.isPending}
                className="w-full h-16 text-lg bg-green-600 hover:bg-green-700"
              >
                <Play className="w-6 h-6 mr-2" />
                {language === 'es' ? 'Registrar Entrada' : 'Clock In'}
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Entrada' : 'Check In'}</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{todayEntry.check_in}</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-lg">
                    <p className="text-sm text-slate-600 dark:text-slate-400">{language === 'es' ? 'Horas' : 'Hours'}</p>
                    <p className="text-2xl font-bold text-blue-600">{todayEntry.hours_worked || '0.00'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  {!activeBreak ? (
                    <>
                      <Button
                        onClick={() => startBreakMutation.mutate('break')}
                        disabled={startBreakMutation.isPending}
                        variant="outline"
                        className="flex-1"
                      >
                        <Coffee className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Iniciar Pausa' : 'Start Break'}
                      </Button>
                      <Button
                        onClick={() => clockOutMutation.mutate()}
                        disabled={clockOutMutation.isPending}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                      >
                        <Square className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Registrar Salida' : 'Clock Out'}
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => endBreakMutation.mutate()}
                      disabled={endBreakMutation.isPending}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <Coffee className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Terminar Pausa' : 'End Break'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week Summary */}
        <Card>
          <CardHeader>
            <CardTitle>{language === 'es' ? 'Resumen Semanal' : 'Weekly Summary'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{weekTotal.toFixed(2)}</p>
                <p className="text-sm text-slate-600">{language === 'es' ? 'Horas Totales' : 'Total Hours'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{weekEntries.filter(e => e.status === 'approved').length}</p>
                <p className="text-sm text-slate-600">{language === 'es' ? 'Aprobadas' : 'Approved'}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">{weekEntries.filter(e => e.status === 'pending').length}</p>
                <p className="text-sm text-slate-600">{language === 'es' ? 'Pendientes' : 'Pending'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="daily">{language === 'es' ? 'Diario' : 'Daily'}</TabsTrigger>
            <TabsTrigger value="weekly">{language === 'es' ? 'Semanal' : 'Weekly'}</TabsTrigger>
            <TabsTrigger value="reports">{language === 'es' ? 'Reportes' : 'Reports'}</TabsTrigger>
            {isManager && (
              <TabsTrigger value="approvals">{language === 'es' ? 'Aprobar' : 'Approve'}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="daily" className="mt-6">
            <DailyTimeView user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>

          <TabsContent value="weekly" className="mt-6">
            <WeeklyTimeView user={user} selectedDate={selectedDate} onDateChange={setSelectedDate} />
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <TimeReportsView user={user} />
          </TabsContent>

          {isManager && (
            <TabsContent value="approvals" className="mt-6">
              <ManagerApprovalView />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}