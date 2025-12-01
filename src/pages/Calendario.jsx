import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Briefcase, CalendarClock, X, Filter, Clock, CheckCircle, XCircle, Repeat, Copy, Layout, Users, BarChart3, List, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, addDays } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import DayView from "../components/calendario/DayView";
import WeekView from "../components/calendario/WeekView";
import MonthView from "../components/calendario/MonthView";
import AssignmentDialog from "../components/calendario/AssignmentDialog";
import AgendaView from "../components/calendario/AgendaView";
import MiniCalendar from "../components/calendario/MiniCalendar";
import RecurringShiftDialog from "../components/calendario/RecurringShiftDialog";
import ConflictAlert, { detectConflicts } from "../components/calendario/ConflictAlert";
import TeamAvailability from "../components/calendario/TeamAvailability";
import ShiftTemplates from "../components/calendario/ShiftTemplates";
import CopyWeekDialog from "../components/calendario/CopyWeekDialog";
import ResourceView from "../components/calendario/ResourceView";
import OccupancyStats from "../components/calendario/OccupancyStats";
import GoogleCalendarSync from "../components/calendario/GoogleCalendarSync";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/toast";
import { DragDropContext } from '@hello-pangea/dnd';

export default function Calendario() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [showDialog, setShowDialog] = useState(false);
  const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [editingShift, setEditingShift] = useState(null);

  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');
  
  // New feature states
  const [showRecurring, setShowRecurring] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCopyWeek, setShowCopyWeek] = useState(false);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [conflicts, setConflicts] = useState([]);

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  // CRITICAL: Replace JobAssignment with ScheduleShift
  const { data: shifts, isLoading } = useQuery({
    queryKey: ['scheduleShifts'],
    queryFn: () => base44.entities.ScheduleShift.list('-date'),
    initialData: [],
  });

  const { data: jobs } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['timeOffRequests'],
    queryFn: () => base44.entities.TimeOffRequest.filter({ status: 'approved' }),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduleShift.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      setShowDialog(false);
      setSelectedDate(null);
      setSelectedTime(null);
      setEditingShift(null);
      setSelectedEventType(null);
      toast.success(language === 'es' ? 'Turno creado' : 'Shift created');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ScheduleShift.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      setShowDialog(false);
      setSelectedDate(null);
      setSelectedTime(null);
      setEditingShift(null);
      setSelectedEventType(null);
      toast.success(language === 'es' ? 'Turno actualizado' : 'Shift updated');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ScheduleShift.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      setShowDialog(false);
      setEditingShift(null);
      setSelectedEventType(null);
      toast.success(language === 'es' ? 'Turno eliminado' : 'Shift deleted');
    }
  });

  // EMPLOYEE ACTIONS: Confirm/Reject shifts
  const confirmShiftMutation = useMutation({
    mutationFn: (shiftId) => base44.entities.ScheduleShift.update(shiftId, { status: 'confirmed' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      toast.success(language === 'es' ? '✅ Turno confirmado' : '✅ Shift confirmed');
    }
  });

  const rejectShiftMutation = useMutation({
    mutationFn: ({ shiftId, reason }) => base44.entities.ScheduleShift.update(shiftId, { 
      status: 'rejected',
      rejection_reason: reason || 'No reason provided'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      toast.success(language === 'es' ? '❌ Turno rechazado' : '❌ Shift rejected');
    }
  });

  const handlePrevious = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => setCurrentDate(new Date());

  // DOUBLE CLICK: Quick shift creation
  const handleDateClick = (date, time = null) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setEditingShift(null);
    setShowEventTypeSelector(true);
  };

  const handleEventTypeSelected = (eventType) => {
    setSelectedEventType(eventType);
    setShowEventTypeSelector(false);
    
    if (eventType === 'time_off') {
      window.location.href = createPageUrl('TimeOffRequests');
    } else {
      setShowDialog(true);
    }
  };

  const handleShiftClick = (shift) => {
    setEditingShift(shift);
    setSelectedDate(null);
    setSelectedTime(null);
    setSelectedEventType(shift.shift_type || null);
    setShowDialog(true);
  };

  const handleSubmit = (data) => {
    if (editingShift) {
      updateMutation.mutate({ id: editingShift.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(language === 'es' ? '¿Eliminar turno?' : 'Delete shift?')) {
      deleteMutation.mutate(id);
    }
  };

  // Create recurring shifts
  const handleCreateRecurring = async (dates) => {
    if (!editingShift) return;
    
    const baseShift = { ...editingShift };
    delete baseShift.id;
    delete baseShift.created_date;
    delete baseShift.updated_date;
    
    for (const date of dates) {
      await createMutation.mutateAsync({
        ...baseShift,
        date: format(date, 'yyyy-MM-dd'),
        status: 'pending'
      });
    }
    
    setShowRecurring(false);
    toast.success(language === 'es' ? `${dates.length} turnos creados` : `${dates.length} shifts created`);
  };

  // Apply template
  const handleApplyTemplate = (template) => {
    if (selectedDate) {
      setEditingShift({
        date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: template.start_time,
        end_time: template.end_time,
        shift_type: template.shift_type,
        title: template.name
      });
      setSelectedEventType(template.shift_type);
      setShowDialog(true);
    }
  };

  // Copy week
  const handleCopyWeek = async (newShifts) => {
    for (const shift of newShifts) {
      await createMutation.mutateAsync(shift);
    }
    toast.success(language === 'es' ? `${newShifts.length} turnos copiados` : `${newShifts.length} shifts copied`);
  };

  // Check conflicts when editing
  const checkConflicts = (shiftData) => {
    const detected = detectConflicts(shifts, shiftData);
    setConflicts(detected);
    return detected.length === 0;
  };

  const handleConfirmShift = (shiftId) => {
    confirmShiftMutation.mutate(shiftId);
  };

  const handleRejectShift = (shiftId) => {
    const reason = window.prompt(
      language === 'es' 
        ? 'Razón del rechazo (opcional):' 
        : 'Rejection reason (optional):'
    );
    rejectShiftMutation.mutate({ shiftId, reason });
  };

  // DRAG AND DROP: Move shifts between dates/times
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const shiftId = result.draggableId;
    const shift = shifts.find(s => s.id === shiftId);
    if (!shift) return;

    // Parse destination format: "date_time" or just "date"
    const [newDate, newTime] = result.destination.droppableId.split('_');
    
    const updatedData = {
      ...shift,
      date: newDate
    };

    if (newTime) {
      updatedData.start_time = newTime;
      // Maintain duration
      const [oldStartH, oldStartM] = shift.start_time.split(':').map(Number);
      const [oldEndH, oldEndM] = shift.end_time.split(':').map(Number);
      const durationMinutes = (oldEndH * 60 + oldEndM) - (oldStartH * 60 + oldStartM);
      
      const [newStartH, newStartM] = newTime.split(':').map(Number);
      const endTotalMinutes = (newStartH * 60 + newStartM) + durationMinutes;
      const endH = Math.floor(endTotalMinutes / 60);
      const endM = endTotalMinutes % 60;
      updatedData.end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    }

    updateMutation.mutate({ id: shiftId, data: updatedData });
  };

  const getDateRange = () => {
    if (view === 'day') return format(currentDate, 'MMMM d, yyyy');
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  };

  const filteredShifts = shifts.filter(shift => {
    if (eventTypeFilter !== 'all' && shift.shift_type !== eventTypeFilter) {
      return false;
    }
    if (employeeFilter !== 'all' && shift.employee_email !== employeeFilter) {
      return false;
    }
    if (jobFilter !== 'all' && shift.job_id !== jobFilter) {
      return false;
    }
    return true;
  });

  // Calculate workload for current period
  const calculateWorkload = () => {
    let start, end;
    if (view === 'day') {
      start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
    } else if (view === 'week') {
      start = startOfWeek(currentDate, { weekStartsOn: 1 });
      end = endOfWeek(currentDate, { weekStartsOn: 1 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }

    const periodShifts = filteredShifts.filter(s => {
      if (!s.date) return false;
      const shiftDate = new Date(s.date);
      return shiftDate >= start && shiftDate <= end;
    });

    const totalEvents = periodShifts.length;
    const jobWork = periodShifts.filter(s => s.shift_type === 'job_work').length;
    const appointments = periodShifts.filter(s => s.shift_type === 'appointment').length;
    const timeOffs = periodShifts.filter(s => s.shift_type === 'time_off').length;

    // Calculate estimated hours
    const totalEstimatedHours = periodShifts.reduce((sum, s) => {
      if (!s.start_time || !s.end_time) return sum;
      const [startH, startM] = s.start_time.split(':').map(Number);
      const [endH, endM] = s.end_time.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + (hours > 0 ? hours : 0);
    }, 0);

    return { totalEvents, jobWork, appointments, timeOffs, totalEstimatedHours };
  };

  const workload = calculateWorkload();

  const isAdmin = user?.role === 'admin';
  const uniqueEmployees = [...new Set(shifts.map(s => s.employee_email).filter(Boolean))];
  const uniqueJobs = [...new Set(shifts.map(s => s.job_id).filter(Boolean))];

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title={t('calendar')}
            description={language === 'es' 
              ? 'Programación Activa de Turnos y Horarios' 
              : 'Active Shift Scheduling & Timetables'}
            icon={CalendarIcon}
          />

          {/* CLICKABLE WORKLOAD SUMMARY CARDS - Quick Filters */}
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card 
              className="bg-gradient-to-br from-[#3B9FF3] to-blue-600 shadow-lg border-0 cursor-pointer hover:shadow-xl transition-shadow dark:from-blue-600 dark:to-blue-700"
              onClick={() => setEventTypeFilter('all')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-50">
                      {language === 'es' ? 'Total Turnos' : 'Total Shifts'}
                    </p>
                    <p className="text-3xl font-bold text-white mt-1">{workload.totalEvents}</p>
                    <p className="text-xs text-blue-100 mt-1">
                      {language === 'es' ? 'Click para mostrar todos' : 'Click to show all'}
                    </p>
                  </div>
                  <CalendarIcon className="w-8 h-8 text-white/60" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-xl hover:border-purple-400 dark:hover:border-purple-500 transition-all"
              onClick={() => setEventTypeFilter('job_work')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {language === 'es' ? 'Trabajo' : 'Job Work'}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{workload.jobWork}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'es' ? 'Click para filtrar' : 'Click to filter'}
                    </p>
                  </div>
                  <Briefcase className="w-8 h-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-xl hover:border-blue-400 dark:hover:border-blue-500 transition-all"
              onClick={() => setEventTypeFilter('appointment')}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {language === 'es' ? 'Citas' : 'Appointments'}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{workload.appointments}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {language === 'es' ? 'Click para filtrar' : 'Click to filter'}
                    </p>
                  </div>
                  <CalendarClock className="w-8 h-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                      {language === 'es' ? 'Horas Totales' : 'Total Hours'}
                    </p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{workload.totalEstimatedHours.toFixed(1)}h</p>
                  </div>
                  <Clock className="w-8 h-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700 mb-6">
            <CardContent className="p-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    {language === 'es' ? 'Tipo de Turno' : 'Shift Type'}
                  </Label>
                  <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">
                        {language === 'es' ? 'Todos los Tipos' : 'All Types'}
                      </SelectItem>
                      <SelectItem value="appointment">
                        {language === 'es' ? 'Citas/Reuniones' : 'Appointments/Meetings'}
                      </SelectItem>
                      <SelectItem value="job_work">
                        {language === 'es' ? 'Trabajo de Campo' : 'Job Work'}
                      </SelectItem>
                      <SelectItem value="time_off">
                        {language === 'es' ? 'Ausencias' : 'Time-Off'}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    {language === 'es' ? 'Empleado' : 'Employee'}
                  </Label>
                  <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">
                        {language === 'es' ? 'Todos los Empleados' : 'All Employees'}
                      </SelectItem>
                      {uniqueEmployees.map(email => {
                        const emp = employees.find(e => e.email === email);
                        return (
                          <SelectItem key={email} value={email}>
                            {emp?.full_name || email}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium">
                    {language === 'es' ? 'Trabajo' : 'Job'}
                  </Label>
                  <Select value={jobFilter} onValueChange={setJobFilter}>
                    <SelectTrigger className="bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
                      <SelectItem value="all">
                        {language === 'es' ? 'Todos los Trabajos' : 'All Jobs'}
                      </SelectItem>
                      {uniqueJobs.map(jobId => {
                        const job = jobs.find(j => j.id === jobId);
                        return (
                          <SelectItem key={jobId} value={jobId}>
                            {job?.name || jobId}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 text-sm font-medium opacity-0">Clear</Label>
                  <Button
                    variant="outline"
                    className="w-full bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                    onClick={() => {
                      setEventTypeFilter('all');
                      setEmployeeFilter('all');
                      setJobFilter('all');
                    }}
                    disabled={eventTypeFilter === 'all' && employeeFilter === 'all' && jobFilter === 'all'}
                  >
                    <X className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Limpiar' : 'Clear'}
                  </Button>
                </div>
              </div>

              {(eventTypeFilter !== 'all' || employeeFilter !== 'all' || jobFilter !== 'all') && (
                <div className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                  <Filter className="w-4 h-4" />
                  <span>
                    {language === 'es' ? 'Mostrando' : 'Showing'} {filteredShifts.length} {language === 'es' ? 'de' : 'of'} {shifts.length} {language === 'es' ? 'turnos' : 'shifts'}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious} className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" onClick={handleToday} className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                {t('today')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext} className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white ml-4">{getDateRange()}</h2>
            </div>

            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={setView}>
                <TabsList className="bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                  <TabsTrigger value="day" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">
                    {language === 'es' ? 'Día' : 'Day'}
                  </TabsTrigger>
                  <TabsTrigger value="week" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">
                    {language === 'es' ? 'Semana' : 'Week'}
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">
                    {language === 'es' ? 'Mes' : 'Month'}
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">
                    <List className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="resource" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white dark:text-slate-300">
                    <Grid3X3 className="w-4 h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {isAdmin && (
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)} className="bg-white dark:bg-slate-800" title={language === 'es' ? 'Plantillas' : 'Templates'}>
                    <Layout className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowCopyWeek(true)} className="bg-white dark:bg-slate-800" title={language === 'es' ? 'Copiar Semana' : 'Copy Week'}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowStats(!showStats)} className="bg-white dark:bg-slate-800" title={language === 'es' ? 'Estadísticas' : 'Stats'}>
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowGoogleSync(true)} className="bg-white dark:bg-slate-800" title={language === 'es' ? 'Sincronizar' : 'Sync'}>
                    <CalendarIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Stats Panel */}
          {showStats && (
            <div className="mb-6">
              <OccupancyStats
                shifts={filteredShifts}
                employees={employees}
                currentDate={currentDate}
                language={language}
              />
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-6">
            {/* Sidebar with Mini Calendar and Team Availability */}
            <div className="hidden lg:block space-y-4">
              <MiniCalendar
                currentDate={currentDate}
                onDateSelect={setCurrentDate}
                shifts={shifts}
                language={language}
              />
              <TeamAvailability
                employees={employees}
                shifts={shifts}
                currentDate={currentDate}
                timeOffRequests={timeOffRequests}
                onEmployeeClick={(emp) => setEmployeeFilter(emp.email)}
                language={language}
              />
            </div>

            {/* Main Calendar Area */}
            <div className="lg:col-span-3">
              <Tabs value={view} className="w-full">
                <TabsContent value="day">
                  <DayView
                    currentDate={currentDate}
                    shifts={filteredShifts}
                    onDateClick={handleDateClick}
                    onShiftClick={handleShiftClick}
                    onConfirmShift={handleConfirmShift}
                    onRejectShift={handleRejectShift}
                    isAdmin={isAdmin}
                    currentUser={user}
                  />
                </TabsContent>
                <TabsContent value="week">
                  <WeekView
                    currentDate={currentDate}
                    shifts={filteredShifts}
                    onDateClick={handleDateClick}
                    onShiftClick={handleShiftClick}
                    onConfirmShift={handleConfirmShift}
                    onRejectShift={handleRejectShift}
                    isAdmin={isAdmin}
                    currentUser={user}
                  />
                </TabsContent>
                <TabsContent value="month">
                  <MonthView
                    currentDate={currentDate}
                    shifts={filteredShifts}
                    onDateClick={handleDateClick}
                    onShiftClick={handleShiftClick}
                    onConfirmShift={handleConfirmShift}
                    onRejectShift={handleRejectShift}
                    isAdmin={isAdmin}
                    currentUser={user}
                  />
                </TabsContent>
                <TabsContent value="agenda">
                  <AgendaView
                    currentDate={currentDate}
                    shifts={filteredShifts}
                    onShiftClick={handleShiftClick}
                    onConfirmShift={handleConfirmShift}
                    onRejectShift={handleRejectShift}
                    isAdmin={isAdmin}
                    currentUser={user}
                    language={language}
                  />
                </TabsContent>
                <TabsContent value="resource">
                  <ResourceView
                    currentDate={currentDate}
                    employees={employees}
                    shifts={filteredShifts}
                    onShiftClick={handleShiftClick}
                    onCellClick={(date, time, email) => {
                      setSelectedDate(new Date(date));
                      setSelectedTime(time);
                      setShowEventTypeSelector(true);
                    }}
                    isAdmin={isAdmin}
                    language={language}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>

          <Dialog open={showEventTypeSelector} onOpenChange={setShowEventTypeSelector}>
            <DialogContent className="max-w-md bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-slate-900 dark:text-white">
                  {language === 'es' ? 'Seleccionar Tipo de Turno' : 'Select Shift Type'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-blue-50 dark:hover:bg-slate-700 hover:border-[#3B9FF3]"
                  onClick={() => handleEventTypeSelected('appointment')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="w-5 h-5 text-[#3B9FF3]" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {language === 'es' ? 'Cita / Reunión' : 'Appointment / Meeting'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {language === 'es' 
                        ? 'Evento genérico sin vinculación a trabajo' 
                        : 'General event not linked to a job'}
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-purple-50 dark:hover:bg-slate-700 hover:border-purple-400"
                  onClick={() => handleEventTypeSelected('job_work')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {language === 'es' ? 'Turno de Trabajo' : 'Job Work Shift'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {language === 'es' 
                        ? 'Turno vinculado a un proyecto específico' 
                        : 'Shift linked to a specific project'}
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:bg-orange-50 dark:hover:bg-slate-700 hover:border-orange-400"
                  onClick={() => handleEventTypeSelected('time_off')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarClock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {language === 'es' ? 'Ausencia' : 'Time-Off'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {language === 'es' 
                        ? 'Redirige a la página de solicitud de tiempo libre' 
                        : 'Redirects to time-off request page'}
                    </p>
                  </div>
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isAdmin && (
            <AssignmentDialog
              open={showDialog}
              onOpenChange={setShowDialog}
              shift={editingShift}
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              selectedEventType={selectedEventType}
              jobs={jobs}
              employees={employees}
              onSubmit={handleSubmit}
              onDelete={handleDelete}
              isProcessing={createMutation.isPending || updateMutation.isPending}
              onShowRecurring={() => setShowRecurring(true)}
              conflicts={conflicts}
            />
          )}

          {/* Recurring Shift Dialog */}
          <RecurringShiftDialog
            open={showRecurring}
            onOpenChange={setShowRecurring}
            baseShift={editingShift}
            onCreateRecurring={handleCreateRecurring}
            language={language}
          />

          {/* Shift Templates */}
          <ShiftTemplates
            open={showTemplates}
            onOpenChange={setShowTemplates}
            onApplyTemplate={handleApplyTemplate}
            language={language}
          />

          {/* Copy Week Dialog */}
          <CopyWeekDialog
            open={showCopyWeek}
            onOpenChange={setShowCopyWeek}
            currentDate={currentDate}
            shifts={shifts}
            onCopyWeek={handleCopyWeek}
            language={language}
          />

          {/* Google Calendar Sync */}
          <GoogleCalendarSync
            open={showGoogleSync}
            onOpenChange={setShowGoogleSync}
            shifts={filteredShifts}
            language={language}
          />
        </div>
      </div>
    </DragDropContext>
  );
}