import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Briefcase, CalendarClock, X, Filter, TrendingUp, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, startOfMonth, endOfMonth, addMonths, subMonths, addDays, isSameDay, eachDayOfInterval } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PageHeader from "../components/shared/PageHeader";
import DayView from "../components/calendario/DayView";
import WeekView from "../components/calendario/WeekView";
import MonthView from "../components/calendario/MonthView";
import AssignmentDialog from "../components/calendario/AssignmentDialog";
import { useLanguage } from "@/components/i18n/LanguageContext";
import { createPageUrl } from "@/utils";

export default function Calendario() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [showDialog, setShowDialog] = useState(false);
  const [showEventTypeSelector, setShowEventTypeSelector] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedEventType, setSelectedEventType] = useState(null);
  const [editingAssignment, setEditingAssignment] = useState(null);

  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [jobFilter, setJobFilter] = useState('all');

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: assignments, isLoading } = useQuery({
    queryKey: ['assignments'],
    queryFn: () => base44.entities.JobAssignment.list('-date'),
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

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowDialog(false);
      setSelectedDate(null);
      setEditingAssignment(null);
      setSelectedEventType(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobAssignment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowDialog(false);
      setSelectedDate(null);
      setEditingAssignment(null);
      setSelectedEventType(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobAssignment.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      setShowDialog(false);
      setEditingAssignment(null);
      setSelectedEventType(null);
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

  const handleDateClick = (date) => {
    setSelectedDate(date);
    setEditingAssignment(null);
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

  const handleAssignmentClick = (assignment) => {
    setEditingAssignment(assignment);
    setSelectedDate(null);
    setSelectedEventType(assignment.event_type || null);
    setShowDialog(true);
  };

  const handleSubmit = (data) => {
    if (editingAssignment) {
      updateMutation.mutate({ id: editingAssignment.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm(t('confirmDeleteAssignment'))) {
      deleteMutation.mutate(id);
    }
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

  const filteredAssignments = assignments.filter(assignment => {
    if (eventTypeFilter !== 'all' && assignment.event_type !== eventTypeFilter) {
      return false;
    }
    if (employeeFilter !== 'all' && assignment.employee_email !== employeeFilter) {
      return false;
    }
    if (jobFilter !== 'all' && assignment.job_id !== jobFilter) {
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

    const periodAssignments = filteredAssignments.filter(a => {
      if (!a.date) return false;
      const assignmentDate = new Date(a.date);
      return assignmentDate >= start && assignmentDate <= end;
    });

    const totalEvents = periodAssignments.length;
    const jobMilestones = periodAssignments.filter(a => a.event_type === 'job_milestone').length;
    const appointments = periodAssignments.filter(a => a.event_type === 'appointment').length;
    const timeOffs = periodAssignments.filter(a => a.event_type === 'time_off').length;

    // Calculate estimated hours based on time ranges
    const totalEstimatedHours = periodAssignments.reduce((sum, a) => {
      if (!a.start_time || !a.end_time) return sum;
      const [startH, startM] = a.start_time.split(':').map(Number);
      const [endH, endM] = a.end_time.split(':').map(Number);
      const hours = (endH * 60 + endM - startH * 60 - startM) / 60;
      return sum + (hours > 0 ? hours : 0);
    }, 0);

    return { totalEvents, jobMilestones, appointments, timeOffs, totalEstimatedHours };
  };

  const workload = calculateWorkload();

  const isAdmin = user?.role === 'admin';
  const uniqueEmployees = [...new Set(assignments.map(a => a.employee_email).filter(Boolean))];
  const uniqueJobs = [...new Set(assignments.map(a => a.job_id).filter(Boolean))];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('calendar')}
          description={language === 'es' 
            ? 'Visión General de Citas, Reuniones y Hitos de Proyectos' 
            : 'Project Milestones, Appointments, and Meetings'}
          icon={CalendarIcon}
        />

        {/* Workload Summary Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-[#3B9FF3] to-blue-600 shadow-lg border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-50">
                    {language === 'es' ? 'Total Eventos' : 'Total Events'}
                  </p>
                  <p className="text-3xl font-bold text-white mt-1">{workload.totalEvents}</p>
                </div>
                <CalendarIcon className="w-8 h-8 text-white/60" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {language === 'es' ? 'Hitos de Trabajo' : 'Job Milestones'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{workload.jobMilestones}</p>
                </div>
                <Briefcase className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {language === 'es' ? 'Citas' : 'Appointments'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{workload.appointments}</p>
                </div>
                <CalendarClock className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    {language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-1">{workload.totalEstimatedHours.toFixed(1)}h</p>
                </div>
                <Clock className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Tipo de Evento' : 'Event Type'}
                </Label>
                <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all">
                      {language === 'es' ? 'Todos los Tipos' : 'All Types'}
                    </SelectItem>
                    <SelectItem value="appointment">
                      {language === 'es' ? 'Citas/Reuniones' : 'Appointments/Meetings'}
                    </SelectItem>
                    <SelectItem value="job_milestone">
                      {language === 'es' ? 'Hitos de Trabajo' : 'Job Milestones'}
                    </SelectItem>
                    <SelectItem value="time_off">
                      {language === 'es' ? 'Ausencias' : 'Time-Off'}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Empleado' : 'Employee'}
                </Label>
                <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
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
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Trabajo' : 'Job'}
                </Label>
                <Select value={jobFilter} onValueChange={setJobFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
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
                <Label className="text-slate-700 text-sm font-medium opacity-0">Clear</Label>
                <Button
                  variant="outline"
                  className="w-full bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
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
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Filter className="w-4 h-4" />
                <span>
                  {language === 'es' ? 'Mostrando' : 'Showing'} {filteredAssignments.length} {language === 'es' ? 'de' : 'of'} {assignments.length} {language === 'es' ? 'eventos' : 'events'}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevious} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleToday} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
              {t('today')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext} className="bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
              <ChevronRight className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-bold text-slate-900 ml-4">{getDateRange()}</h2>
          </div>

          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-slate-100 border-slate-200">
              <TabsTrigger value="day" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                {language === 'es' ? 'Día' : 'Day'}
              </TabsTrigger>
              <TabsTrigger value="week" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                {language === 'es' ? 'Semana' : 'Week'}
              </TabsTrigger>
              <TabsTrigger value="month" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                {language === 'es' ? 'Mes' : 'Month'}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Tabs value={view} className="w-full">
          <TabsContent value="day">
            <DayView
              currentDate={currentDate}
              assignments={filteredAssignments}
              onDateClick={handleDateClick}
              onAssignmentClick={handleAssignmentClick}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="week">
            <WeekView
              currentDate={currentDate}
              assignments={filteredAssignments}
              onDateClick={handleDateClick}
              onAssignmentClick={handleAssignmentClick}
              isAdmin={isAdmin}
            />
          </TabsContent>
          <TabsContent value="month">
            <MonthView
              currentDate={currentDate}
              assignments={filteredAssignments}
              onDateClick={handleDateClick}
              onAssignmentClick={handleAssignmentClick}
              isAdmin={isAdmin}
            />
          </TabsContent>
        </Tabs>

        <Dialog open={showEventTypeSelector} onOpenChange={setShowEventTypeSelector}>
          <DialogContent className="max-w-md bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-slate-900">
                {language === 'es' ? 'Seleccionar Tipo de Evento' : 'Select Event Type'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4">
              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 bg-white border-slate-200 hover:bg-blue-50 hover:border-[#3B9FF3]"
                onClick={() => handleEventTypeSelected('appointment')}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarIcon className="w-5 h-5 text-[#3B9FF3]" />
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
                className="w-full justify-start h-auto p-4 bg-white border-slate-200 hover:bg-purple-50 hover:border-purple-400"
                onClick={() => handleEventTypeSelected('job_milestone')}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <Briefcase className="w-5 h-5 text-purple-600" />
                    <span className="font-semibold text-slate-900">
                      {language === 'es' ? 'Hito / Fecha Límite de Trabajo' : 'Job Milestone / Deadline'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {language === 'es' 
                      ? 'Evento vinculado a un proyecto específico' 
                      : 'Event linked to a specific project'}
                  </p>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full justify-start h-auto p-4 bg-white border-slate-200 hover:bg-orange-50 hover:border-orange-400"
                onClick={() => handleEventTypeSelected('time_off')}
              >
                <div className="text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <CalendarClock className="w-5 h-5 text-orange-600" />
                    <span className="font-semibold text-slate-900">
                      {language === 'es' ? 'Evento de Ausencia' : 'Time-Off Event'}
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
            assignment={editingAssignment}
            selectedDate={selectedDate}
            selectedEventType={selectedEventType}
            jobs={jobs}
            employees={employees}
            onSubmit={handleSubmit}
            onDelete={handleDelete}
            isProcessing={createMutation.isPending || updateMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}