import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Briefcase, CalendarClock, X, Filter, Clock, CheckCircle, XCircle, Repeat, Copy, Layout, Users, BarChart3, List, Grid3X3, Search, Download, TrendingUp, AlertTriangle, Timer } from "lucide-react";
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
import AvailabilityOverview from "../components/calendario/AvailabilityOverview";
import ColorLegend from "../components/calendario/ColorLegend";
import ShiftDetailCard from "../components/calendario/ShiftDetailCard";
import TimelineView from "../components/calendario/TimelineView";
import QuickSearch from "../components/calendario/QuickSearch";
import TeamUtilization from "../components/calendario/TeamUtilization";
import ExportCalendar from "../components/calendario/ExportCalendar";
import ConflictResolver from "../components/calendario/ConflictResolver";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { usePermissions } from "@/components/permissions/usePermissions";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { DragDropContext } from '@hello-pangea/dnd';
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { useMemo, useCallback } from 'react';

export default function Calendario() {
  const { t, language } = useLanguage();
  const { hasFullAccess } = usePermissions();
  const isAdmin = hasFullAccess;
  const queryClient = useQueryClient();

  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Mobile detection: default to 'agenda' on small screens
  const [view, setView] = useState(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 'agenda';
    }
    return 'week';
  });
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
  const [showAvailability, setShowAvailability] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [copiedShift, setCopiedShift] = useState(null);
  const [selectedShiftDetail, setSelectedShiftDetail] = useState(null);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showUtilization, setShowUtilization] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showConflicts, setShowConflicts] = useState(false);

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // CRITICAL FIX: Query should use currentDate, not hardcoded "today"
  const { data: shifts, isLoading, refetch: refetchShifts } = useQuery({
    queryKey: ['scheduleShifts', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      // Query shifts for the entire month based on currentDate
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      const data = await base44.entities.ScheduleShift.filter({ 
        date: { $gte: monthStart, $lte: monthEnd }
      });
      console.log(`📅 [Calendar] Loaded ${data?.length || 0} shifts for ${format(currentDate, 'yyyy-MM')}`, data);
      return data || [];
    },
    initialData: [],
    staleTime: 0, // FORCE FRESH DATA - No caching
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      try {
        const data = await base44.entities.Job.list();
        console.log('✅ Jobs loaded:', data?.length);
        return data || [];
      } catch (error) {
        console.error('❌ Error loading jobs:', error);
        return [];
      }
    },
    initialData: [],
    staleTime: 600000,
    refetchOnMount: 'stale',
    refetchOnWindowFocus: false,
    gcTime: Infinity
  });

  // 🚫 EMPLOYEE SSOT: EmployeeDirectory is canonical source
  // DO NOT USE User.list() or User.filter() for employee lists
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const directory = await base44.entities.EmployeeDirectory.list();
      
      // DEFENSIVE: Filter out records missing critical fields
      const validEmployees = directory.filter(d => {
        if (!d.user_id) {
          console.warn('[EMPLOYEE_SSOT_VIOLATION] ⚠️ EmployeeDirectory record missing user_id', {
            component: 'Calendario',
            employee_email: d.employee_email,
            id: d.id
          });
          return false; // Skip records without user_id
        }
        if (!d.employee_email) {
          console.warn('[EMPLOYEE_SSOT_VIOLATION] ⚠️ EmployeeDirectory record missing email', {
            component: 'Calendario',
            user_id: d.user_id,
            id: d.id
          });
          return false;
        }
        return true;
      });
      
      return validEmployees.map(d => ({
        id: d.user_id,
        email: d.employee_email,
        full_name: d.full_name || `${d.first_name || ''} ${d.last_name || ''}`.trim(),
        first_name: d.first_name,
        last_name: d.last_name,
        employment_status: d.status,
        profile_photo_url: d.profile_photo_url,
        avatar_image_url: d.avatar_image_url,
        position: d.position,
        department: d.department
      }));
    },
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  const { data: timeOffRequests = [] } = useQuery({
    queryKey: ['timeOffRequests'],
    queryFn: () => base44.entities.TimeOffRequest.filter({ status: 'approved' }),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // PASO 2: Load TimeEntries for attendance indicator in calendar views
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['calendarTimeEntries', format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];
      return base44.entities.TimeEntry.filter({ date: { $gte: monthStart, $lte: monthEnd } });
    },
    initialData: [],
    staleTime: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createScheduleShift', data);
      return response;
    },
    onSuccess: async (data) => {
      // PERFORMANCE: Single invalidation (no manual refetch)
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });

      setShowDialog(false);
      setSelectedDate(null);
      setSelectedTime(null);
      setEditingShift(null);
      setSelectedEventType(null);
      toast.success(language === 'es' ? 'Turno creado ✅' : 'Shift created ✅');
    },
    onError: (error) => {
      toast.error('Error: ' + (error.message || 'Unknown error'));
    }
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

  const handlePrevious = useCallback(() => {
    if (view === 'day') setCurrentDate(addDays(currentDate, -1));
    else if (view === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subMonths(currentDate, 1));
  }, [view, currentDate]);

  const handleNext = useCallback(() => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1));
    else if (view === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addMonths(currentDate, 1));
  }, [view, currentDate]);

  const handleToday = useCallback(() => setCurrentDate(new Date()), []);

  const handleDeleteAllExceptLast = async () => {
    if (shifts.length <= 1) {
      toast.error(language === 'es' ? 'No hay turnos para eliminar' : 'No shifts to delete');
      return;
    }

    const sortedShifts = [...shifts].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    const toDelete = sortedShifts.slice(1);
    
    const confirmMsg = language === 'es' 
      ? `¿Eliminar ${toDelete.length} turnos (mantener el último)?`
      : `Delete ${toDelete.length} shifts (keep the latest)?`;
    
    if (window.confirm(confirmMsg)) {
      for (const shift of toDelete) {
        await base44.entities.ScheduleShift.delete(shift.id);
      }
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      toast.success(language === 'es' ? `${toDelete.length} turnos eliminados` : `${toDelete.length} shifts deleted`);
    }
  };

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
      // CRITICAL: Refetch jobs when opening dialog to ensure data is loaded
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowDialog(true);
    }
  };

  const handleShiftClick = (shift) => {
    // Show detail card for employees, edit dialog for admins
    if (isAdmin) {
      setEditingShift(shift);
      setSelectedDate(null);
      setSelectedTime(null);
      setSelectedEventType(shift.shift_type || null);
      setShowDialog(true);
    } else {
      setSelectedShiftDetail(shift);
    }
  };

  const handleSubmit = async (data) => {
    console.log('🟡 handleSubmit:', data);
    if (editingShift) {
      return updateMutation.mutateAsync({ id: editingShift.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleDelete = (id) => {
    deleteMutation.mutate(id);
  };

  const handleDeleteAllForJob = async (jobId, jobName) => {
    const shiftsToDelete = shifts.filter(s => s.job_id === jobId);
    const confirmMsg = language === 'es' 
      ? `¿Eliminar TODOS los ${shiftsToDelete.length} turnos de "${jobName}"?`
      : `Delete ALL ${shiftsToDelete.length} shifts for "${jobName}"?`;
    
    if (window.confirm(confirmMsg)) {
      for (const shift of shiftsToDelete) {
        await base44.entities.ScheduleShift.delete(shift.id);
      }
      queryClient.invalidateQueries({ queryKey: ['scheduleShifts'] });
      setShowDialog(false);
      setEditingShift(null);
      toast.success(language === 'es' ? `${shiftsToDelete.length} turnos eliminados` : `${shiftsToDelete.length} shifts deleted`);
    }
  };

  const handleCopyShift = (shift) => {
    const shiftToCopy = { ...shift };
    delete shiftToCopy.id;
    delete shiftToCopy.created_date;
    delete shiftToCopy.updated_date;
    delete shiftToCopy.created_by;
    setCopiedShift(shiftToCopy);
    toast.success(language === 'es' ? '📋 Turno copiado' : '📋 Shift copied');
  };

  // Supports both copy-paste (copiedShift) and touch-drag (explicit shiftToDrag param)
  const handlePasteShift = async (targetDate, shiftToDrag = null) => {
    const source = shiftToDrag || copiedShift;
    if (!source) return;

    const sourceCopy = { ...source };
    delete sourceCopy.id;
    delete sourceCopy.created_date;
    delete sourceCopy.updated_date;
    delete sourceCopy.created_by;
    
    const newShift = {
      ...sourceCopy,
      date: format(targetDate, 'yyyy-MM-dd'),
      status: 'scheduled'
    };
    
    await createMutation.mutateAsync(newShift);
    toast.success(language === 'es' ? '✅ Turno movido' : '✅ Shift moved');
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

  const dateRangeLabel = useMemo(() => {
    if (view === 'day') return format(currentDate, 'MMMM d, yyyy');
    if (view === 'week') {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`;
    }
    return format(currentDate, 'MMMM yyyy');
  }, [view, currentDate]);

  // PERFORMANCE: Memoize filtered shifts
  const filteredShifts = useMemo(() => {
    return shifts.filter(shift => {
      if (eventTypeFilter !== 'all' && shift.shift_type !== eventTypeFilter) {
        return false;
      }
      // Match employee by user_id first, fallback to email
      if (employeeFilter !== 'all') {
        const employeeMatch = shift.user_id 
          ? shift.user_id === employeeFilter 
          : shift.employee_email === employeeFilter;
        if (!employeeMatch) return false;
      }
      if (jobFilter !== 'all' && shift.job_id !== jobFilter) {
        return false;
      }
      return true;
    });
  }, [shifts, eventTypeFilter, employeeFilter, jobFilter]);

  // PERFORMANCE: Memoize workload calculation
  const workload = useMemo(() => {
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
  }, [filteredShifts, currentDate, view]);

  // PERFORMANCE: Memoize unique employees/jobs for filters
  const uniqueEmployees = useMemo(() => 
    [...new Set(shifts.map(s => s.user_id || s.employee_email).filter(Boolean))],
    [shifts]
  );
  
  const uniqueJobs = useMemo(() => 
    [...new Set(shifts.map(s => s.job_id).filter(Boolean))],
    [shifts]
  );

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-2 md:p-8">
          <PageHeader
            title={t('calendar')}
            description={language === 'es' 
              ? 'Programación Activa de Turnos y Horarios' 
              : 'Active Shift Scheduling & Timetables'}
            icon={CalendarIcon}
          />

          {/* CLICKABLE WORKLOAD SUMMARY CARDS - Quick Filters */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 md:gap-2 mb-2 md:mb-3">
            <Card 
              className="bg-gradient-to-br from-[#507DB4]/10 to-[#6B9DD8]/10 border border-[#507DB4]/30 dark:border-[#6B9DD8]/30 shadow-sm cursor-pointer hover:shadow-md hover:border-[#507DB4]/50 transition-all"
              onClick={() => setEventTypeFilter('all')}
            >
              <CardContent className="p-1.5 md:p-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-lg md:text-2xl font-bold leading-tight text-[#507DB4] dark:text-[#6B9DD8]">{workload.totalEvents}</p>
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-[#507DB4]/60 dark:text-[#6B9DD8]/60" />
                  </div>
                  <p className="text-[9px] md:text-xs font-semibold text-[#507DB4]/80 dark:text-[#6B9DD8]/80 leading-tight">
                    {language === 'es' ? 'Total' : 'Total'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-[#507DB4]/40 dark:hover:border-[#6B9DD8]/40 transition-all"
              onClick={() => setEventTypeFilter('job_work')}
            >
              <CardContent className="p-1.5 md:p-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{workload.jobWork}</p>
                    <Briefcase className="w-4 h-4 md:w-5 md:h-5 text-[#507DB4] dark:text-[#6B9DD8] opacity-60" />
                  </div>
                  <p className="text-[9px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                    {language === 'es' ? 'Trabajo' : 'Work'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 cursor-pointer hover:shadow-md hover:border-[#507DB4]/40 dark:hover:border-[#6B9DD8]/40 transition-all"
              onClick={() => setEventTypeFilter('appointment')}
            >
              <CardContent className="p-1.5 md:p-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{workload.appointments}</p>
                    <CalendarClock className="w-4 h-4 md:w-5 md:h-5 text-[#507DB4] dark:text-[#6B9DD8] opacity-60" />
                  </div>
                  <p className="text-[9px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                    {language === 'es' ? 'Citas' : 'Appts'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-slate-800 shadow-sm border-slate-200 dark:border-slate-700 col-span-2 md:col-span-1">
              <CardContent className="p-1.5 md:p-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{workload.totalEstimatedHours.toFixed(1)}h</p>
                    <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#507DB4] dark:text-[#6B9DD8] opacity-60" />
                  </div>
                  <p className="text-[9px] md:text-xs font-semibold text-slate-600 dark:text-slate-400 leading-tight">
                    {language === 'es' ? 'Horas' : 'Hours'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-white dark:bg-slate-800 shadow-md border-slate-200/50 dark:border-slate-700/50 mb-3 rounded-lg md:rounded-xl">
            <CardContent className="p-2 md:p-3">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-1.5 md:gap-4">
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
                      {uniqueEmployees.map(identifier => {
                        // identifier can be user_id or email
                        const emp = employees.find(e => e.id === identifier || e.email === identifier);
                        return (
                          <SelectItem key={identifier} value={identifier}>
                            {emp?.full_name || identifier}
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

          <div className="flex items-start justify-between gap-2 md:gap-4 mb-3 md:mb-6">
            <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
              <Button variant="ghost" size="sm" onClick={handlePrevious} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10 h-9 flex-shrink-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleToday} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10 h-9 font-semibold px-4 flex-shrink-0">
                {t('today')}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleNext} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10 h-9 flex-shrink-0">
                <ChevronRight className="w-4 h-4" />
              </Button>
              <h2 className="text-sm md:text-xl font-bold text-slate-900 ml-2 md:ml-4 truncate" title={dateRangeLabel}>{dateRangeLabel}</h2>
            </div>

            <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
              <Tabs value={view} onValueChange={setView}>
                <TabsList className="bg-white shadow-sm border border-slate-200 h-9 rounded-xl">
                  <TabsTrigger value="day" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 text-xs md:text-sm px-3 md:px-4 h-7 rounded-lg">
                    {language === 'es' ? 'Día' : 'Day'}
                  </TabsTrigger>
                  <TabsTrigger value="week" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 text-xs md:text-sm px-3 md:px-4 h-7 rounded-lg">
                    {language === 'es' ? 'Semana' : 'Week'}
                  </TabsTrigger>
                  <TabsTrigger value="month" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 text-xs md:text-sm px-3 md:px-4 h-7 rounded-lg">
                    {language === 'es' ? 'Mes' : 'Month'}
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 h-7 px-2 rounded-lg">
                    <List className="w-3 h-3 md:w-4 md:h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="resource" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 h-7 px-2 hidden md:flex rounded-lg">
                    <Grid3X3 className="w-3 h-3 md:w-4 md:h-4" />
                  </TabsTrigger>
                  <TabsTrigger value="timeline" className="data-[state=active]:bg-[#1E3A8A] data-[state=active]:text-white text-slate-700 h-7 px-2 hidden md:flex rounded-lg">
                    <Timer className="w-3 h-3 md:w-4 md:h-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Quick Actions */}
              <div className="flex gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    refetchShifts();
                    toast.success(language === 'es' ? '🔄 Recargando...' : '🔄 Refreshing...');
                  }} 
                  className="text-green-600 hover:bg-green-50"
                  title={language === 'es' ? 'Recargar Datos' : 'Refresh Data'}
                >
                  <Repeat className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowQuickSearch(true)} 
                  className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                  title={language === 'es' ? 'Búsqueda Rápida' : 'Quick Search'}
                >
                  <Search className="w-4 h-4" />
                </Button>
                
                {isAdmin && (
                  <>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowExport(true)} 
                      className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10"
                      title={language === 'es' ? 'Exportar' : 'Export'}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowUtilization(!showUtilization)} 
                      className={`text-[#1E3A8A] hover:bg-[#1E3A8A]/10 ${showUtilization ? 'bg-[#1E3A8A]/10' : ''}`}
                      title={language === 'es' ? 'Utilización' : 'Utilization'}
                    >
                      <TrendingUp className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowConflicts(!showConflicts)} 
                      className={`text-red-600 hover:bg-red-50 ${showConflicts ? 'bg-red-50' : ''}`}
                      title={language === 'es' ? 'Conflictos' : 'Conflicts'}
                    >
                      <AlertTriangle className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleDeleteAllExceptLast} className="text-red-600 hover:bg-red-50" title={language === 'es' ? 'Borrar todos excepto el último' : 'Delete all except latest'}>
                      <X className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowTemplates(true)} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10" title={language === 'es' ? 'Plantillas' : 'Templates'}>
                      <Layout className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowCopyWeek(true)} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10" title={language === 'es' ? 'Copiar Semana' : 'Copy Week'}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowAvailability(!showAvailability)} 
                      className={`text-[#1E3A8A] hover:bg-[#1E3A8A]/10 ${showAvailability ? 'bg-[#1E3A8A]/10' : ''}`}
                      title={language === 'es' ? 'Disponibilidad' : 'Availability'}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowStats(!showStats)} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10" title={language === 'es' ? 'Estadísticas' : 'Stats'}>
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setShowGoogleSync(true)} className="text-[#1E3A8A] hover:bg-[#1E3A8A]/10" title={language === 'es' ? 'Sincronizar' : 'Sync'}>
                      <CalendarIcon className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
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

          {/* Utilization Panel */}
          {showUtilization && (
            <div className="mb-6">
              <TeamUtilization
                employees={employees}
                shifts={filteredShifts}
                currentDate={currentDate}
                language={language}
              />
            </div>
          )}

          {/* Conflicts Panel */}
          {showConflicts && (
            <div className="mb-6">
              <ConflictResolver
                shifts={filteredShifts}
                employees={employees}
                onResolveConflict={(shift, action) => {
                  if (action === 'delete') {
                    handleDelete(shift.id);
                  } else {
                    handleShiftClick(shift);
                  }
                  setShowConflicts(false);
                }}
                language={language}
              />
            </div>
          )}

          {/* Availability Overview Panel */}
          {showAvailability && (
            <div className="mb-6">
              <AvailabilityOverview
                employees={employees}
                currentDate={currentDate}
                isAdmin={isAdmin}
              />
            </div>
          )}

          {/* Main Calendar Area - Full Width */}
          <Tabs value={view} className="w-full">
            <TabsContent value="day">
              <DayView
                currentDate={currentDate}
                shifts={filteredShifts}
                onDateClick={handleDateClick}
                onShiftClick={handleShiftClick}
                onConfirmShift={handleConfirmShift}
                onRejectShift={handleRejectShift}
                onCopyShift={handleCopyShift}
                onPasteShift={handlePasteShift}
                copiedShift={copiedShift}
                isAdmin={isAdmin}
                currentUser={user}
                timeEntries={timeEntries}
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
                onCopyShift={handleCopyShift}
                onPasteShift={handlePasteShift}
                copiedShift={copiedShift}
                isAdmin={isAdmin}
                currentUser={user}
                timeEntries={timeEntries}
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
                onCopyShift={handleCopyShift}
                onPasteShift={handlePasteShift}
                copiedShift={copiedShift}
                isAdmin={isAdmin}
                currentUser={user}
                timeEntries={timeEntries}
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
            <TabsContent value="timeline">
              <TimelineView
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

          {/* Mini Calendar and Team Availability - Below Calendar */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
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
              onEmployeeClick={(emp) => setEmployeeFilter(emp.id || emp.email)}
              language={language}
            />
          </div>

          {/* Color Legend */}
          <div className="mt-4">
            <ColorLegend jobs={jobs} language={language} />
          </div>

          <Dialog open={showEventTypeSelector} onOpenChange={setShowEventTypeSelector}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-white border-0 rounded-2xl shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-[#1E3A8A] text-xl font-bold">
                  {language === 'es' ? 'Seleccionar Tipo de Turno' : 'Select Shift Type'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-4">
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-[#1E3A8A]/40 transition-all"
                  onClick={() => handleEventTypeSelected('appointment')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarIcon className="w-5 h-5 text-[#1E3A8A]" />
                      <span className="font-semibold text-slate-900">
                        {language === 'es' ? 'Cita / Reunión' : 'Appointment / Meeting'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {language === 'es' 
                        ? 'Evento genérico sin vinculación a trabajo' 
                        : 'General event not linked to a job'}
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-[#1E3A8A]/40 transition-all"
                  onClick={() => handleEventTypeSelected('job_work')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Briefcase className="w-5 h-5 text-[#1E3A8A]" />
                      <span className="font-semibold text-slate-900">
                        {language === 'es' ? 'Turno de Trabajo' : 'Job Work Shift'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      {language === 'es' 
                        ? 'Turno vinculado a un proyecto específico' 
                        : 'Shift linked to a specific project'}
                    </p>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4 bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-[#1E3A8A]/40 transition-all"
                  onClick={() => handleEventTypeSelected('time_off')}
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <CalendarClock className="w-5 h-5 text-[#1E3A8A]" />
                      <span className="font-semibold text-slate-900">
                        {language === 'es' ? 'Ausencia' : 'Time-Off'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
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
              onDeleteAllForJob={handleDeleteAllForJob}
              onCopyShift={handleCopyShift}
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

          {/* Shift Detail Card */}
          <ShiftDetailCard
            open={!!selectedShiftDetail}
            onOpenChange={(open) => !open && setSelectedShiftDetail(null)}
            shift={selectedShiftDetail}
            job={selectedShiftDetail ? jobs.find(j => j.id === selectedShiftDetail.job_id) : null}
            employees={employees}
            onConfirm={handleConfirmShift}
            onReject={handleRejectShift}
            currentUser={user}
            language={language}
          />

          {/* Quick Search */}
          <QuickSearch
            open={showQuickSearch}
            onOpenChange={setShowQuickSearch}
            shifts={shifts}
            employees={employees}
            jobs={jobs}
            onShiftSelect={handleShiftClick}
            language={language}
          />

          {/* Export Dialog */}
          <ExportCalendar
            open={showExport}
            onOpenChange={setShowExport}
            shifts={filteredShifts}
            employees={employees}
            jobs={jobs}
            currentDate={currentDate}
            language={language}
          />
        </div>
      </div>
    </DragDropContext>
  );
}