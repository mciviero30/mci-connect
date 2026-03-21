import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DollarSign,
  TrendingUp,
  Clock,
  Receipt,
  Briefcase,
  Calendar as CalendarIcon,
  Users,
  MapPin,
  Award,
  Cake,
  Target,
  CheckCircle2,
  User,
  Loader2,
  AlertTriangle,
  Plus,
  Settings as SettingsIcon,
  Save,
  X as XIcon,
  Trophy,
  Download
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, isSameDay, getDay } from "date-fns";
import LiveClock from "../components/dashboard/LiveClock";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TimeOffRequestDialog from "../components/dashboard/TimeOffRequestDialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import { Progress } from "@/components/ui/progress";
import PhotoAvatarManager from "../components/avatar/PhotoAvatarManager";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { AnimatePresence, motion } from "framer-motion";
import DashboardWidget from "../components/dashboard/DashboardWidget";
import StatsWidget from "../components/dashboard/widgets/StatsWidget";
import ChartWidget from "../components/dashboard/widgets/ChartWidget";
import ListWidget from "../components/dashboard/widgets/ListWidget";
import WidgetLibrary from "../components/dashboard/WidgetLibrary";
import RecognitionFeed from "../components/recognition/RecognitionFeed";
import TopRecognitionsWidget from "../components/recognition/TopRecognitionsWidget";
import GiveKudosDialog from "../components/recognition/GiveKudosDialog";
import QuickActions from "../components/dashboard/QuickActions";
import { useUIVisibility, DebugUI, AdminOnlyUI } from "@/components/policies/UIVisibilityWrapper";
import FieldWorkIndicator from "@/components/dashboard/FieldWorkIndicator";
import SectionErrorBoundary from "@/components/errors/SectionErrorBoundary";
import QuickStatsWidgets from "../components/dashboard/QuickStatsWidgets";
import ARWidget from "../components/dashboard/ARWidget";
import { FileSpreadsheet } from "lucide-react";
import { exportToExcel } from "@/components/shared/UniversalExcelExport";
import ActualVsEstimatedChart from "../components/dashboard/ActualVsEstimatedChart";
import { AIPredictor } from "@/components/advanced/AIPredictor";
import { PerformanceMonitor } from "@/components/monitoring/PerformanceMonitor";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/advanced/MicroInteractions";
import { hasFullAccess } from "@/components/core/roleRules";

// Default layouts
const DEFAULT_ADMIN_LAYOUT = [
  { id: 'active-employees-1', type: 'active-employees', title: 'Active Employees', icon: Users, size: 'small', position: 0, visible: true },
  { id: 'active-jobs-1', type: 'active-jobs', title: 'Active Jobs', icon: Briefcase, size: 'small', position: 1, visible: true },
  { id: 'pending-expenses-1', type: 'pending-expenses', title: 'Pending Expenses', icon: Receipt, size: 'small', position: 2, visible: true },
  { id: 'total-hours-1', type: 'total-hours', title: 'Total Hours', icon: Clock, size: 'small', position: 3, visible: true },
];

const DEFAULT_EMPLOYEE_LAYOUT = [
  { id: 'work-hours-1', type: 'work-hours', title: 'Work Hours', icon: Clock, size: 'small', position: 0, visible: true },
  { id: 'driving-hours-1', type: 'driving-hours', title: 'Driving Hours', icon: MapPin, size: 'small', position: 1, visible: true },
  { id: 'weekly-pay-1', type: 'weekly-pay', title: 'Weekly Pay', icon: DollarSign, size: 'small', position: 2, visible: true },
  { id: 'my-expenses-1', type: 'my-expenses', title: 'My Expenses', icon: Receipt, size: 'small', position: 3, visible: true },
];

export default function Dashboard() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [showPhotoManager, setShowPhotoManager] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [showKudosDialog, setShowKudosDialog] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // I5 FIX: Use hasFullAccess from roleRules for consistency
  const isAdmin = hasFullAccess(user);

  // UI Visibility Policy
  const { canSeeDebug, canSeeAdmin } = useUIVisibility();

  // Load dashboard preferences — C4 FIX: use user_id as primary key, fallback to email
  const { data: dashboardPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['dashboardPreferences', user?.id || user?.email],
    queryFn: async () => {
      if (!user?.id && !user?.email) return null;
      // Try by user_id first (SSOT), then fallback to email for legacy records
      if (user?.id) {
        const byId = await base44.entities.DashboardPreferences.filter({ user_id: user.id });
        if (byId.length > 0) return byId[0];
      }
      const byEmail = await base44.entities.DashboardPreferences.filter({ user_email: user.email });
      return byEmail[0] || null;
    },
    enabled: !!user?.email,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  // Initialize widgets from preferences or defaults
  useEffect(() => {
    if (dashboardPrefs?.layout) {
      setWidgets(dashboardPrefs.layout);
    } else if (user) {
      setWidgets(isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT);
    }
  }, [dashboardPrefs, user, isAdmin]);

  // Save dashboard preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (layout) => {
      if (dashboardPrefs) {
        await base44.entities.DashboardPreferences.update(dashboardPrefs.id, { layout, user_id: user.id });
      } else {
        // C4 FIX: save with user_id as SSOT
        await base44.entities.DashboardPreferences.create({
          user_id: user.id,
          user_email: user.email,
          layout
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardPreferences'] });
    }
  });

  // Check which widgets need data
  const needsEmployeeData = !isAdmin && widgets.some(w => ['work-hours', 'driving-hours', 'weekly-pay'].includes(w.type));
  const needsExpenseData = widgets.some(w => ['my-expenses', 'pending-expenses'].includes(w.type));
  const needsAssignmentData = !isAdmin && widgets.some(w => w.type === 'my-assignments');
  const needsRecognitionData = widgets.some(w => ['recent-recognitions', 'recognition-feed', 'top-recognitions'].includes(w.type));
  const needsAdminData = isAdmin && widgets.some(w => ['active-employees', 'total-hours', 'pending-timesheets'].includes(w.type));

  // DATA QUERIES - Optimized with increased staleTime and conditional loading
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.TimeEntry.filter({
        user_id: user.id,
        status: 'approved'
      }, '-date', 100);
    },
    enabled: !!user?.id && needsEmployeeData,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['myExpenses', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Admins see all expenses, employees see only their own
      if (isAdmin) {
        return base44.entities.Expense.list('-date', 200);
      }
      return base44.entities.Expense.filter({
        user_id: user.id
      }, '-date', 50);
    },
    enabled: !!user?.id && needsExpenseData,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['myDrivingLogs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.DrivingLog.filter({
        user_id: user.id,
        status: 'approved'
      }, '-date', 50);
    },
    enabled: !!user?.id && needsEmployeeData,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: async () => {
      const allJobs = await base44.entities.Job.filter({ status: 'active' }, 'name');
      // Employees see only assigned jobs; admins see all
      if (isAdmin) return allJobs;
      return allJobs.filter(j => {
        const assigned = (j.assigned_team_field || []).includes(user?.email) || j.team_id === user?.team_id;
        return assigned;
      });
    },
    enabled: !!user,
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: [], // FIX: Ensure jobs is always an array
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['myAssignments', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      // Employees see only their assignments; admins see all
      const allAssignments = isAdmin 
        ? await base44.entities.JobAssignment.list('-date')
        : await base44.entities.JobAssignment.filter({
            user_id: user.id
          }, '-date');

      return allAssignments.filter(a => {
        const assignDate = new Date(a.date);
        return assignDate >= weekStart && assignDate <= weekEnd;
      });
    },
    enabled: !!user?.id && needsAssignmentData,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  // SSOT: Use EmployeeProfile linked to User
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      try {
        // Fetch active users with their profiles
        const profiles = await base44.entities.EmployeeProfile.filter({ employment_status: 'active' }, '-created_date');
        
        return profiles.map(p => ({
          id: p.user_id,
          email: null,
          full_name: `${p.first_name || ''} ${p.last_name || ''}`.trim(),
          position: p.position || null,
          department: p.department || null,
          employment_status: p.employment_status,
          dob: p.date_of_birth || null
        }));
      } catch (err) {
        console.error('allEmployees query failed:', err);
        return [];
      }
    },
    enabled: needsAdminData || widgets.some(w => w.type === 'birthdays-today'),
    staleTime: 1800000,
    gcTime: 3600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 200),
    enabled: isAdmin && widgets.some(w => w.type === 'total-hours'),
    staleTime: 900000,
    gcTime: 1800000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['allExpenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    enabled: isAdmin && needsExpenseData,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['recentRecognitions'],
    queryFn: () => base44.entities.Recognition.list('-date', 5),
    enabled: needsRecognitionData,
    staleTime: 900000,
    gcTime: 1800000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['myCertifications', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return base44.entities.Certification.filter({ user_id: user.id }, '-expiration_date');
    },
    enabled: !!user?.id && !isAdmin,
    staleTime: 1800000,
    gcTime: 3600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: pendingTimeEntries = [] } = useQuery({
    queryKey: ['pendingTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending' }, '-date', 100),
    enabled: isAdmin && widgets.some(w => w.type === 'pending-timesheets'),
    staleTime: 300000,
    gcTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialData: [],
  });

  const { data: quotes = [] } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => base44.entities.Quote.list('-created_date', 100),
    enabled: isAdmin,
    staleTime: 600000,
    gcTime: 900000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    initialData: [],
  });

  // CALCULATIONS - Heavily memoized for optimal performance
  const calculations = useMemo(() => {
    const today = new Date();
    const weekStart = startOfWeek(today, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
    const yearStart = startOfYear(today);
    const hourlyRate = parseFloat(user?.hourly_rate || 25);

    let currentWeekHours = 0;
    let currentWeekPay = 0;
    let yearHours = 0;
    let drivingHoursThisWeek = 0;
    let drivingPayThisWeek = 0;

    if (!isAdmin && timeEntries.length > 0) {
      const weekEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= weekStart && entryDate <= weekEnd;
      });

      currentWeekHours = weekEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
      const normalHours = Math.min(currentWeekHours, 40);
      const overtimeHours = Math.max(0, currentWeekHours - 40);
      currentWeekPay = (normalHours * hourlyRate) + (overtimeHours * hourlyRate * 1.5);

      const yearEntries = timeEntries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate >= yearStart;
      });
      yearHours = yearEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

      const weekDriving = drivingLogs.filter(log => {
        const logDate = new Date(log.date);
        return logDate >= weekStart && logDate <= weekEnd;
      });

      drivingHoursThisWeek = weekDriving.reduce((sum, log) => sum + (log.hours || 0), 0);
      drivingPayThisWeek = weekDriving.reduce((sum, log) => sum + ((log.hours || 0) * hourlyRate), 0);
    }

    // Admin/CEO see ALL employees. Regular users see filtered list.
    const activeEmployees = allEmployees.filter(e =>
      (
        e.employment_status === 'active' ||
        e.employment_status === 'pending_registration' ||
        !e.employment_status
      )
    );

    const pendingExpenseCount = isAdmin
      ? allExpenses.filter(e => e.status === 'pending').length
      : expenses.filter(e => e.status === 'pending').length;

    const totalWorkedHours = allTimeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);

    const todaysBirthdays = allEmployees.filter(emp => {
      if (!emp.dob) return false;
      const dob = new Date(emp.dob);
      return isSameDay(new Date(today.getFullYear(), dob.getMonth(), dob.getDate()), today);
    });

    const recentAchievements = recognitions.slice(0, 3);
    const weekProgress = (currentWeekHours / 40) * 100;
    const pendingTimesheetsCount = pendingTimeEntries.length;

    return {
      currentWeekHours,
      currentWeekPay,
      yearHours,
      drivingHoursThisWeek,
      drivingPayThisWeek,
      activeEmployees,
      pendingExpenseCount,
      totalWorkedHours,
      todaysBirthdays,
      recentAchievements,
      weekProgress,
      pendingTimesheetsCount
    };
  }, [timeEntries, drivingLogs, allEmployees, allExpenses, expenses, allTimeEntries, recognitions, pendingTimeEntries, user?.hourly_rate, isAdmin]);

  const {
    currentWeekHours,
    currentWeekPay,
    yearHours,
    drivingHoursThisWeek,
    drivingPayThisWeek,
    activeEmployees,
    pendingExpenseCount,
    totalWorkedHours,
    todaysBirthdays,
    recentAchievements,
    weekProgress,
    pendingTimesheetsCount
  } = calculations;

  // WIDGET HANDLERS
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(widgets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    setWidgets(updatedItems);
  };

  const handleRemoveWidget = (widgetId) => {
    setWidgets(widgets.filter(w => w.id !== widgetId));
  };

  const handleResizeWidget = (widgetId, newSize) => {
    setWidgets(widgets.map(w => w.id === widgetId ? { ...w, size: newSize } : w));
  };

  const handleAddWidget = (widget) => {
    if (widget && widget.id && widget.type) {
      setWidgets(prev => [...prev, widget]);
      setShowWidgetLibrary(false);
    }
  };

  const handleSaveLayout = () => {
    savePreferencesMutation.mutate(widgets);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    if (dashboardPrefs?.layout) {
      setWidgets(dashboardPrefs.layout);
    } else {
      setWidgets(isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT);
    }
    setIsEditMode(false);
  };

  // WIDGET RENDERERS
  const renderWidget = (widget) => {
    switch (widget.type) {
      case 'active-employees':
        return (
          <Link to={createPageUrl('Empleados')}>
            <StatsWidget value={activeEmployees.length} label={t('employees')} icon={Users} color="blue" />
          </Link>
        );
      
      case 'active-jobs':
        return (
          <Link to={createPageUrl('Trabajos')}>
            <StatsWidget value={Array.isArray(jobs) ? jobs.length : 0} label={t('jobs')} icon={Briefcase} color="green" />
          </Link>
        );
      
      case 'pending-expenses':
        return (
          <Link to={createPageUrl('Gastos')}>
            <StatsWidget value={pendingExpenseCount} label={t('pendingExpenses')} icon={Receipt} color="amber" badge={pendingExpenseCount > 0 ? pendingExpenseCount : null} />
          </Link>
        );
      
      case 'total-hours':
        return (
          <Link to={createPageUrl('Horarios')}>
            <StatsWidget value={`${totalWorkedHours.toFixed(1)}h`} label={t('totalWorkedHours')} icon={Clock} color="slate" />
          </Link>
        );
      
      case 'work-hours':
        return (
          <motion.div className="group h-full flex flex-col gap-3 p-3 bg-gradient-to-br from-blue-50 to-blue-50/50 dark:from-blue-950/30 dark:to-blue-900/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30 shadow-sm hover:shadow-md transition-all hover:border-blue-300/80 dark:hover:border-blue-700/50"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">Work Hours</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">{currentWeekHours.toFixed(1)}h</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <Progress value={Math.min(weekProgress, 100)} className="h-1.5" />
            <p className="text-[9px] text-blue-600 dark:text-blue-300 font-medium">{yearHours.toFixed(1)}h year-to-date</p>
          </motion.div>
        );
      
      case 'driving-hours':
        return (
          <motion.div className="group h-full flex flex-col gap-3 p-3 bg-gradient-to-br from-green-50 to-green-50/50 dark:from-green-950/30 dark:to-green-900/20 rounded-xl border border-green-200/50 dark:border-green-800/30 shadow-sm hover:shadow-md transition-all hover:border-green-300/80 dark:hover:border-green-700/50"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-green-700 dark:text-green-300 uppercase tracking-wide">Driving Hours</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">{drivingHoursThisWeek.toFixed(1)}h</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center group-hover:bg-green-500/30 transition-colors">
                <MapPin className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-green-600 dark:text-green-300 font-semibold">
              <DollarSign className="w-3.5 h-3.5" />
              <span>${drivingPayThisWeek.toFixed(2)} earned</span>
            </div>
          </motion.div>
        );
      
      case 'weekly-pay':
        return (
          <motion.div className="group h-full flex flex-col gap-3 p-3 bg-gradient-to-br from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-900/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30 shadow-sm hover:shadow-md transition-all hover:border-amber-300/80 dark:hover:border-amber-700/50"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 uppercase tracking-wide">Weekly Pay</p>
                <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">${(currentWeekPay + drivingPayThisWeek).toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center group-hover:bg-amber-500/30 transition-colors">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-[9px] text-amber-600 dark:text-amber-300 font-medium">
              <span>Work: ${currentWeekPay.toFixed(2)}</span>
              <span className="text-amber-400">•</span>
              <span>Driving: ${drivingPayThisWeek.toFixed(2)}</span>
            </div>
          </motion.div>
        );
      
      case 'my-expenses':
        return (
          <motion.div className="group h-full flex flex-col gap-3 p-3 bg-gradient-to-br from-slate-50 to-slate-50/50 dark:from-slate-950/30 dark:to-slate-900/20 rounded-xl border border-slate-200/50 dark:border-slate-800/30 shadow-sm hover:shadow-md transition-all hover:border-slate-300/80 dark:hover:border-slate-700/50"
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Pending Expenses</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">{pendingExpenseCount}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:bg-opacity-30 transition-colors ${pendingExpenseCount > 0 ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                <Receipt className={`w-5 h-5 ${pendingExpenseCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`} />
              </div>
            </div>
            <p className={`text-[9px] font-semibold ${pendingExpenseCount > 0 ? 'text-red-600 dark:text-red-300' : 'text-green-600 dark:text-green-300'}`}>
              {pendingExpenseCount > 0 ? `${pendingExpenseCount} awaiting approval` : 'All caught up!'}
            </p>
          </motion.div>
        );
      
      case 'pending-timesheets':
        return (
          <Alert className="bg-yellow-50/50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700/50">
            <AlertTriangle className="h-5 w-5 text-yellow-700 dark:text-yellow-400" />
            <AlertTitle className="text-yellow-900 dark:text-yellow-200 font-bold">
              {pendingTimesheetsCount} {language === 'es' ? 'horas pendientes' : 'pending hours'}
            </AlertTitle>
            <AlertDescription>
              <Link to={createPageUrl('Horarios')}>
                <Button size="sm" className="bg-yellow-700 hover:bg-yellow-800 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white mt-2">
                  <Clock className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Revisar' : 'Review'}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        );
      
      case 'birthdays-today':
        if (todaysBirthdays.length === 0) return <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-8">No birthdays today</p>;
        return (
          <ListWidget
            items={todaysBirthdays}
            renderItem={(emp) => (
              <Link to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                <div className="flex items-center gap-3 p-4 bg-pink-50/50 dark:bg-pink-900/20 rounded-xl border border-pink-200 dark:border-pink-700/50 hover:border-pink-400 dark:hover:border-pink-500 hover:shadow-md transition-all cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-pink-500 flex items-center justify-center">
                   <Cake className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white">{getDisplayName(emp)}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400">{emp.position}</p>
                  </div>
                  <Badge className="soft-pink-gradient">¡Felicidades!</Badge>
                </div>
              </Link>
            )}
          />
        );
      
      case 'recent-recognitions':
        if (recentAchievements.length === 0) return <p className="text-slate-600 dark:text-slate-400 text-sm text-center py-8">No recent recognitions</p>;
        return (
          <ListWidget
            items={recentAchievements}
            renderItem={(rec) => (
              <div className="flex items-center gap-3 p-4 bg-amber-50/50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-700/50 hover:shadow-md transition-all">
                <div className="w-9 h-9 rounded-lg bg-amber-500 flex items-center justify-center">
                 <Trophy className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{rec.title}</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">{rec.employee_name}</p>
                </div>
                <Badge className="soft-amber-gradient">+{rec.points} pts</Badge>
              </div>
            )}
          />
        );
      
      case 'my-assignments':
        return (
          <ListWidget
            items={assignments}
            emptyMessage="You have no jobs assigned this week"
            renderItem={(assignment) => {
              const job = Array.isArray(jobs) ? jobs.find(j => j.id === assignment.job_id) : null;
              return (
                <Link to={createPageUrl(`JobDetails?id=${assignment.job_id}`)}>
                  <div className="p-4 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-700/50 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">{assignment.job_name}</h3>
                      {job && (
                        <Badge className="bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600">
                          {job.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {format(new Date(assignment.date), 'MMM dd')}
                      </div>
                      {assignment.start_time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {assignment.start_time} - {assignment.end_time}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              );
            }}
          />
        );

      case 'recognition-feed':
        return <RecognitionFeed limit={5} showTitle={false} />;
      
      case 'top-recognitions':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-slate-900 dark:text-white">Top Performers</h3>
            </div>
            <TopRecognitionsWidget limit={5} />
          </div>
        );

      default:
        return <p className="text-slate-600 dark:text-slate-400 text-sm">Widget not implemented</p>;
    }
  };

  // O3 FIX: Memoize profile image computation
  const profileImage = useMemo(() => {
    if (!user) return null;
    
    // Check preferred image first
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
    // Then check profile_photo_url
    if (user.profile_photo_url) {
      return user.profile_photo_url;
    }
    
    // Fallback to avatar if exists
    if (user.avatar_image_url) {
      return user.avatar_image_url;
    }
    
    return null;
  }, [user?.preferred_profile_image, user?.avatar_image_url, user?.profile_photo_url]);

  const imageKey = user?.profile_last_updated || user?.id;

  // Dynamic greetings - changes daily based on day of week
  const dayOfWeek = new Date().getDay();
  const greetings = useMemo(() => [
    language === 'es' ? '¡Espero que hayas descansado bien!' : 'Hope you had a good rest!', // Sunday
    language === 'es' ? '¡Dale con todo! 💪' : 'Let\'s crush it! 💪', // Monday
    language === 'es' ? '¡Vamos, que el martes es grande! 🚀' : 'Keep it up, Tuesday is huge! 🚀', // Tuesday
    language === 'es' ? '¡Mitad de semana, casi logrando! 🎯' : 'Midweek grind, almost there! 🎯', // Wednesday
    language === 'es' ? '¡Viernes es mañana, vamos! ⚡' : 'Friday is tomorrow, go! ⚡', // Thursday
    language === 'es' ? '¡Viernes, el día más hermoso! 🎉' : 'Friday is here, celebrate! 🎉', // Friday
    language === 'es' ? '¡Fin de semana, relájate! 😎' : 'Weekend mode: ON! 😎' // Saturday
  ], [language]);
  const greeting = greetings[dayOfWeek];

  if (userLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#507DB4] dark:text-[#6B9DD8] mx-auto mb-4" />
          <p className="text-slate-900 dark:text-slate-100 font-semibold">Loading dashboard...</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-2">Preparing your personalized widgets</p>
        </div>
      </div>
    );
  }

  return (
    <SectionErrorBoundary 
      section={language === 'es' ? 'Dashboard' : 'Dashboard'} 
      language={language}
    >
      <div className="min-h-screen pb-20 md:pb-0 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #E8F4FD 0%, #D9E9F4 50%, #F1F5F9 100%)'
      }}>
        <div className="p-2 sm:p-2 md:p-3 lg:p-4">
      {/* Network Pattern Background */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="network-pattern" x="0" y="0" width="200" height="200" patternUnits="userSpaceOnUse">
              <circle cx="20" cy="20" r="2" fill="#507DB4" opacity="0.4" />
              <circle cx="100" cy="50" r="2.5" fill="#507DB4" opacity="0.6" />
              <circle cx="180" cy="30" r="2" fill="#507DB4" opacity="0.4" />
              <circle cx="60" cy="120" r="2" fill="#507DB4" opacity="0.5" />
              <circle cx="150" cy="150" r="2.5" fill="#507DB4" opacity="0.6" />
              <circle cx="30" cy="180" r="2" fill="#507DB4" opacity="0.4" />
              
              <line x1="20" y1="20" x2="100" y2="50" stroke="#507DB4" strokeWidth="0.5" opacity="0.2" />
              <line x1="100" y1="50" x2="180" y2="30" stroke="#507DB4" strokeWidth="0.5" opacity="0.2" />
              <line x1="20" y1="20" x2="60" y2="120" stroke="#507DB4" strokeWidth="0.5" opacity="0.15" />
              <line x1="100" y1="50" x2="150" y2="150" stroke="#507DB4" strokeWidth="0.5" opacity="0.2" />
              <line x1="60" y1="120" x2="150" y2="150" stroke="#507DB4" strokeWidth="0.5" opacity="0.15" />
              <line x1="60" y1="120" x2="30" y2="180" stroke="#507DB4" strokeWidth="0.5" opacity="0.15" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#network-pattern)" />
        </svg>
      </div>
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-2 sm:mb-3 md:mb-4">
          {/* Top row: Avatar, greeting, and badge */}
          <div className="flex items-start justify-between gap-2 sm:gap-2 mb-2 sm:mb-2">
            <div className="flex items-center gap-2 sm:gap-2 flex-1 min-w-0">
              <button
                onClick={() => setShowPhotoManager(true)}
                className="group relative hover:scale-105 transition-transform flex-shrink-0"
              >
                {profileImage ? (
                  <img
                    key={imageKey}
                    src={`${profileImage}?v=${imageKey}`}
                    alt={user?.full_name}
                    className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full object-cover ring-1 sm:ring-2 ring-[#1E3A8A]/40 hover:ring-[#3B82F6]/60 transition-all shadow-lg"
                  />
                ) : (
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center ring-1 sm:ring-2 ring-[#1E3A8A]/40 hover:ring-[#3B82F6]/60 transition-all shadow-lg">
                    <span className="text-white font-bold text-[10px] sm:text-xs md:text-sm">
                      {user?.full_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                  <User className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>

              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-white leading-tight truncate">
                 {user ? `${t('hello')}, ${getDisplayName(user)}!` : t('hello')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-[9px] sm:text-[10px] md:text-xs mt-0 sm:mt-0.5 truncate">
                  {isAdmin ? (language === 'es' ? '¡Bienvenido al panel de administración!' : 'Welcome to the admin panel!') : getGreeting()}
                </p>
              </div>
            </div>

            {isAdmin && (
              <div className="flex-shrink-0">
                <Badge className="border-[#507DB4]/20 dark:border-[#507DB4]/30 text-[#507DB4] dark:text-[#6B9DD8] bg-blue-50/40 dark:bg-blue-900/10 shadow-sm whitespace-nowrap text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0">
                  <span className="hidden sm:inline">MCI Connect • </span>Customizable
                </Badge>
              </div>
            )}
          </div>

          {/* Action buttons row */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {isEditMode ? (
              <>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  size="sm"
                  className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 h-6 px-2 text-[10px]"
                >
                  <XIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                  <span className="hidden sm:inline">Cancel</span>
                </Button>
                <Button
                  onClick={handleSaveLayout}
                  size="sm"
                  className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md h-6 px-2 text-[10px]"
                  disabled={savePreferencesMutation.isPending}
                >
                  <Save className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                  {savePreferencesMutation.isPending ? 'Saving...' : <span className="hidden sm:inline">Save Layout</span>}
                  <span className="sm:hidden">Save</span>
                </Button>
              </>
            ) : (
              <>
                {/* I5 - Excel Export (Admin Only) */}
                {isAdmin && (
                  <Button
                    onClick={() => {
                      const data = jobs.map(j => ({
                        'Job #': j.job_number,
                        'Name': j.name,
                        'Customer': j.customer_name,
                        'Status': j.status,
                        'Contract': j.contract_amount || 0
                      }));
                      if (data && data.length > 0) {
                        exportToExcel(data, 'dashboard_jobs', 'Jobs');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="border-green-200 text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20 h-6 px-1.5 sm:px-2 text-[10px]"
                    disabled={jobs.length === 0}
                  >
                    <FileSpreadsheet className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                    <span className="hidden sm:inline">Excel</span>
                  </Button>
                )}
                {isAdmin && (
                  <Link to={createPageUrl('CodebaseExport')}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50/30 dark:hover:bg-green-900/10 h-6 px-1.5 sm:px-2 text-[10px]"
                    >
                      <Download className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                      <span className="hidden sm:inline">Export ZIP</span>
                    </Button>
                  </Link>
                )}
                <Button
                  onClick={() => setShowKudosDialog(true)}
                  size="sm"
                  variant="outline"
                  className="border-[#507DB4]/20 dark:border-[#507DB4]/30 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 h-6 px-1.5 sm:px-2 text-[10px]"
                >
                  <Award className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                  <span className="hidden sm:inline">Give Kudos</span>
                </Button>
                <Button
                  onClick={() => setShowWidgetLibrary(true)}
                  variant="outline"
                  size="sm"
                  className="border-[#507DB4]/20 dark:border-[#507DB4]/30 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 h-6 px-1.5 sm:px-2 text-[10px]"
                >
                  <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                  <span className="hidden sm:inline">Add Widget</span>
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => setIsEditMode(true)}
                    size="sm"
                    variant="outline"
                    className="border-[#507DB4]/20 dark:border-[#507DB4]/30 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 h-6 px-1.5 sm:px-2 text-[10px]"
                  >
                    <SettingsIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 sm:mr-0.5" />
                    <span className="hidden sm:inline">Customize</span>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Field Work Indicator - Non-Intrusive */}
        <FieldWorkIndicator />

        {/* Quick Stats Widgets */}
        <div className="mb-2 sm:mb-3 md:mb-4">
          <QuickStatsWidgets user={user} />
        </div>

        {/* AR Widget - Admin Only */}
        {isAdmin && (
          <div className="mb-2 sm:mb-3 md:mb-4">
            <ARWidget />
          </div>
        )}



        {/* I1 - Actual vs Estimated Chart (Admin Only) */}
        {isAdmin && jobs.length > 0 && quotes.length > 0 && (
          <FadeInUp delay={0.1}>
            <div className="mb-2 sm:mb-3 md:mb-4">
              <ActualVsEstimatedChart jobs={jobs} quotes={quotes} />
            </div>
          </FadeInUp>
        )}

        {/* AI Predictions (Admin Only) */}
        {isAdmin && (
          <FadeInUp delay={0.2}>
            <div className="mb-2 sm:mb-3 md:mb-4">
              <AIPredictor 
                jobs={Array.isArray(jobs) ? jobs : []} 
                timeEntries={allTimeEntries} 
                invoices={[]} 
              />
            </div>
          </FadeInUp>
        )}

        {/* Performance Monitor (Admin Only - Dev) */}
        {isAdmin && import.meta.env?.DEV && (
          <FadeInUp delay={0.3}>
            <div className="mb-2 sm:mb-3 md:mb-4">
              <PerformanceMonitor />
            </div>
          </FadeInUp>
        )}

        {/* Widgets Grid with Stagger Animation */}
         <StaggerContainer staggerDelay={0.05}>
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="dashboard" direction="horizontal">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`grid gap-2 sm:gap-3 ${!isAdmin ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'}`}
                >
                  <AnimatePresence>
                    {widgets.filter(w => w.visible).sort((a, b) => a.position - b.position).map((widget, index) => (
                      <Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!isEditMode}>
                        {(provided) => (
                          <StaggerItem>
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                            >
                              <DashboardWidget
                                widget={widget}
                                isEditing={isEditMode}
                                onRemove={handleRemoveWidget}
                                onResize={handleResizeWidget}
                                dragHandleProps={provided.dragHandleProps}
                              >
                                {renderWidget(widget)}
                              </DashboardWidget>
                            </div>
                          </StaggerItem>
                        )}
                      </Draggable>
                    ))}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </StaggerContainer>

        {/* Actions for Employees */}
        {!isAdmin && (
          <div className="text-center mt-3 sm:mt-4">
            <Button
              onClick={() => setShowTimeOffDialog(true)}
              className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md w-full sm:w-auto h-6 text-[10px] px-3"
            >
              <CalendarIcon className="w-3 h-3 mr-1" />
              {t('requestTimeOff')}
            </Button>
          </div>
        )}

        <TimeOffRequestDialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog} />
        <PhotoAvatarManager
          open={showPhotoManager}
          onOpenChange={setShowPhotoManager}
        />
        <WidgetLibrary
          open={showWidgetLibrary}
          onOpenChange={setShowWidgetLibrary}
          onAddWidget={handleAddWidget}
          currentWidgets={widgets}
          userRole={isAdmin ? 'admin' : 'employee'}
        />
        <GiveKudosDialog open={showKudosDialog} onOpenChange={setShowKudosDialog} />
      </div>
      </div>
    </div>
    </SectionErrorBoundary>
  );
}