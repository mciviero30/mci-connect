
import React, { useState, useMemo } from "react";
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Clock,
  Users,
  Calendar as CalendarIcon,
  MapPin,
  TrendingUp,
  Package,
  Camera,
  ClipboardList,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Image,
  ExternalLink
} from "lucide-react";
import { createPageUrl } from '@/utils';
import PageHeader from "../components/shared/PageHeader";
import StatsCard from "../components/shared/StatsCard";
import { format } from "date-fns";
import { useLanguage } from "@/components/i18n/LanguageContext";
import BlueprintViewer from "../components/trabajos/BlueprintViewer";
import ClientAccessManager from "../components/trabajos/ClientAccessManager";

export default function JobDetails() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const isAdmin = user?.role === 'admin';

  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId
  });

  const { data: timeEntries = [] } = useQuery({
    queryKey: ['jobTimeEntries', jobId],
    queryFn: () => base44.entities.TimeEntry.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    initialData: []
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['jobExpenses', jobId],
    queryFn: () => base44.entities.Expense.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    initialData: []
  });

  const { data: inventoryTransactions = [] } = useQuery({
    queryKey: ['jobInventoryTransactions', jobId],
    queryFn: () => base44.entities.InventoryTransaction.filter({ job_id: jobId }, '-created_date'),
    enabled: !!jobId,
    initialData: []
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['jobAssignments', jobId],
    queryFn: () => base44.entities.JobAssignment.filter({ job_id: jobId }, '-date'),
    enabled: !!jobId,
    initialData: []
  });

  const { data: jobFiles = [] } = useQuery({
    queryKey: ['jobFiles', jobId],
    queryFn: () => base44.entities.JobFile.filter({ job_id: jobId }),
    enabled: !!jobId,
    initialData: []
  });

  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalPayrollCost = totalHours * 25; // Assuming a flat rate of $25/hour for simplicity, adjust as needed
  const profit = (job?.contract_amount || 0) - totalPayrollCost - totalExpenses;

  const approvedTimeEntries = timeEntries.filter(e => e.status === 'approved');
  const pendingTimeEntries = timeEntries.filter(e => e.status === 'pending');
  const approvedExpenses = expenses.filter(e => e.status === 'approved');
  const pendingExpenses = expenses.filter(e => e.status === 'pending');

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
          <h1 className="text-2xl font-bold text-slate-900 mb-4">{language === 'es' ? 'Trabajo no encontrado' : 'Job not found'}</h1>
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
    <div className="min-h-screen p-4 md:p-8 bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
            title={t('totalWorkedHours')}
            value={`${totalHours.toFixed(1)}h`}
            icon={Clock}
            color="from-green-500 to-emerald-500"
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
            <TabsTrigger value="blueprints" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <Image className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Planos y Tareas' : 'Blueprints & Tasks'}
            </TabsTrigger>
            {/* NEW TAB: Client Portal */}
            {isAdmin && (
              <TabsTrigger value="client-portal" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
                <ExternalLink className="w-4 h-4 mr-2" />
                {language === 'es' ? 'Portal Cliente' : 'Client Portal'}
              </TabsTrigger>
            )}
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
          </TabsContent>

          {/* Blueprints Tab */}
          <TabsContent value="blueprints">
            <BlueprintViewer jobId={jobId} jobName={job.name} isClientView={false} />
          </TabsContent>

          {/* NEW: Client Portal Tab */}
          {isAdmin && (
            <TabsContent value="client-portal">
              <ClientAccessManager job={job} />
            </TabsContent>
          )}

          {/* Hours Tab */}
          <TabsContent value="hours">
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
                    <Link to={createPageUrl(`JobPhotos?jobId=${jobId}`)}>
                      <Button className="mt-4 bg-[#3B9FF3] hover:bg-blue-600 text-white">
                        <Camera className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Subir Fotos' : 'Upload Photos'}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
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
                    <div className="mt-6">
                      <Link to={createPageUrl(`JobPhotos?jobId=${jobId}`)}>
                        <Button className="bg-[#3B9FF3] hover:bg-blue-600 text-white">
                          <Camera className="w-4 h-4 mr-2" />
                          {language === 'es' ? 'Gestionar Fotos' : 'Manage Photos'}
                        </Button>
                      </Link>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
