
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
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
  AlertTriangle
} from "lucide-react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, format, isSameDay } from "date-fns";
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

export default function Dashboard() {
  const { t, language } = useLanguage();
  const [showTimeOffDialog, setShowTimeOffDialog] = useState(false);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['currentUser'],
    staleTime: Infinity,
  });

  const isAdmin = user?.role === 'admin';

  // EMPLOYEE QUERIES - Only for non-admin users
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

  // ADMIN QUERIES - Consolidated and optimized
  const { data: allEmployees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => base44.entities.User.list('full_name'),
    enabled: isAdmin,
    staleTime: 300000,
    initialData: [],
  });

  const { data: allTimeEntries = [], isLoading: timeEntriesLoading } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'approved' }, '-date', 200),
    enabled: isAdmin,
    staleTime: 120000,
    initialData: [],
  });

  const { data: allExpenses = [], isLoading: expensesLoading } = useQuery({
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

  // NEW: Query for pending time entries (admin only)
  const { data: pendingTimeEntries = [] } = useQuery({
    queryKey: ['pendingTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.filter({ status: 'pending' }, '-date', 100),
    enabled: isAdmin,
    staleTime: 60000,
    initialData: [],
  });

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);
  const yearStart = startOfYear(today);

  const hourlyRate = parseFloat(user?.hourly_rate || 25);

  // EMPLOYEE CALCULATIONS
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

  // ADMIN CALCULATIONS - FIXED: Include pending_registration in active employees
  const activeEmployees = allEmployees.filter(e =>
    e.employment_status === 'active' ||
    e.employment_status === 'pending_registration' ||
    !e.employment_status
  );

  const pendingExpenseCount = isAdmin
    ? allExpenses.filter(e => e.status === 'pending').length
    : expenses.filter(e => e.status === 'pending').length;

  const totalWorkedHours = allTimeEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);

  const upcomingBirthdays = allEmployees.filter(emp => {
    if (!emp.dob) return false;
    const dob = new Date(emp.dob);
    const today = new Date();
    const birthdayThisYear = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
    const daysUntil = Math.ceil((birthdayThisYear - today) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 30;
  }).sort((a, b) => {
    const dobA = new Date(a.dob);
    const dobB = new Date(b.dob);
    return dobA.getDate() - dobB.getDate();
  }).slice(0, 3);

  const todaysBirthdays = allEmployees.filter(emp => {
    if (!emp.dob) return false;
    const dob = new Date(emp.dob);
    return isSameDay(new Date(today.getFullYear(), dob.getMonth(), dob.getDate()), today);
  });

  const recentAchievements = recognitions.slice(0, 3);
  const weekProgress = (currentWeekHours / 40) * 100;

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

  const pendingTimeEntriesCount = pendingTimeEntries.length;

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-[#3B9FF3] mx-auto mb-4" />
          <p className="text-slate-700 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        {/* NEW: Pending Timesheet Alert for Admins */}
        {isAdmin && pendingTimeEntriesCount > 0 && (
          <Alert className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-300 shadow-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-900 font-bold text-lg">
              {language === 'es' 
                ? `⚠️ Tienes ${pendingTimeEntriesCount} horas pendientes de revisión` 
                : `⚠️ You have ${pendingTimeEntriesCount} pending hours to review`}
            </AlertTitle>
            <AlertDescription className="flex items-center justify-between mt-2">
              <span className="text-amber-700">
                {language === 'es' 
                  ? 'Las horas de los empleados están esperando tu aprobación para procesar la nómina.' 
                  : 'Employee hours are waiting for your approval to process payroll.'}
              </span>
              <Link to={createPageUrl('Horarios')}>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white shadow-md ml-4">
                  <Clock className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Ir a Revisión' : 'Go to Review'}
                </Button>
              </Link>
            </AlertDescription>
          </Alert>
        )}

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
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-200 hover:ring-blue-400 transition-all"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#3B9FF3] to-blue-500 flex items-center justify-center ring-4 ring-blue-200 hover:ring-blue-400 transition-all shadow-lg">
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
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-[#3B9FF3] to-blue-600 bg-clip-text text-transparent mb-2">
                {user ? `${t('hello')}, ${getDisplayName(user)}! 👋` : t('hello')}
              </h1>
              <p className="text-slate-600 text-lg">
                {isAdmin ? '¡Bienvenido al panel de administración!' : '¡Qué tengas un excelente día!'}
              </p>
            </div>
          </div>
        </div>

        {!isAdmin && (
          <>
            <div className="mb-8">
              <LiveClock />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <Link to={createPageUrl("MisHoras")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">Esta Semana</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{currentWeekHours.toFixed(1)}h</div>
                    <p className="text-sm text-slate-600 mb-3">{t('workHours')}</p>
                    <Progress value={Math.min(weekProgress, 100)} className="h-2 mb-2" />
                    <p className="text-xs text-slate-500">{yearHours.toFixed(1)}h {t('yearToDate')}</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Manejo")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <MapPin className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-green-50 text-green-700 border-green-200">Esta Semana</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{drivingHoursThisWeek.toFixed(1)}h</div>
                    <p className="text-sm text-slate-600 mb-3">{t('drivingHours')}</p>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <DollarSign className="w-3 h-3" />
                      <span>${drivingPayThisWeek.toFixed(2)} ganados</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-md">
                      <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <Badge className="bg-amber-50 text-amber-700 border-amber-200">Esta Semana</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-900 mb-1">
                    ${(currentWeekPay + drivingPayThisWeek).toFixed(2)}
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{t('weeklyPay')}</p>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Trabajo: ${currentWeekPay.toFixed(2)}</span>
                    <span>•</span>
                    <span>Manejo: ${drivingPayThisWeek.toFixed(2)}</span>
                  </div>
                </CardContent>
              </Card>

              <Link to={createPageUrl("MisGastos")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Receipt className="w-6 h-6 text-white" />
                      </div>
                      {pendingExpenseCount > 0 && (
                        <Badge className="bg-red-500 text-white">{pendingExpenseCount}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{pendingExpenseCount}</div>
                    <p className="text-sm text-slate-600 mb-3">{t('pendingExpenses')}</p>
                    <p className="text-xs text-slate-500">Pendientes de aprobación</p>
                  </CardContent>
                </Card>
              </Link>
            </div>

            <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-8">
              <CardHeader className="border-b border-slate-200">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Briefcase className="w-5 h-5 text-[#3B9FF3]" />
                  {t('myJobsThisWeek')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {assignments.length > 0 ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    {assignments.map((assignment) => {
                      const job = jobs.find(j => j.id === assignment.job_id);
                      return (
                        <Link key={assignment.id} to={createPageUrl(`JobDetails?id=${assignment.job_id}`)}>
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
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500">No tienes trabajos asignados esta semana</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="text-center">
              <Button
                onClick={() => setShowTimeOffDialog(true)}
                className="bg-gradient-to-r from-[#3B9FF3] to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                {t('requestTimeOff')}
              </Button>
            </div>
          </>
        )}

        {isAdmin && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
              <Link to={createPageUrl("Empleados")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-blue-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-[#3B9FF3] to-blue-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-blue-50 text-blue-700 border-blue-200">Activos</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {employeesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                        <span className="text-sm text-slate-600">Cargando...</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-slate-900 mb-1">
                          {activeEmployees.length}
                        </div>
                        <p className="text-sm text-slate-600">{t('employees')}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Trabajos")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-green-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Briefcase className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-green-50 text-green-700 border-green-200">Activos</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-slate-900 mb-1">{jobs.length}</div>
                    <p className="text-sm text-slate-600">{t('jobs')}</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Gastos")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-amber-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Receipt className="w-6 h-6 text-white" />
                      </div>
                      {pendingExpenseCount > 0 && (
                        <Badge className="bg-red-500 text-white">{pendingExpenseCount}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {expensesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
                        <span className="text-sm text-slate-600">Cargando...</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-slate-900 mb-1">{pendingExpenseCount}</div>
                        <p className="text-sm text-slate-600">{t('pendingExpenses')}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Horarios")}>
                <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer group">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-md group-hover:scale-110 transition-transform">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <Badge className="bg-purple-50 text-purple-700 border-purple-200">Este Mes</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {timeEntriesLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-slate-600">Cargando...</span>
                      </div>
                    ) : (
                      <>
                        <div className="text-3xl font-bold text-slate-900 mb-1">
                          {totalWorkedHours.toFixed(1)}h
                        </div>
                        <p className="text-sm text-slate-600">{t('totalWorkedHours')}</p>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {todaysBirthdays.length > 0 && (
                <Card className="bg-gradient-to-br from-pink-50 to-rose-50 shadow-lg border-pink-200">
                  <CardHeader className="border-b border-pink-200">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Cake className="w-5 h-5 text-pink-500" />
                      🎉 {t('birthdayToday')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {todaysBirthdays.map(emp => (
                        <Link key={emp.id} to={createPageUrl(`EmployeeProfile?id=${emp.id}`)}>
                          <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-pink-300 hover:border-pink-400 hover:shadow-md transition-all cursor-pointer">
                            <div className="text-4xl">🎂</div>
                            <div className="flex-1">
                              <p className="font-bold text-slate-900">{getDisplayName(emp)}</p>
                              <p className="text-sm text-slate-600">{emp.position}</p>
                            </div>
                            <Badge className="bg-pink-500 text-white">¡Felicidades!</Badge>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {recentAchievements.length > 0 && (
                <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg border-amber-200">
                  <CardHeader className="border-b border-amber-200">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <Award className="w-5 h-5 text-amber-500" />
                      🏆 {t('recognitions')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {recentAchievements.map(rec => (
                        <div key={rec.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border border-amber-300 hover:shadow-md transition-all">
                          <div className="text-3xl">🏆</div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 text-sm">{rec.title}</p>
                            <p className="text-xs text-slate-600">{rec.employee_name}</p>
                          </div>
                          <Badge className="bg-amber-500 text-white">
                            +{rec.points} pts
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}

        <TimeOffRequestDialog open={showTimeOffDialog} onOpenChange={setShowTimeOffDialog} />
        <AvatarCreator
          open={showAvatarCreator}
          onOpenChange={setShowAvatarCreator}
          currentConfig={user?.avatar_config}
        />
      </div>
    </div>
  );
}
