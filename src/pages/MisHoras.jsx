
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, TrendingUp, DollarSign } from "lucide-react";
import LiveTimeTracker from "../components/horarios/LiveTimeTracker";
import TimeEntryList from "../components/horarios/TimeEntryList";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, isToday } from "date-fns";
import PageHeader from "../components/shared/PageHeader";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export default function MisHoras() {
  const { t, language } = useLanguage();
  const [editingEntry, setEditingEntry] = useState(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['currentUser'] });

  const { data: timeEntries, isLoading } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.TimeEntry.filter({ employee_email: user.email }, '-date');
    },
    initialData: [],
    enabled: !!user,
  });

  // NEW: Prompt #50 - Check for open clock from previous day
  const openClockAlert = React.useMemo(() => {
    if (!timeEntries || timeEntries.length === 0) return null;
    
    const openEntry = timeEntries.find(entry => 
      !entry.check_out && entry.date && !isToday(new Date(entry.date))
    );
    
    return openEntry;
  }, [timeEntries]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TimeEntry.create({
      ...data,
      employee_email: user.email,
      employee_name: user.full_name,
      status: 'pending',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TimeEntry.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myTimeEntries'] });
      setEditingEntry(null);
      alert('✅ ' + t('savedSuccessfully'));
    },
  });

  const handleEdit = (entry) => {
    setEditingEntry(entry);
  };

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const yearStart = startOfYear(today);

  const hourlyRate = parseFloat(user?.hourly_rate || 25);
  
  // Current Week - ONLY WORK HOURS (not driving)
  const currentWeekEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= weekStart && entryDate <= weekEnd && entry.status === 'approved';
  });
  
  const currentWeekHours = currentWeekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const normalWeekHours = Math.min(currentWeekHours, 40);
  const overtimeWeekHours = Math.max(0, currentWeekHours - 40);
  const weekPay = (normalWeekHours * hourlyRate) + (overtimeWeekHours * hourlyRate * 1.5);

  // Current Month
  const currentMonthEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= monthStart && entryDate <= monthEnd && entry.status === 'approved';
  });
  
  const currentMonthHours = currentMonthEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const normalMonthHours = Math.min(currentMonthHours, 160); // 40h/week * 4 weeks
  const overtimeMonthHours = Math.max(0, currentMonthHours - 160);
  const monthPay = (normalMonthHours * hourlyRate) + (overtimeMonthHours * hourlyRate * 1.5);
  
  // Year to Date
  const ytdEntries = timeEntries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate >= yearStart && entry.status === 'approved';
  });
  
  const ytdHours = ytdEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  
  // Calculate YTD pay with proper OT (this is simplified - real calculation would need weekly breakdown)
  const ytdPay = ytdEntries.reduce((sum, entry) => {
    const hours = entry.hours_worked || 0;
    return sum + (hours * hourlyRate); // Simplified
  }, 0);

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-5xl mx-auto">
        <PageHeader
          title={t('myHours')}
          description={t('trackYourWorkHours')}
          icon={Clock}
        />

        {/* NEW: Prompt #50 - Alert for open clock from previous day */}
        {openClockAlert && (
          <Alert className="mb-6 bg-red-50 border-red-300 text-red-900">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <AlertTitle className="font-bold">
              {language === 'es' ? '⚠️ Reloj Activo Detectado' : '⚠️ Active Clock Detected'}
            </AlertTitle>
            <AlertDescription>
              {language === 'es' 
                ? `Tienes un reloj activo del día ${format(new Date(openClockAlert.date), 'dd/MM/yyyy')} para el trabajo "${openClockAlert.job_name}". Por favor, detenlo ahora en la sección de registros abajo.`
                : `You have an active clock from ${format(new Date(openClockAlert.date), 'MM/dd/yyyy')} for job "${openClockAlert.job_name}". Please stop it now in the records section below.`
              }
            </AlertDescription>
          </Alert>
        )}

        <LiveTimeTracker 
          trackingType="work"
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                {t('currentWeek')}
              </CardTitle>
              <Calendar className="w-5 h-5 text-[#3B9FF3]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3B9FF3]">{currentWeekHours.toFixed(1)}h</div>
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="w-4 h-4 text-slate-600" />
                <span className="text-xl font-bold text-slate-800">${weekPay.toFixed(2)}</span>
              </div>
              {overtimeWeekHours > 0 && (
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  + {overtimeWeekHours.toFixed(1)}h overtime
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                {t('thisMonth')}
              </CardTitle>
              <Calendar className="w-5 h-5 text-[#3B9FF3]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3B9FF3]">{currentMonthHours.toFixed(1)}h</div>
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="w-4 h-4 text-slate-600" />
                <span className="text-xl font-bold text-slate-800">${monthPay.toFixed(2)}</span>
              </div>
              {overtimeMonthHours > 0 && (
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  + {overtimeMonthHours.toFixed(1)}h overtime
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {format(monthStart, 'MMM yyyy')}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-700">
                {t('yearToDate')}
              </CardTitle>
              <TrendingUp className="w-5 h-5 text-[#3B9FF3]" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-[#3B9FF3]">{ytdHours.toFixed(1)}h</div>
              <div className="flex items-center gap-2 mt-2">
                <DollarSign className="w-4 h-4 text-slate-600" />
                <span className="text-xl font-bold text-slate-800">${ytdPay.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {new Date().getFullYear()}
              </p>
            </CardContent>
          </Card>
        </div>
        
        <Card className="bg-white shadow-xl border-slate-200">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="flex items-center gap-2 text-slate-900">
              <Clock className="w-5 h-5 text-[#3B9FF3]" />
              {t('myRecords')}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <TimeEntryList
              timeEntries={timeEntries}
              isLoading={isLoading}
              showActions={true}
              onEdit={handleEdit}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
