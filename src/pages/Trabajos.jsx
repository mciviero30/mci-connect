import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSmartPagination, PaginationControls } from "@/components/hooks/useSmartPagination";
import { useErrorHandler } from "@/components/shared/UnifiedErrorHandler";
import { useNavigate } from "react-router-dom";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Plus, Eye, Edit, MapPin, DollarSign, MoreVertical, Archive, Trash2, Sparkles, Search, X, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PageHeader from "../components/shared/PageHeader";
import JobForm from "../components/trabajos/JobForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { useLanguage } from "@/components/i18n/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AIJobWizard from "../components/trabajos/AIJobWizard";
import ModernJobCard from "../components/trabajos/ModernJobCard";
import FilterBar from "../components/shared/FilterBar";
import { useJobClosureValidation } from "../components/trabajos/JobStatusValidator";
import ExcelExporter, { transformJobsForExport } from "@/components/shared/ExcelExporter";
import { CURRENT_USER_QUERY_KEY } from "@/components/constants/queryKeys";
import { FileSpreadsheet } from "lucide-react";
import ViewModeToggle from "@/components/shared/ViewModeToggle";
import SavedFilters from "@/components/shared/SavedFilters";
import CompactListView from "@/components/shared/CompactListView";



export default function Trabajos() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate(); // OPS-I1 FIX: import and use navigate
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid');

  const { data: user } = useQuery({ 
    queryKey: CURRENT_USER_QUERY_KEY,
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  
  // Smart pagination - Only fetch 20 jobs at a time
  const paginationFilters = {};
  if (statusFilter !== 'all') paginationFilters.status = statusFilter;
  if (teamFilter !== 'all') paginationFilters.team_id = teamFilter;
  
  const {
    items: jobs,
    isLoading,
    page,
    hasMore,
    hasPrevious,
    nextPage,
    prevPage,
    resetPagination
  } = useSmartPagination({
    entityName: 'Job',
    filters: paginationFilters,
    sortBy: '-created_date',
    pageSize: 18,
    enabled: !!user
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    gcTime: Infinity
  });

  const { handleError } = useErrorHandler();

  // I2 FIX: Only fetch time entries when actually needed for validation (lazy load)
  // Instead of loading 1000 entries on mount, we'll query on-demand when status changes
  const fetchJobTimeEntries = async (jobId) => {
    return base44.entities.TimeEntry.filter({ job_id: jobId, status: 'pending' });
  };



  const createMutation = useMutation({
    mutationFn: async (data) => {
      const createdJob = await base44.entities.Job.create(data);
      
      // Auto-generate job_number after creation
      try {
        const { generateJobNumber } = await import('@/functions/generateJobNumber');
        const numberResponse = await generateJobNumber({ job_id: createdJob.id });
        
        if (numberResponse.data?.job_number) {
          await base44.entities.Job.update(createdJob.id, { 
            job_number: numberResponse.data.job_number 
          });
        }
      } catch (error) {
        console.error('Failed to generate job number:', error);
        // Don't fail the whole operation - job is created, just without number
      }
      
      return createdJob;
    },
    onSuccess: (createdJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Job'] });
      resetPagination();
      setShowForm(false);
      setShowAIWizard(false);
      setEditingJob(null);
      toast({
        title: t('jobCreated'),
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, t('jobCreated'));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // I2 FIX: Lazy load validation - only query when status change to completed/archived
      if ((data.status === 'completed' || data.status === 'archived') && data.status !== editingJob?.status) {
        const pendingEntries = await fetchJobTimeEntries(id);

        if (pendingEntries.length > 0) {
          throw new Error(
            `Cannot close job: ${pendingEntries.length} time entries are still pending approval. ` +
            `Please approve or reject all time entries before closing this job.`
          );
        }
      }

      return base44.entities.Job.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Job'] });
      resetPagination();
      setShowForm(false);
      setEditingJob(null);
      toast({
        title: t('jobUpdated'),
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, t('jobUpdated'));
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Job.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['paginated', 'Job'] });
      resetPagination();
      toast({
        title: language === 'es' ? 'Trabajo eliminado' : 'Job deleted',
        variant: 'success'
      });
    },
    onError: (error) => {
      handleError(error, language === 'es' ? 'Trabajo eliminado' : 'Job deleted');
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => {
      // For archive, we could also implement similar validation if needed,
      // but for now, the prompt only specified it for the general updateMutation.
      return base44.entities.Job.update(id, { status: 'archived' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: language === 'es' ? 'Trabajo archivado' : 'Job archived',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleSubmit = (data) => {
    if (editingJob) {
      updateMutation.mutate({ id: editingJob.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleWizardComplete = (data) => {
    createMutation.mutate(data);
  };

  const handleEdit = (job) => {
    setEditingJob(job);
    setShowForm(true);
  };

  // Filter jobs based on search term, status, and team
  const filteredJobs = jobs.filter(job => {
    // Text search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm ||
      job.name?.toLowerCase().includes(searchLower) ||
      job.address?.toLowerCase().includes(searchLower) ||
      job.customer_name?.toLowerCase().includes(searchLower);

    // Status filter
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;

    // Team filter
    const matchesTeam = teamFilter === 'all' || job.team_id === teamFilter;

    return matchesSearch && matchesStatus && matchesTeam;
  });

  // Memoize expensive filters
  const { activeJobs, completedJobs } = useMemo(() => ({
    activeJobs: filteredJobs.filter(j => j.status === 'active'),
    completedJobs: filteredJobs.filter(j => j.status === 'completed')
  }), [filteredJobs]);

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    converted_to_invoice: "bg-purple-50 text-purple-700 border-purple-200"
  };

  const isAdmin = user?.role === 'admin';

  // Helper function to calculate profit margin color
  const getProfitMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Helper function to format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#181818] pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        <PageHeader
          title={t('jobs')}
          description={`${activeJobs.length} ${t('active').toLowerCase()}, ${completedJobs.length} ${t('completed').toLowerCase()}`}
          icon={Briefcase}
          actions={
            isAdmin && (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
                <ExcelExporter
                  data={filteredJobs}
                  filename="jobs"
                  sheetName="Jobs"
                  transformData={transformJobsForExport}
                  buttonText={language === 'es' ? 'Excel' : 'Excel'}
                  variant="outline"
                  size="sm"
                  className="h-10 border-green-200 text-green-600 hover:bg-green-50"
                  />
                  <Button
                   onClick={() => setShowAIWizard(true)}
                   className="h-10 bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md px-4"
                  >
                   <Plus className="w-4 h-4 mr-2" />
                   {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                  </Button>
                  <Button
                   onClick={() => setShowForm(true)}
                   variant="outline"
                   className="h-10 border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 px-4"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">{language === 'es' ? 'Creación Rápida' : 'Quick Create'}</span>
                  <span className="sm:hidden">{language === 'es' ? 'Rápido' : 'Quick'}</span>
                </Button>
              </div>
            )
          }
        />

        <div className="mb-4 flex items-center gap-3">
          <div className="flex-1">
            <FilterBar
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              statusOptions={[
                { value: 'active', label: t('active'), dotClass: 'bg-blue-500' },
                { value: 'completed', label: t('completed'), dotClass: 'bg-green-500' },
                { value: 'archived', label: t('archived'), dotClass: 'bg-slate-500' }
              ]}
              teamFilter={teamFilter}
              onTeamChange={setTeamFilter}
              teams={teams}
              onClearFilters={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTeamFilter('all');
              }}
              language={language}
            />
          </div>
          <ViewModeToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        <div className="mb-4">
          <SavedFilters
            page="jobs"
            currentFilters={{ searchTerm, statusFilter, teamFilter }}
            onApplyFilter={(filters) => {
              if (filters.searchTerm) setSearchTerm(filters.searchTerm);
              if (filters.statusFilter) setStatusFilter(filters.statusFilter);
              if (filters.teamFilter) setTeamFilter(filters.teamFilter);
            }}
            user={user}
          />
        </div>

        {viewMode === 'grid' ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              {filteredJobs.map(job => (
                <ModernJobCard key={job.id} job={job} onEdit={handleEdit} />
              ))}
            </div>
            <PaginationControls
              page={page}
              hasMore={hasMore}
              hasPrevious={hasPrevious}
              onNext={nextPage}
              onPrevious={prevPage}
              isLoading={isLoading}
              language={language}
            />
          </>
        ) : (
          <>
            <CompactListView
              items={filteredJobs}
              entityType="job"
              user={user}
              getTitle={(job) => job.name || job.job_name_field}
              getSubtitle={(job) => job.customer_name}
              getBadges={(job) => (
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  job.status === 'active' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                  job.status === 'completed' ? 'bg-green-50 text-green-700 border border-green-200' :
                  'bg-slate-50 text-slate-700 border border-slate-200'
                }`}>
                  {job.status}
                </span>
              )}
              getAmount={(job) => job.contract_amount ? `$${job.contract_amount.toLocaleString()}` : null}
              onItemClick={(job) => navigate(createPageUrl(`JobDetails?id=${job.id}`))}
            />
            <PaginationControls
              page={page}
              hasMore={hasMore}
              hasPrevious={hasPrevious}
              onNext={nextPage}
              onPrevious={prevPage}
              isLoading={isLoading}
              language={language}
            />
          </>
        )}

        {filteredJobs.length === 0 && !isLoading && (
          <Card className="bg-white/90 dark:bg-[#282828] backdrop-blur-sm shadow-lg border-slate-200 dark:border-slate-700">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {jobs.length === 0 ? t('noJobs') : (language === 'es' ? 'No se encontraron trabajos' : 'No jobs found')}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                {jobs.length === 0
                  ? t('startByAddingJob')
                  : (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
                }
              </p>
              {isAdmin && jobs.length === 0 && ( // Only show create buttons if there are truly no jobs at all
                <div className="flex flex-col sm:flex-row justify-center gap-3 w-full sm:w-auto px-4 sm:px-0">
                  <Button
                    onClick={() => setShowAIWizard(true)}
                    className="bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] hover:from-[#507DB4]/90 hover:to-[#6B9DD8]/90 text-white shadow-md min-h-[48px] w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                  </Button>
                  <Button onClick={() => setShowForm(true)} variant="outline" className="border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 min-h-[48px] w-full sm:w-auto">
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    {t('createJob')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Wizard Dialog */}
        <Dialog open={showAIWizard} onOpenChange={setShowAIWizard}>
          <DialogContent className="max-w-4xl bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-[#507DB4]" />
                {language === 'es' ? 'Crear Proyecto con Asistente IA' : 'Create Project with AI Assistant'}
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <AIJobWizard
                onComplete={handleWizardComplete}
                onCancel={() => setShowAIWizard(false)}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Regular Form Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-[#282828] border-slate-200 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 dark:text-white">{editingJob ? t('editJob') : t('newJob')}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <JobForm
                job={editingJob}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingJob(null);
                }}
                isProcessing={createMutation.isPending || updateMutation.isPending || deleteMutation.isPending || archiveMutation.isPending}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}