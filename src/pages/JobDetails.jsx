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
import { Lock } from "lucide-react";
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
  Edit,
  UserPlus,
  Zap,
  CheckCircle2,
  Trash2
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
import ClientInvitationManager from "@/components/field/ClientInvitationManager";

export default function JobDetails() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState('overview');
  const [showCalendarDialog, setShowCalendarDialog] = useState(false);
  const [showWebSync, setShowWebSync] = useState(false);
  const [showClientInvitation, setShowClientInvitation] = useState(false);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: rawJob, isLoading: jobLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => base44.entities.Job.get(jobId),
    enabled: !!jobId
  });

  // Guard against crashes when Drive/Field URLs are null
  const job = rawJob ? {
    ...rawJob,
    drive_folder_url: rawJob.drive_folder_url || null,
    field_project_id: rawJob.field_project_id || null,
    provisioning_status: rawJob.provisioning_status || 'not_started'
  } : null;

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

  const provisionToFieldMutation = useMutation({
    mutationFn: async () => {
      const result = await base44.functions.invoke('syncJobToMCIField', { jobData: job });
      
      if (result?.data?.success && result?.data?.mci_field_job_id) {
        // Update job with field project id
        await base44.entities.Job.update(jobId, {
          field_project_id: result.data.mci_field_job_id
        });
        return result.data;
      } else {
        throw new Error(result?.data?.error || 'Failed to sync to MCI Field');
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      toast.success(language === 'es' 
        ? '✅ Trabajo provisionado a MCI Field exitosamente' 
        : '✅ Job provisioned to MCI Field successfully');
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
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

  const { data: changeOrders = [] } = useQuery({
    queryKey: ['jobChangeOrders', jobId],
    queryFn: () => base44.entities.ChangeOrder.filter({ job_id: jobId, status: 'approved' }),
    enabled: !!jobId,
    staleTime: 600000,
    initialData: []
  });

  const { data: drivingLogs = [] } = useQuery({
    queryKey: ['jobDrivingLogs', jobId],
    queryFn: () => base44.entities.DrivingLog.filter({ job_id: jobId }),
    enabled: !!jobId,
    staleTime: 600000,
    initialData: []
  });

  const estimatedHours = relatedQuote?.estimated_hours || job?.estimated_hours || 0;
  const estimatedCost = relatedQuote?.estimated_cost || job?.estimated_cost || 0;
  const baseContractAmount = job?.contract_amount || 0;
  
  // Calculate change orders impact
  const totalChangeOrderAmount = changeOrders.reduce((sum, co) => sum + (co.change_amount || 0), 0);
  const adjustedContractAmount = baseContractAmount + totalChangeOrderAmount;
  
  // Calculate actual costs
  const totalHours = timeEntries.reduce((sum, entry) => sum + (entry.hours_worked || 0), 0);
  const totalPayrollCost = timeEntries.reduce((sum, entry) => {
    const rate = 25; // Could be dynamic per employee
    return sum + ((entry.hours_worked || 0) * rate);
  }, 0);
  
  const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
  const totalDrivingCost = drivingLogs.reduce((sum, log) => sum + (log.total_amount || 0), 0);
  const totalInventoryCost = inventoryTransactions
    .filter(t => t.type === 'remove')
    .reduce((sum, t) => sum + ((t.cost_per_unit || 0) * (t.quantity || 0)), 0);
  
  const totalCosts = totalPayrollCost + totalExpenses + totalDrivingCost + totalInventoryCost;
  const profit = adjustedContractAmount - totalCosts;
  const profitMargin = adjustedContractAmount > 0 ? (profit / adjustedContractAmount) * 100 : 0;
  
  // Budget health indicators
  const budgetUsed = estimatedCost > 0 ? (totalCosts / estimatedCost) * 100 : 0;
  const isOverBudget = budgetUsed > 100;
  const budgetVariance = totalCosts - estimatedCost;

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
              <div className="flex gap-3 flex-wrap">
                {user?.role === 'admin' && (
                  <>
                    {!job?.field_project_id ? (
                      <Button 
                        onClick={() => {
                          if (window.confirm(
                            language === 'es'
                              ? '¿Provisionar este trabajo a MCI Field?\n\nEsto creará un proyecto de campo para gestión móvil.'
                              : 'Provision this job to MCI Field?\n\nThis will create a field project for mobile management.'
                          )) {
                            provisionToFieldMutation.mutate();
                          }
                        }}
                        disabled={provisionToFieldMutation.isPending}
                        className="bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg"
                      >
                        {provisionToFieldMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            {language === 'es' ? 'Provisionando...' : 'Provisioning...'}
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            {language === 'es' ? 'Provisionar a MCI Field' : 'Provision to MCI Field'}
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        disabled
                        className="bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg opacity-75"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Ya en MCI Field' : 'Already in MCI Field'}
                      </Button>
                    )}
                    <Button 
                      onClick={() => setShowClientInvitation(true)}
                      className="bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {language === 'es' ? 'Invitar Cliente' : 'Invite Client'}
                    </Button>
                    <Button 
                      onClick={() => setShowWebSync(true)}
                      className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white shadow-lg"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Web Sync
                    </Button>
                  </>
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

        {/* Budget Alert Banner */}
        {isOverBudget && (
          <Card className="mb-6 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-300 dark:border-red-700">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-red-900 dark:text-red-300">⚠️ Over Budget Alert</h3>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    Current costs: ${totalCosts.toLocaleString()} ({budgetUsed.toFixed(0)}% of budget) • 
                    Over by ${Math.abs(budgetVariance).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Stats */}
        <div className="grid md:grid-cols-5 gap-4 mb-8">
          <Card className="bg-white dark:bg-slate-800 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Contract + COs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${adjustedContractAmount.toLocaleString()}
              </p>
              {totalChangeOrderAmount !== 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  +${totalChangeOrderAmount.toLocaleString()} COs
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Total Costs</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                ${totalCosts.toLocaleString()}
              </p>
              {estimatedCost > 0 && (
                <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  {budgetUsed.toFixed(0)}% of ${estimatedCost.toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Hours</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {totalHours.toFixed(1)}h
              </p>
              {estimatedHours > 0 && (
                <p className={`text-xs mt-1 ${totalHours > estimatedHours ? 'text-amber-600' : 'text-green-600'}`}>
                  Est: {estimatedHours.toFixed(1)}h
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={`${profit >= 0 ? 'bg-green-50 dark:bg-green-900/20 border-green-200' : 'bg-red-50 dark:bg-red-900/20 border-red-200'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${profit >= 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                  {profit >= 0 ? <TrendingUp className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Profit/Loss</p>
              <p className={`text-2xl font-bold ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                ${profit.toLocaleString()}
              </p>
              <p className={`text-xs mt-1 ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profitMargin.toFixed(1)}% margin
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-slate-800 shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={`p-2 rounded-lg ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}>
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">Budget Health</p>
              <p className={`text-2xl font-bold ${isOverBudget ? 'text-red-700 dark:text-red-400' : 'text-green-700 dark:text-green-400'}`}>
                {budgetUsed.toFixed(0)}%
              </p>
              <p className={`text-xs mt-1 ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {isOverBudget ? 'Over Budget' : 'On Track'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Cost Breakdown Card */}
        <Card className="mb-6 bg-white dark:bg-slate-800 shadow-lg">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
              <DollarSign className="w-5 h-5 text-[#3B9FF3]" />
              Cost Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Labor Cost</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">${totalPayrollCost.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{totalHours.toFixed(1)}h × $25/hr avg</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Expenses</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">${totalExpenses.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{expenses.length} items</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Driving/Mileage</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">${totalDrivingCost.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{drivingLogs.length} logs</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Materials</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white">${totalInventoryCost.toLocaleString()}</p>
                <p className="text-xs text-slate-500 mt-1">{inventoryTransactions.filter(t => t.type === 'remove').length} items</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Total Costs:</span>
                <span className="text-2xl font-bold text-slate-900 dark:text-white">
                  ${totalCosts.toLocaleString()}
                </span>
              </div>
              {estimatedCost > 0 && (
                <div className="mt-2">
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-green-500'}`}
                      style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 text-right">
                    Budget: ${estimatedCost.toLocaleString()} • 
                    {isOverBudget ? ' Over by' : ' Remaining'}: ${Math.abs(budgetVariance).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

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
            <TabsTrigger value="costs" className="data-[state=active]:bg-[#3B9FF3] data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              {language === 'es' ? 'Costos' : 'Costs'}
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
            {/* Generate Invoice from Hours Button - For ANY job with approved hours */}
            {timeEntries.filter(e => e.status === 'approved').length > 0 && (
              <Card className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-300 mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-emerald-900 text-lg mb-1 flex items-center gap-2">
                       <DollarSign className="w-5 h-5" />
                       {language === 'es' ? 'Facturar Trabajo Adicional por Horas (T&M)' : 'Bill Additional T&M Work'}
                      </h3>
                      <p className="text-sm text-emerald-700">
                        {language === 'es' 
                          ? `Regular: $${job.regular_hourly_rate || 60}/hr • Overtime: $${job.overtime_hourly_rate || 90}/hr`
                          : `Regular: $${job.regular_hourly_rate || 60}/hr • Overtime: $${job.overtime_hourly_rate || 90}/hr`}
                      </p>
                      <p className="text-xs text-emerald-600 mt-1">
                        {timeEntries.filter(e => e.status === 'approved').length} {language === 'es' ? 'horas aprobadas listas para facturar' : 'approved hours ready to bill'}
                      </p>
                      {job?.billing_type === 'fixed_price' && (
                        <p className="text-xs text-amber-700 mt-2 font-semibold flex items-center gap-1">
                         <AlertTriangle className="w-3.5 h-3.5" />
                         {language === 'es' 
                           ? 'Trabajo original fue precio fijo. Esta factura es por trabajo ADICIONAL por horas.'
                           : 'Original job was fixed price. This invoice is for ADDITIONAL hourly work.'}
                        </p>
                      )}
                    </div>
                    <Link to={createPageUrl(`CrearFactura?job_id=${jobId}&billing_type=time_materials`)}>
                      <Button className="bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-lg">
                        <DollarSign className="w-4 h-4 mr-2" />
                        {language === 'es' ? 'Generar Factura T&M' : 'Generate T&M Invoice'}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}

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

          {/* Costs Tab - Real-time tracking */}
          <TabsContent value="costs">
            <div className="space-y-6">
              {/* Cost Summary Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Labor
                    </p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">${totalPayrollCost.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{totalHours.toFixed(1)} hours logged</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-purple-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-purple-700 dark:text-purple-300 mb-1 flex items-center gap-1">
                      <DollarSign className="w-3 h-3" /> Expenses
                    </p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${totalExpenses.toLocaleString()}</p>
                    <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">{expenses.length} receipts</p>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200">
                  <CardContent className="p-4">
                    <p className="text-xs text-green-700 dark:text-green-300 mb-1 flex items-center gap-1">
                      <Package className="w-3 h-3" /> Materials
                    </p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">${totalInventoryCost.toLocaleString()}</p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">From inventory</p>
                  </CardContent>
                </Card>

                <Card className={`bg-gradient-to-br ${profit >= 0 ? 'from-emerald-50 to-green-50 border-emerald-200' : 'from-red-50 to-orange-50 border-red-200'}`}>
                  <CardContent className="p-4">
                    <p className={`text-xs mb-1 flex items-center gap-1 ${profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      <TrendingUp className="w-3 h-3" /> Net Profit
                    </p>
                    <p className={`text-2xl font-bold ${profit >= 0 ? 'text-emerald-900' : 'text-red-900'}`}>
                      ${profit.toLocaleString()}
                    </p>
                    <p className={`text-xs mt-1 ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {profitMargin.toFixed(1)}% margin
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Budget vs Actual */}
              {estimatedCost > 0 && (
                <Card className="bg-white dark:bg-slate-800 shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-slate-900 dark:text-white">Budget vs Actual</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm text-slate-600 dark:text-slate-400">Budget Progress</span>
                          <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            {budgetUsed.toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden relative">
                          <div 
                            className={`h-full transition-all ${isOverBudget ? 'bg-gradient-to-r from-red-500 to-red-600' : 'bg-gradient-to-r from-green-500 to-emerald-600'}`}
                            style={{ width: `${Math.min(budgetUsed, 100)}%` }}
                          />
                          {isOverBudget && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xs font-bold text-white">OVER BUDGET</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Budgeted</p>
                          <p className="text-lg font-bold text-slate-900 dark:text-white">${estimatedCost.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Actual</p>
                          <p className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                            ${totalCosts.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {isOverBudget && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                          <p className="text-sm text-red-700 dark:text-red-300 font-semibold">
                            ⚠️ Over budget by ${Math.abs(budgetVariance).toLocaleString()}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Change Orders Impact */}
              {changeOrders.length > 0 && (
                <Card className="bg-white dark:bg-slate-800 shadow-lg">
                  <CardHeader className="border-b">
                    <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="w-5 h-5 text-green-600" />
                      Approved Change Orders ({changeOrders.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      {changeOrders.map(co => (
                        <div key={co.id} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{co.change_order_number}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400">{co.title}</p>
                          </div>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            +${co.change_amount?.toLocaleString() || 0}
                          </p>
                        </div>
                      ))}
                      <div className="pt-3 border-t flex justify-between">
                        <span className="font-semibold text-slate-700 dark:text-slate-300">Total COs Impact:</span>
                        <span className="font-bold text-lg text-green-600 dark:text-green-400">
                          +${totalChangeOrderAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
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

        {/* Client Invitation Manager */}
        <ClientInvitationManager 
          open={showClientInvitation}
          onClose={() => setShowClientInvitation(false)}
          jobId={jobId}
          jobName={job?.name}
        />

        {/* Web Sync Dialog - ADMIN ONLY */}
        <Dialog open={showWebSync} onOpenChange={setShowWebSync}>
          <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Public Portfolio Settings</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">Sync to MCI-us.com website</p>
                </div>
                <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg ml-auto flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Admin Only
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
              <div className="flex gap-3">
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
                      <Zap className="w-4 h-4 mr-2" />
                      Sync Now to MCI-us.com
                    </>
                  )}
                </Button>
                {job?.show_on_website && (
                  <Button
                    onClick={() => updateWebSyncMutation.mutate({ show_on_website: false })}
                    variant="destructive"
                    className="shadow-lg"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove from Website
                  </Button>
                )}
              </div>
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