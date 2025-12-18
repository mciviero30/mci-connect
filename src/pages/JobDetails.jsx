import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DollarSign,
  Clock,
  MapPin,
  TrendingUp,
  Package,
  Camera,
  ClipboardList,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CalendarPlus,
  MessageSquare,
  CalendarDays as Calendar,
  Edit
} from "lucide-react";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import StatsCard from "../components/shared/StatsCard";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import CommentThread from "../components/comments/CommentThread";
import JobTimeline from "../components/jobs/JobTimeline";
import CostAccumulationChart from "../components/jobs/CostAccumulationChart";
import { useToast } from "@/components/ui/toast";

export default function JobDetails() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showWebSync, setShowWebSync] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId
  });

  const updateWebSyncMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.update(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success('Web sync settings updated');
    },
  });

  const syncToWebsiteMutation = useMutation({
    mutationFn: () => base44.functions.invoke('syncJobToWebsite', { job_id: jobId }),
    onSuccess: (result) => {
      toast.success('✅ Job synced to MCI-us.com successfully!');
      console.log('Sync result:', result);
    },
    onError: (error) => {
      toast.error(`Sync failed: ${error.message}`);
    }
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['jobTimeEntries', jobId],
    queryFn: () => base44.entities.TimeEntry.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    staleTime: 600000,
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['jobExpenses', jobId],
    queryFn: () => base44.entities.Expense.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    staleTime: 600000,
    initialData: []
  });

  const { data: inventoryTransactions = [] } = useQuery({
    queryKey: ['jobInventoryTransactions', jobId],
    queryFn: () => base44.entities.InventoryTransaction.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    staleTime: 900000,
    initialData: []
  });

  const { data: jobFiles = [] } = useQuery({
    queryKey: ['jobFiles', jobId],
    queryFn: () => base44.entities.JobFile.filter({ job_id: jobId }),
    enabled: !!jobId,
    staleTime: 1800000,
    initialData: []
  });

  const { data: jobAssignments = [] } = useQuery({
    queryKey: ['jobAssignments', jobId],
    queryFn: () => base44.entities.JobAssignment.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    staleTime: 600000,
    initialData: []
  });

  // Fetch the quote associated with this job to get estimated hours
  const { data: relatedQuote } = useQuery({
    queryKey: ['jobQuote', jobId],
    queryFn: async () => {
      const quotes = await base44.entities.Quote.filter({ job_id: jobId });
      return quotes[0] || null;
    },
    enabled: !!jobId,
    staleTime: 900000
  });

  const estimatedHours = relatedQuote?.estimated_hours || job?.estimated_hours || 0;
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalPayrollCost = totalHours * 25;
  const profit = (job?.contract_amount || 0) - totalPayrollCost - totalExpenses;

  if (jobLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#3B9FF3]" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">
            {language === 'es' ? 'Trabajo no encontrado' : 'Job not found'}
          </h1>
          <Link to={createPageUrl('Trabajos')}>
            <Button className="bg-[#3B9FF3] hover:bg-blue-600 text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Volver a Trabajos' : 'Back to Jobs'}
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-[#181818] dark:via-[#1a1a1a] dark:to-[#1e1e1e]">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link to={createPageUrl('Trabajos')}>
            <Button variant="ghost" className="mb-4 hover:bg-slate-100">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Volver a Trabajos' : 'Back to Jobs'}
            </Button>
          </Link>
          <PageHeader
            title={job.name}
            description={job.description || `${t('customer')}: ${job.customer_name || 'N/A'}`}
            icon={ClipboardList}
            actions={
              <div className="flex gap-3">
                {user?.role === 'admin' && (
                  <Button 
                    onClick={() => setShowWebSync(true)}
                    className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg"
                  >
                    🌐 Web Sync
                  </Button>
                )}
                <Link to={createPageUrl(`Calendario?job=${jobId}`)}>
                  <Button className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg">
                    <CalendarPlus className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Ver en Calendario' : 'View in Calendar'}
                  </Button>
                </Link>
              </div>
            }
          />
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title={t('contractAmount')}
            value={`$${(job.contract_amount || 0).toLocaleString()}`}
            icon={DollarSign}
            color="from-[#3B9FF3] to-[#2A8FE3]"
          />
          <StatsCard
            title={language === 'es' ? 'Horas' : 'Hours'}
            value={`${totalHours.toFixed(1)}h`}
            subtitle={estimatedHours > 0 ? `${language === 'es' ? 'Est:' : 'Est:'} ${estimatedHours.toFixed(1)}h` : null}
            icon={Clock}
            color={totalHours > estimatedHours && estimatedHours > 0 ? "from-amber-500 to-orange-500" : "from-green-500 to-emerald-500"}
          />
          <StatsCard
            title={t('totalExpenses')}
            value={`$${totalExpenses.toFixed(2)}`}
            icon={TrendingUp}
            color="from-purple-500 to-pink-500"
          />
          <StatsCard
            title={t('profitLoss')}
            value={`$${profit.toFixed(2)}`}
            icon={profit >= 0 ? TrendingUp : AlertTriangle}
            color={profit >= 0 ? "from-green-500 to-emerald-500" : "from-red-500 to-orange-500"}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <ClipboardList className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Resumen' : 'Overview'}
            </TabsTrigger>
            <TabsTrigger value="hours" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <Clock className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Horas' : 'Hours'}
            </TabsTrigger>
            <TabsTrigger value="expenses" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Gastos' : 'Expenses'}
            </TabsTrigger>
            <TabsTrigger value="inventory" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <Package className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Inventario' : 'Inventory'}
            </TabsTrigger>
            <TabsTrigger value="photos" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <Camera className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Fotos' : 'Photos'}
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Cronología' : 'Timeline'}
            </TabsTrigger>
            <TabsTrigger value="budget" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Presupuesto' : 'Budget'}
            </TabsTrigger>
            <TabsTrigger value="comments" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Comentarios' : 'Comments'}
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-white shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <MapPin className="w-5 h-5 text-[#3B9FF3]" />
                    {language === 'es' ? 'Información del Proyecto' : 'Project Information'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <p className="text-sm text-slate-600">{t('customer')}</p>
                    <p className="font-semibold text-slate-900">{job.customer_name || 'N/A'}</p>
                  </div>
                  {job.address && (
                    <div>
                      <p className="text-sm text-slate-600">{language === 'es' ? 'Dirección' : 'Address'}</p>
                      <p className="font-semibold text-slate-900">{job.address}</p>
                      {job.city && job.state && (
                        <p className="text-slate-700">{job.city}, {job.state} {job.zip}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-slate-600">{t('status')}</p>
                    <Badge className={
                      job.status === 'completed' ? 'bg-green-500 text-white' :
                      job.status === 'active' ? 'bg-blue-500 text-white' :
                      'bg-slate-500 text-white'
                    }>
                      {job.status}
                    </Badge>
                  </div>
                  {job.team_name && (
                    <div>
                      <p className="text-sm text-slate-600">{language === 'es' ? 'Equipo Asignado' : 'Assigned Team'}</p>
                      <p className="font-semibold text-slate-900">{job.team_name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-white shadow-lg">
                <CardHeader className="border-b">
                  <CardTitle className="flex items-center gap-2 text-slate-900">
                    <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
                    {t('financialSummary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === 'es' ? 'Monto del Contrato' : 'Contract Amount'}</span>
                    <span className="font-bold text-green-600">${(job.contract_amount || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === 'es' ? 'Costo de Nómina' : 'Payroll Cost'}</span>
                    <span className="font-semibold text-slate-900">${totalPayrollCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">{language === 'es' ? 'Gastos' : 'Expenses'}</span>
                    <span className="font-semibold text-slate-900">${totalExpenses.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{t('profitLoss')}</span>
                      <span className={`font-bold text-xl ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${profit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Job Events/Assignments Card */}
            {jobAssignments.length > 0 && (
              <Card className="bg-white shadow-lg mt-6">
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-slate-900">
                      <CalendarPlus className="w-5 h-5 text-[#3B9FF3]" />
                      {language === 'es' ? 'Eventos de Calendario' : 'Calendar Events'}
                    </CardTitle>
                    <Link to={createPageUrl(`Calendario?job=${jobId}`)}>
                      <Button variant="outline" size="sm" className="bg-white border-[#3B9FF3] text-[#3B9FF3] hover:bg-blue-50">
                        {language === 'es' ? 'Ver Todos' : 'View All'}
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {jobAssignments.slice(0, 5).map(assignment => (
                      <div key={assignment.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {assignment.event_title || assignment.job_name}
                          </p>
                          <p className="text-sm text-slate-600">
                            {format(new Date(assignment.date), 'MMM dd, yyyy')}
                            {assignment.start_time && ` • ${assignment.start_time}`}
                          </p>
                          {assignment.employee_name && (
                            <p className="text-xs text-slate-500">{assignment.employee_name}</p>
                          )}
                        </div>
                        <Badge className="bg-purple-500 text-white">
                          {assignment.event_type === 'job_milestone' 
                            ? (language === 'es' ? 'Hito' : 'Milestone')
                            : (language === 'es' ? 'Cita' : 'Appointment')}
                        </Badge>
                      </div>
                    ))}
                    {jobAssignments.length > 5 && (
                      <p className="text-sm text-slate-500 text-center">
                        {language === 'es' 
                          ? `+${jobAssignments.length - 5} eventos más` 
                          : `+${jobAssignments.length - 5} more events`}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Hours Tab */}
          <TabsContent value="hours">
            {/* Hours Summary Cards */}
            {estimatedHours > 0 && (
              <div className="grid md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-amber-700 mb-1">
                      {language === 'es' ? 'Horas Estimadas' : 'Estimated Hours'}
                    </p>
                    <p className="text-3xl font-bold text-amber-900">{estimatedHours.toFixed(1)}h</p>
                    <p className="text-xs text-amber-600 mt-1">
                      {language === 'es' ? 'Del quote original' : 'From original quote'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
                  <CardContent className="p-4">
                    <p className="text-sm text-cyan-700 mb-1">
                      {language === 'es' ? 'Horas Trabajadas' : 'Hours Worked'}
                    </p>
                    <p className="text-3xl font-bold text-cyan-900">{totalHours.toFixed(1)}h</p>
                    <p className="text-xs text-cyan-600 mt-1">
                      {((totalHours / estimatedHours) * 100).toFixed(0)}% {language === 'es' ? 'del estimado' : 'of estimate'}
                    </p>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${
                  totalHours > estimatedHours 
                    ? 'from-red-50 to-orange-50 border-red-200' 
                    : 'from-green-50 to-emerald-50 border-green-200'
                }`}>
                  <CardContent className="p-4">
                    <p className={`text-sm mb-1 ${totalHours > estimatedHours ? 'text-red-700' : 'text-green-700'}`}>
                      {language === 'es' ? 'Restantes' : 'Remaining'}
                    </p>
                    <p className={`text-3xl font-bold ${totalHours > estimatedHours ? 'text-red-900' : 'text-green-900'}`}>
                      {totalHours > estimatedHours ? '+' : ''}{(totalHours - estimatedHours).toFixed(1)}h
                    </p>
                    <p className={`text-xs mt-1 ${totalHours > estimatedHours ? 'text-red-600' : 'text-green-600'}`}>
                      {totalHours > estimatedHours 
                        ? (language === 'es' ? 'Sobre el estimado' : 'Over estimate')
                        : (language === 'es' ? 'Bajo el estimado' : 'Under estimate')}
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            <Card className="bg-white shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Clock className="w-5 h-5 text-[#3B9FF3]" />
                  {language === 'es' ? 'Registro de Horas' : 'Time Entries'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {timeEntries.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">{language === 'es' ? 'No hay horas registradas' : 'No time entries yet'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Empleado' : 'Employee'}</th>
                          <th className="text-left p-3 text-slate-700">{t('date')}</th>
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Horas' : 'Hours'}</th>
                          <th className="text-left p-3 text-slate-700">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {timeEntries.map(entry => (
                          <tr key={entry.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">{entry.employee_name}</td>
                            <td className="p-3">{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                            <td className="p-3 font-semibold">{(entry.hours_worked || 0).toFixed(1)}h</td>
                            <td className="p-3">
                              <Badge className={
                                entry.status === 'approved' ? 'bg-green-500 text-white' :
                                entry.status === 'pending' ? 'bg-amber-500 text-white' :
                                'bg-red-500 text-white'
                              }>
                                {entry.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent value="expenses">
            <Card className="bg-white shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
                  {language === 'es' ? 'Gastos del Proyecto' : 'Project Expenses'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <DollarSign className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">{language === 'es' ? 'No hay gastos registrados' : 'No expenses yet'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Empleado' : 'Employee'}</th>
                          <th className="text-left p-3 text-slate-700">{t('date')}</th>
                          <th className="text-left p-3 text-slate-700">{t('category')}</th>
                          <th className="text-left p-3 text-slate-700">{t('amount')}</th>
                          <th className="text-left p-3 text-slate-700">{t('status')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map(expense => (
                          <tr key={expense.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">{expense.employee_name}</td>
                            <td className="p-3">{format(new Date(expense.date), 'MMM dd, yyyy')}</td>
                            <td className="p-3">{expense.category}</td>
                            <td className="p-3 font-semibold">${expense.amount.toFixed(2)}</td>
                            <td className="p-3">
                              <Badge className={
                                expense.status === 'approved' ? 'bg-green-500 text-white' :
                                expense.status === 'pending' ? 'bg-amber-500 text-white' :
                                'bg-red-500 text-white'
                              }>
                                {expense.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory">
            <Card className="bg-white shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Package className="w-5 h-5 text-[#3B9FF3]" />
                  {language === 'es' ? 'Inventario Utilizado' : 'Inventory Used'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {inventoryTransactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">{language === 'es' ? 'No hay movimientos de inventario' : 'No inventory transactions yet'}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Item' : 'Item'}</th>
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Tipo' : 'Type'}</th>
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Cantidad' : 'Quantity'}</th>
                          <th className="text-left p-3 text-slate-700">{language === 'es' ? 'Empleado' : 'Employee'}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryTransactions.map(transaction => (
                          <tr key={transaction.id} className="border-b hover:bg-slate-50">
                            <td className="p-3">{transaction.item_name}</td>
                            <td className="p-3">
                              <Badge className={
                                transaction.type === 'add' ? 'bg-green-500 text-white' :
                                transaction.type === 'remove' ? 'bg-red-500 text-white' :
                                'bg-blue-500 text-white'
                              }>
                                {transaction.type}
                              </Badge>
                            </td>
                            <td className="p-3 font-semibold">{transaction.quantity}</td>
                            <td className="p-3">{transaction.employee_name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos">
            <Card className="bg-white shadow-lg">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2 text-slate-900">
                  <Camera className="w-5 h-5 text-[#3B9FF3]" />
                  {language === 'es' ? 'Galería de Fotos' : 'Photo Gallery'}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {jobFiles.length === 0 ? (
                  <div className="text-center py-12">
                    <Camera className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">{language === 'es' ? 'No hay fotos subidas' : 'No photos uploaded yet'}</p>
                    <p className="text-sm text-slate-400 mt-2">
                      {language === 'es' 
                        ? 'Las fotos del proyecto se suben desde MCI Field' 
                        : 'Project photos are uploaded from MCI Field'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {jobFiles.map(file => (
                      <div key={file.id} className="relative group">
                        <img
                          src={file.file_url}
                          alt={file.file_name}
                          className="w-full h-48 object-cover rounded-lg border-2 border-slate-200 group-hover:border-blue-400 transition-all"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 rounded-lg transition-all flex items-center justify-center">
                          <a
                            href={file.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Button variant="secondary" size="sm">
                              {language === 'es' ? 'Ver Completa' : 'View Full'}
                            </Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <JobTimeline
              job={job}
              timeEntries={timeEntries}
              expenses={expenses}
              inventoryTransactions={inventoryTransactions}
              assignments={jobAssignments}
              language={language}
            />
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget">
            <CostAccumulationChart
              job={job}
              timeEntries={timeEntries}
              expenses={expenses}
              estimatedHours={estimatedHours}
              language={language}
            />
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <CommentThread entityType="job" entityId={jobId} />
          </TabsContent>
        </Tabs>

        {/* Web Sync Dialog - ADMIN ONLY */}
        <Dialog open={showWebSync} onOpenChange={setShowWebSync}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <span className="text-3xl">🌐</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Public Portfolio Settings</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">Sync to MCI-us.com website</p>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg ml-auto">
                  🔒 Admin Only
                </Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-6">
              {/* Toggle Switch */}
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border-2 border-yellow-400 dark:border-yellow-500">
                <div>
                  <Label className="text-slate-900 dark:text-white font-bold text-base">Show on MCI-us.com</Label>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Enable for completed projects (privacy: no pricing, no full addresses, no quantities)
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={job?.show_on_website || false}
                    onChange={(e) => updateWebSyncMutation.mutate({ show_on_website: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-14 h-7 bg-slate-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-yellow-300 dark:peer-focus:ring-yellow-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-white after:border-slate-300 after:border-2 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-yellow-400 peer-checked:to-amber-500 shadow-lg"></div>
                </label>
              </div>

              {job?.show_on_website && (
                <>
                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">Hero Photo URL</Label>
                    <Input
                      value={job?.hero_photo_url || ''}
                      onChange={(e) => updateWebSyncMutation.mutate({ hero_photo_url: e.target.value })}
                      onBlur={(e) => updateWebSyncMutation.mutate({ hero_photo_url: e.target.value })}
                      className="mt-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                      placeholder="https://... (high-resolution project photo)"
                    />
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                      Used for PDF cover & website portfolio
                    </p>
                  </div>

                  <div>
                    <Label className="text-slate-700 dark:text-slate-300 font-semibold">Public Description</Label>
                    <Textarea
                      value={job?.website_description || ''}
                      onChange={(e) => updateWebSyncMutation.mutate({ website_description: e.target.value })}
                      onBlur={(e) => updateWebSyncMutation.mutate({ website_description: e.target.value })}
                      className="mt-2 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 h-24"
                      placeholder="Privacy-filtered description (no pricing, no full addresses)"
                    />
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      ⚠️ Auto-filtered: No $ amounts, no street addresses, no LF quantities
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                onClick={() => syncToWebsiteMutation.mutate()}
                disabled={!job?.show_on_website || syncToWebsiteMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg disabled:opacity-50"
              >
                {syncToWebsiteMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    🚀 Sync Now to MCI-us.com
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowWebSync(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}