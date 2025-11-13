
import React, { useState, useEffect } from "react";
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
  Brain, // Added Brain icon
  Sparkles, // Added Sparkles icon
  Shield, // Added Shield icon
  Zap // Added Zap icon
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, isSameDay, addDays, differenceInDays } from "date-fns";
import LiveClock from "../components/dashboard/LiveClock";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import TimeOffRequestDialog from "../components/dashboard/TimeOffRequestDialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { getDisplayName } from "@/components/utils/nameHelpers";
import { Progress } from "@/components/ui/progress";
import CustomAvatar from "../components/avatar/CustomAvatar";
import AvatarCreator from "../components/avatar/AvatarCreator";
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

// Default layouts with NEW widgets
const DEFAULT_ADMIN_LAYOUT = [
  { id: 'active-employees-1', type: 'active-employees', title: 'Active Employees', icon: Users, size: 'small', position: 0, visible: true },
  { id: 'active-jobs-1', type: 'active-jobs', title: 'Active Jobs', icon: Briefcase, size: 'small', position: 1, visible: true },
  { id: 'pending-expenses-1', type: 'pending-expenses', title: 'Pending Expenses', icon: Receipt, size: 'small', position: 2, visible: true },
  { id: 'total-hours-1', type: 'total-hours', title: 'Total Hours', icon: Clock, size: 'small', position: 3, visible: true },
  { id: 'ai-insights-1', type: 'ai-insights', title: 'AI Insights', icon: Brain, size: 'medium', position: 4, visible: true },
  { id: 'budget-alerts-1', type: 'budget-alerts', title: 'Budget Alerts', icon: AlertTriangle, size: 'medium', position: 5, visible: true },
];

const DEFAULT_EMPLOYEE_LAYOUT = [
  { id: 'work-hours-1', type: 'work-hours', title: 'Work Hours', icon: Clock, size: 'small', position: 0, visible: true },
  { id: 'driving-hours-1', type: 'driving-hours', title: 'Driving Hours', icon: MapPin, size: 'small', position: 1, visible: true },
  { id: 'weekly-pay-1', type: 'weekly-pay', title: 'Weekly Pay', icon: DollarSign, size: 'small', position: 2, visible: true },
  { id: 'my-expenses-1', type: 'my-expenses', title: 'My Expenses', icon: Receipt, size: 'small', position: 3, visible: true },
  { id: 'my-score-1', type: 'my-score', title: 'My Score', icon: Award, size: 'small', position: 4, visible: true },
  { id: 'my-projects-1', type: 'my-projects', title: 'My Projects', icon: Briefcase, size: 'medium', position: 5, visible: true },
];

export default function Dashboard() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showWidgetLibrary, setShowWidgetLibrary] = useState(false);
  const [widgets, setWidgets] = useState([]);
  const [showKudosDialog, setShowKudosDialog] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    staleTime: Infinity,
  });

  const isAdmin = user?.role === 'admin';

  // Load dashboard preferences
  const { data: dashboardPrefs, isLoading: prefsLoading } = useQuery({
    queryKey: ['dashboardPreferences', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const prefs = await base44.entities.DashboardPreferences.filter({ user_email: user.email });
      return prefs[0] || null;
    },
    enabled: !!user?.email,
  });

  // Initialize widgets from preferences or defaults
  useEffect(() => {
    if (dashboardPrefs?.layout) {
      // Ensure all default widgets are present if they don't exist in saved layout
      const defaultLayout = isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT;
      const mergedLayout = defaultLayout.map(defaultWidget => {
        const existingWidget = dashboardPrefs.layout.find(lw => lw.id === defaultWidget.id);
        return existingWidget || { ...defaultWidget, position: -1 }; // Mark new widgets for later positioning
      });
      const existingWidgetsOnly = dashboardPrefs.layout.filter(lw => !defaultLayout.some(dw => dw.id === lw.id));
      
      const finalLayout = [...mergedLayout, ...existingWidgetsOnly]
        .filter(w => w.visible !== false) // Filter out explicitly hidden widgets
        .map((w, index) => ({ ...w, position: w.position !== -1 ? w.position : index })) // Assign position to new widgets
        .sort((a,b) => a.position - b.position);

      setWidgets(finalLayout);
    } else if (user) {
      setWidgets(isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT);
    }
  }, [dashboardPrefs, user, isAdmin]);

  // Save dashboard preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (layout) => {
      if (dashboardPrefs) {
        await base44.entities.DashboardPreferences.update(dashboardPrefs.id, { layout });
      } else {
        await base44.entities.DashboardPreferences.create({
          user_email: user.email,
          layout
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardPreferences'] });
    }
  });

  // DATA QUERIES
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['myTimeEntries', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.TimeEntry.filter({
        employee_email: user.email,
        status: 'approved'
      }, '-date', 100);
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 60000,
    initialData: [],
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['myExpenses', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Expense.filter({
        employee_email: user.email
      }, '-date', 50);
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 60000,
    initialData: [],
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['myDrivingLogs', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.DrivingLog.filter({
        employee_email: user.email,
        status: 'approved'
      }, '-date', 50);
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 60000,
    initialData: [],
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }, 'name'),
    enabled: !!user,
    staleTime: 120000,
    initialData: [],
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['myAssignments', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

      const allAssignments = await base44.entities.JobAssignment.filter({
        employee_email: user.email
      }, '-date');

      return allAssignments.filter(a => {
        const assignDate = new Date(a.date);
        return assignDate >= weekStart && assignDate <= weekEnd;
      });
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 120000,
    initialData: [],
  });

  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    enabled: isAdmin,
    staleTime: 300000,
    initialData: [],
  });

  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 200),
    enabled: isAdmin,
    staleTime: 120000,
    initialData: [],
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ['allExpenses'],
    queryFn: () => base44.entities.Expense.list('-date', 200),
    enabled: isAdmin,
    staleTime: 120000,
    initialData: [],
  });

  const { data: recognitions = [] } = useQuery({
    queryKey: ['recentRecognitions'],
    queryFn: () => base44.entities.Recognition.list('-date', 5),
    enabled: !!user,
    staleTime: 300000,
    initialData: [],
  });

  const { data: pendingTimeEntries = [] } = useQuery({
    queryKey: ['pendingTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending' }, '-date', 100),
    enabled: isAdmin,
    staleTime: 60000,
    initialData: [],
  });

  const { data: certifications = [] } = useQuery({
    queryKey: ['certifications', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      return base44.entities.Certification.filter({
        employee_email: user.email,
      }, '-expiration_date');
    },
    enabled: !!user?.email && !isAdmin,
    staleTime: 300000,
    initialData: [],
  });

  // CALCULATIONS
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

  if (!isAdmin) {
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

  const activeEmployees = allEmployees.filter(e =>
    e.employment_status === 'active' ||
    e.employment_status === 'pending_registration' ||
    !e.employment_status
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

  // NEW: My Scorecard calculation for employees
  const myScorecard = React.useMemo(() => {
    if (isAdmin || !user) return null;

    const myRecognitions = recognitions.filter(r => r.employee_email === user.email);
    const myCertifications = certifications.filter(c => c.employee_email === user.email);

    const totalHours = timeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const approvedHours = timeEntries.filter(t => t.status === 'approved').reduce((sum, t) => sum + (t.hours_worked || 0), 0);
    const totalPoints = myRecognitions.reduce((sum, r) => sum + (r.points || 0), 0);
    const activeCerts = myCertifications.filter(c => c.status === 'active').length;
    const attendanceRate = totalHours > 0 ? ((approvedHours / totalHours) * 100) : 100;

    const overallScore = (attendanceRate * 0.3) + (Math.min(totalPoints / 10, 100) * 0.4) + (activeCerts * 10 * 0.3);

    return { overallScore, totalPoints, activeCerts, attendanceRate };
  }, [user, timeEntries, recognitions, certifications, isAdmin]);

  // NEW: My projects for employees
  const myProjects = React.useMemo(() => {
    if (isAdmin || !user) return [];

    const myTimeEntries = timeEntries.filter(t => t.employee_email === user.email);
    const myJobIds = [...new Set(myTimeEntries.map(t => t.job_id))];

    return jobs
      .filter(j => myJobIds.includes(j.id) && j.status !== 'archived')
      .slice(0, 3)
      .map(job => {
        const jobTimeEntries = timeEntries.filter(t => t.job_id === job.id);
        const totalJobHours = jobTimeEntries.reduce((sum, t) => sum + (t.hours_worked || 0), 0);
        const estimatedHours = job.estimated_hours || 100;
        const completionPercentage = estimatedHours > 0 ? (totalJobHours / estimatedHours * 100) : 0;

        return { ...job, completionPercentage };
      });
  }, [user, jobs, timeEntries, isAdmin]);

  // NEW: Budget alerts for admin
  const budgetAlerts = React.useMemo(() => {
    if (!isAdmin) return [];

    return jobs.filter(j => j.status === 'active').map(job => {
      const jobExpenses = allExpenses.filter(e => e.job_id === job.id);
      const jobTimeEntries = allTimeEntries.filter(t => t.job_id === job.id);
      
      const actualExpenses = jobExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      const laborCost = jobTimeEntries.reduce((sum, t) => {
        const emp = allEmployees.find(e => e.email === t.employee_email);
        const rate = emp?.hourly_rate || 25;
        return sum + ((t.hours_worked || 0) * rate);
      }, 0);
      
      const totalActual = actualExpenses + laborCost;
      const budget = job.contract_amount || 0;
      const variance = budget - totalActual;
      
      return { job, variance, budget, totalActual };
    })
    .filter(j => j.variance < 0)
    .sort((a, b) => a.variance - b.variance)
    .slice(0, 3);
  }, [jobs, allExpenses, allTimeEntries, allEmployees, isAdmin]);

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
    const newWidgetWithPosition = { ...widget, position: widgets.length };
    setWidgets([...widgets, newWidgetWithPosition]);
    setShowWidgetLibrary(false);
  };

  const handleSaveLayout = () => {
    savePreferencesMutation.mutate(widgets);
    setIsEditMode(false);
  };

  const handleCancelEdit = () => {
    if (dashboardPrefs?.layout) {
      const defaultLayout = isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT;
      const mergedLayout = defaultLayout.map(defaultWidget => {
        const existingWidget = dashboardPrefs.layout.find(lw => lw.id === defaultWidget.id);
        return existingWidget || { ...defaultWidget, position: -1 }; // Mark new widgets for later positioning
      });
      const existingWidgetsOnly = dashboardPrefs.layout.filter(lw => !defaultLayout.some(dw => dw.id === lw.id));
      
      const finalLayout = [...mergedLayout, ...existingWidgetsOnly]
        .filter(w => w.visible !== false)
        .map((w, index) => ({ ...w, position: w.position !== -1 ? w.position : index }))
        .sort((a,b) => a.position - b.position);

      setWidgets(finalLayout);
    } else {
      setWidgets(isAdmin ? DEFAULT_ADMIN_LAYOUT : DEFAULT_EMPLOYEE_LAYOUT);
    }
    setIsEditMode(false);
  };

  // WIDGET RENDERERS
  const renderWidget = (widget) => {
    switch (widget.type) {
      case 'active-employees':
        return <StatsWidget value={activeEmployees.length} label={t('employees')} icon={Users} color="blue" />;
      
      case 'active-jobs':
        return <StatsWidget value={jobs.length} label={t('jobs')} icon={Briefcase} color="green" />;
      
      case 'pending-expenses':
        return <StatsWidget value={pendingExpenseCount} label={t('pendingExpenses')} icon={Receipt} color="amber" badge={pendingExpenseCount > 0 ? pendingExpenseCount : null} />;
      
      case 'total-hours':
        return <StatsWidget value={`${totalWorkedHours.toFixed(1)}h`} label={t('totalWorkedHours')} icon={Clock} color="purple" />;
      
      case 'work-hours':
        return (
          <div>
            <StatsWidget value={`${currentWeekHours.toFixed(1)}h`} label={t('workHours')} icon={Clock} badge="Esta Semana" color="blue" />
            <Progress value={Math.min(weekProgress, 100)} className="h-2 mt-3" />
            <p className="text-xs text-slate-500 mt-2">{yearHours.toFixed(1)}h {t('yearToDate')}</p>
          </div>
        );
      
      case 'driving-hours':
        return (
          <div>
            <StatsWidget value={`${drivingHoursThisWeek.toFixed(1)}h`} label={t('drivingHours')} icon={MapPin} badge="Esta Semana" color="green" />
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <DollarSign className="w-3 h-3" />
              <span>${drivingPayThisWeek.toFixed(2)} {language === 'es' ? 'ganados' : 'earned'}</span>
            </div>
          </div>
        );
      
      case 'weekly-pay':
        return (
          <div>
            <StatsWidget value={`$${(currentWeekPay + drivingPayThisWeek).toFixed(2)}`} label={t('weeklyPay')} icon={DollarSign} badge="Esta Semana" color="amber" />
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
              <span>{language === 'es' ? 'Trabajo' : 'Work'}: ${currentWeekPay.toFixed(2)}</span>
              <span>•</span>
              <span>{language === 'es' ? 'Manejo' : 'Driving'}: ${drivingPayThisWeek.toFixed(2)}</span>
            </div>
          </div>
        );
      
      case 'my-expenses':
        return <StatsWidget value={pendingExpenseCount} label={t('pendingExpenses')} icon={Receipt} color="purple" badge={pendingExpenseCount > 0 ? pendingExpenseCount : null} />;
      
      case 'my-score':
        if (!myScorecard) return null;
        return (
          <Link to={createPageUrl('MiScorecard')}>
            <div className="cursor-pointer hover:scale-105 transition-transform">
              <StatsWidget value={myScorecard.overallScore.toFixed(0)} label={language === 'es' ? 'Mi Score' : 'My Score'} icon={Award} color="purple" badge="✨" />
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <span>{myScorecard.totalPoints} {language === 'es' ? 'puntos' : 'points'}</span>
                <span>•</span>
                <span>{myScorecard.activeCerts} {language === 'es' ? 'certificaciones' : 'certs'}</span>
              </div>
            </div>
          </Link>
        );

      case 'my-projects':
        return (
          <div className="space-y-2">
            <Link to={createPageUrl('MisProyectos')}>
              <div className="flex items-center justify-between mb-3 cursor-pointer hover:text-blue-400 transition-colors">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  {language === 'es' ? 'Mis Proyectos' : 'My Projects'}
                </h4>
                <Badge className="bg-blue-500 text-white">✨</Badge>
              </div>
            </Link>
            {myProjects.length === 0 ? (
              <p className="text-sm text-slate-600">{language === 'es' ? 'No hay proyectos activos' : 'No active projects'}</p>
            ) : (
              myProjects.map(proj => (
                <div key={proj.id} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <p className="text-sm font-medium text-slate-900">{proj.name}</p>
                  <Progress value={Math.min(proj.completionPercentage, 100)} className="h-1 mt-1" />
                  <p className="text-xs text-slate-600 mt-1">{Math.min(proj.completionPercentage, 100).toFixed(0)}% {language === 'es' ? 'completo' : 'complete'}</p>
                </div>
              ))
            )}
          </div>
        );

      case 'ai-insights':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-5 h-5 text-cyan-600" />
              <h4 className="font-semibold text-slate-900">AI Insights</h4>
            </div>
            <Link to={createPageUrl('AIAutomationDashboard')}>
              <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-200 hover:border-cyan-400 transition-all cursor-pointer">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  <p className="text-sm font-semibold text-slate-900">{language === 'es' ? 'Ver Dashboard Completo' : 'View Full Dashboard'}</p>
                </div>
                <p className="text-xs text-slate-600">{language === 'es' ? 'Predicciones, anomalías y automatización' : 'Predictions, anomalies, and automation'}</p>
              </div>
            </Link>
          </div>
        );

      case 'budget-alerts':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h4 className="font-semibold text-slate-900">{language === 'es' ? 'Alertas de Budget' : 'Budget Alerts'}</h4>
            </div>
            {budgetAlerts.length === 0 ? (
              <p className="text-sm text-slate-600">{language === 'es' ? 'Todo en orden ✓' : 'All good ✓'}</p>
            ) : (
              budgetAlerts.map(alert => (
                <div key={alert.job.id} className="p-2 bg-red-50 rounded border border-red-200">
                  <p className="text-sm font-medium text-red-900">{alert.job.name}</p>
                  <p className="text-xs text-red-700 font-semibold">{alert.variance >= 0 ? '+' : ''}${Math.abs(alert.variance).toFixed(0)} {language === 'es' ? 'sobre budget' : 'over budget'}</p>
                </div>
              ))
            )}
            <Link to={createPageUrl('FinancialDashboard')}>
              <Button size="sm" variant="outline" className="w-full mt-2">
                {language === 'es' ? 'Ver Detalles' : 'View Details'}
              </Button>
            </Link>
          </div>
        );
      
      case 'pending-timesheets':
        return (
          <Alert className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-bold">
              {pendingTimesheetsCount} {language === 'es' ? 'horas pendientes' : 'pending hours'}
            </AlertTitle>
            <AlertDescription>
              <Link to={createPageUrl('Horarios')}>
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white mt-2">
                  <Clock className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Revisar' : 'Review'}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        );
      
      case 'birthdays-today':
        if (todaysBirthdays.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No birthdays today</p>;
        return (
          <ListWidget
            items={todaysBirthdays}
            renderItem={(emp) => (
              <Link to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-pink-50 to-rose-50 rounded-xl border border-pink-200 hover:border-pink-400 hover:shadow-md transition-all cursor-pointer">
                  <div className="text-4xl">🎂</div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{getDisplayName(emp)}</p>
                    <p className="text-sm text-slate-600">{emp.position}</p>
                  </div>
                  <Badge className="bg-pink-500 text-white">¡Felicidades!</Badge>
                </div>
              </Link>
            )}
          />
        );
      
      case 'recent-recognitions':
        if (recentAchievements.length === 0) return <p className="text-slate-500 text-sm text-center py-8">No recent recognitions</p>;
        return (
          <ListWidget
            items={recentAchievements}
            renderItem={(rec) => (
              <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-yellow-50 rounded-xl border border-amber-200 hover:shadow-md transition-all">
                <div className="text-3xl">🏆</div>
                <div className="flex-1">
                  <p className="font-bold text-slate-900 text-sm">{rec.title}</p>
                  <p className="text-xs text-slate-600">{rec.employee_name}</p>
                </div>
                <Badge className="bg-amber-500 text-white">+{rec.points} pts</Badge>
              </div>
            )}
          />
        );
      
      case 'my-assignments':
        return (
          <ListWidget
            items={assignments}
            emptyMessage="No tienes trabajos asignados esta semana"
            renderItem={(assignment) => {
              const job = jobs.find(j => j.id === assignment.job_id);
              return (
                <Link to={createPageUrl(`JobDetails?id=${assignment.job_id}`)}>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-slate-900">{assignment.job_name}</h3>
                      {job && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                          {job.status}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600">
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
              <Trophy className="w-5 h-5 text-[#3B9FF3]" />
              <h3 className="font-bold text-white">Top Performers</h3>
            </div>
            <TopRecognitionsWidget limit={5} />
          </div>
        );

      default:
        return <p className="text-slate-500 text-sm">Widget not implemented</p>;
    }
  };

  const getProfileImage = () => {
    if (!user) return null;
    if (user.preferred_profile_image === 'avatar' && user.avatar_image_url) {
      return user.avatar_image_url;
    }
    if (user.profile_photo_url) {
      return user.profile_photo_url;
    }
    return null;
  };

  const profileImage = getProfileImage();

  if (userLoading || prefsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#3B9FF3] mx-auto mb-4" />
          <p className="text-white font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowAvatarCreator(true)}
              className="group relative hover:scale-105 transition-transform"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={user?.full_name}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-500/50 hover:ring-blue-400 transition-all shadow-xl"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B9FF3] to-blue-500 flex items-center justify-center ring-4 ring-blue-500/50 hover:ring-blue-400 transition-all shadow-xl">
                  <span className="text-white font-bold text-3xl">
                    {user?.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                <User className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </button>

            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                {user ? `${t('hello')}, ${getDisplayName(user)}! 👋` : t('hello')}
              </h1>
              <div className="flex items-center gap-2">
                <p className="text-slate-300 text-lg">
                  {isAdmin ? '¡Bienvenido al panel de administración!' : '¡Qué tengas un excelente día!'}
                </p>
                <Badge className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-md">
                  MCI Connect • Customizable Dashboard
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditMode ? (
              <>
                <Button
                  onClick={handleCancelEdit}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <XIcon className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLayout}
                  className="bg-green-600 hover:bg-green-700 text-white shadow-lg"
                  disabled={savePreferencesMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  {savePreferencesMutation.isPending ? 'Saving...' : 'Save Layout'}
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={() => setShowKudosDialog(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg"
                >
                  <Award className="w-4 h-4 mr-2" />
                  Give Kudos
                </Button>
                <Button
                  onClick={() => setShowWidgetLibrary(true)}
                  variant="outline"
                  className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10 hover:text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Widget
                </Button>
                <Button
                  onClick={() => setIsEditMode(true)}
                  className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white shadow-lg shadow-blue-500/30"
                >
                  <SettingsIcon className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Live Clock for Employees */}
        {!isAdmin && (
          <div className="mb-8">
            <LiveClock />
          </div>
        )}

        {/* Widgets Grid */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="dashboard" direction="horizontal">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
              >
                <AnimatePresence>
                  {widgets.filter(w => w.visible).sort((a, b) => a.position - b.position).map((widget, index) => (
                    <Draggable key={widget.id} draggableId={widget.id} index={index} isDragDisabled={!isEditMode}>
                      {(provided) => (
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
                      )}
                    </Draggable>
                  ))}
                </AnimatePresence>
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* Actions for Employees */}
        {!isAdmin && (
          <div className="text-center mt-8">
            <Button
              onClick={() => setShowTimeOffDialog(true)}
              className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              {t('requestTimeOff')}
            </Button>
          </div>
        )}

        <TimeOffRequestDialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog} />
        <AvatarCreator
          open={showAvatarCreator}
          onOpenChange={setShowAvatarCreator}
          currentConfig={user?.avatar_config}
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
  );
}
