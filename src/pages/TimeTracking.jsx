import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Users, TrendingUp, DollarSign, BarChart3, Download, Filter } from 'lucide-react';
import PageHeader from '../components/shared/PageHeader';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { useToast } from '@/components/ui/toast';
import TimeLogDialog from '../components/time-tracking/TimeLogDialog';
import TeamTimeView from '../components/time-tracking/TeamTimeView';
import PersonalTimeView from '../components/time-tracking/PersonalTimeView';

export default function TimeTracking() {
  const { language, t } = useLanguage();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('personal');
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [dateRange, setDateRange] = useState('week');
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedJob, setSelectedJob] = useState('all');

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date'),
    staleTime: 300000,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['activeJobs'],
    queryFn: () => base44.entities.Job.filter({ status: 'active' }),
    staleTime: 600000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ['activeEmployees'],
    queryFn: async () => {
      const users = await base44.entities.User.list();
      return users.filter(u => u.employment_status === 'active');
    },
    enabled: user?.role === 'admin',
    staleTime: 600000,
  });

  // Filter time entries based on selections
  const filteredEntries = useMemo(() => {
    let filtered = timeEntries;

    // Date range filter
    const now = new Date();
    let start, end;
    if (dateRange === 'week') {
      start = startOfWeek(now);
      end = endOfWeek(now);
    } else if (dateRange === 'month') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    }

    if (start && end) {
      filtered = filtered.filter(entry => 
        isWithinInterval(new Date(entry.date), { start, end })
      );
    }

    // Employee filter
    if (user?.role === 'admin' && selectedEmployee !== 'all') {
      filtered = filtered.filter(e => e.employee_email === selectedEmployee);
    } else if (user?.role !== 'admin') {
      filtered = filtered.filter(e => e.employee_email === user?.email);
    }

    // Job filter
    if (selectedJob !== 'all') {
      filtered = filtered.filter(e => e.job_id === selectedJob);
    }

    return filtered;
  }, [timeEntries, dateRange, selectedEmployee, selectedJob, user]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalHours = filteredEntries.reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const normalHours = filteredEntries
      .filter(e => e.hour_type === 'normal')
      .reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    const overtimeHours = filteredEntries
      .filter(e => e.hour_type === 'overtime')
      .reduce((sum, e) => sum + (e.hours_worked || 0), 0);
    
    const uniqueEmployees = new Set(filteredEntries.map(e => e.employee_email)).size;
    const uniqueJobs = new Set(filteredEntries.map(e => e.job_id).filter(Boolean)).size;

    return {
      totalHours: totalHours.toFixed(1),
      normalHours: normalHours.toFixed(1),
      overtimeHours: overtimeHours.toFixed(1),
      uniqueEmployees,
      uniqueJobs,
      entries: filteredEntries.length
    };
  }, [filteredEntries]);

  const isAdmin = user?.role === 'admin';

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[#FAFAFA] dark:bg-[#181818]">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={language === 'es' ? 'Seguimiento de Tiempo' : 'Time Tracking'}
          description={language === 'es' 
            ? 'Registra y monitorea horas trabajadas en proyectos y tareas' 
            : 'Log and monitor hours worked on projects and tasks'}
          icon={Clock}
          actions={
            <Button 
              onClick={() => setShowLogDialog(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Registrar Tiempo' : 'Log Time'}
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">
                    {language === 'es' ? 'Total Horas' : 'Total Hours'}
                  </p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.totalHours}</p>
                </div>
                <Clock className="w-12 h-12 text-blue-600 dark:text-blue-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-1">
                    {language === 'es' ? 'Horas Normales' : 'Normal Hours'}
                  </p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">{stats.normalHours}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-green-600 dark:text-green-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-600 dark:text-amber-400 font-medium mb-1">
                    {language === 'es' ? 'Horas Extra' : 'Overtime Hours'}
                  </p>
                  <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">{stats.overtimeHours}</p>
                </div>
                <Calendar className="w-12 h-12 text-amber-600 dark:text-amber-400 opacity-50" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium mb-1">
                    {language === 'es' ? 'Trabajos Activos' : 'Active Jobs'}
                  </p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{stats.uniqueJobs}</p>
                </div>
                <BarChart3 className="w-12 h-12 text-purple-600 dark:text-purple-400 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6 bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <Filter className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-40 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="week">{language === 'es' ? 'Esta Semana' : 'This Week'}</SelectItem>
                  <SelectItem value="month">{language === 'es' ? 'Este Mes' : 'This Month'}</SelectItem>
                  <SelectItem value="all">{language === 'es' ? 'Todo' : 'All Time'}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedJob} onValueChange={setSelectedJob}>
                <SelectTrigger className="w-52 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#282828]">
                  <SelectItem value="all">{language === 'es' ? 'Todos los Trabajos' : 'All Jobs'}</SelectItem>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>{job.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {isAdmin && (
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger className="w-52 bg-white dark:bg-[#282828] border-slate-300 dark:border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#282828]">
                    <SelectItem value="all">{language === 'es' ? 'Todos los Empleados' : 'All Employees'}</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.email} value={emp.email}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white dark:bg-[#282828] border border-slate-200 dark:border-slate-700 p-1 mb-6">
            <TabsTrigger value="personal" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Mi Tiempo' : 'My Time'}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="team" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Users className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Equipo' : 'Team'}
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="personal">
            <PersonalTimeView 
              entries={filteredEntries.filter(e => e.employee_email === user?.email)} 
              jobs={jobs}
            />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="team">
              <TeamTimeView 
                entries={filteredEntries} 
                jobs={jobs}
                employees={employees}
              />
            </TabsContent>
          )}
        </Tabs>

        {showLogDialog && (
          <TimeLogDialog
            open={showLogDialog}
            onClose={() => setShowLogDialog(false)}
            jobs={jobs}
            user={user}
          />
        )}
      </div>
    </div>
  );
}