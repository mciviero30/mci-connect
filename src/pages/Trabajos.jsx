import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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



export default function Trabajos() {
  const { t, language } = useLanguage();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [showAIWizard, setShowAIWizard] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [teamFilter, setTeamFilter] = useState('all');

  const { data: user } = useQuery({ 
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
  
  // Direct jobs list - ONLY authorized jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['jobs', statusFilter, teamFilter],
    queryFn: async () => {
      const filters = {};
      if (statusFilter !== 'all') filters.status = statusFilter;
      if (teamFilter !== 'all') filters.team_id = teamFilter;
      
      // Fetch all matching jobs
      let allJobs = [];
      if (Object.keys(filters).length > 0) {
        allJobs = await base44.entities.Job.filter(filters, '-created_date');
      } else {
        allJobs = await base44.entities.Job.list('-created_date');
      }
      
      // ENFORCEMENT: Only show jobs with authorization_id (operational jobs)
      return allJobs.filter(job => job.authorization_id);
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: [],
    staleTime: 600000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });

  // Fetch all time entries for validation
  const { data: allTimeEntries = [] } = useQuery({
    queryKey: ['allTimeEntries'],
    queryFn: () => base44.entities.TimeEntry.list('-date', 1000), // Assuming 1000 is a sufficient limit for validation
    initialData: [],
    staleTime: 300000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });



  const createMutation = useMutation({
    mutationFn: async (data) => {
      console.log('Creating job:', data);
      const createdJob = await base44.entities.Job.create(data);
      return createdJob;
    },
    onSuccess: (createdJob) => {
      console.log('Job created successfully:', createdJob.id);
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setShowAIWizard(false);
      setEditingJob(null);
      toast({
        title: t('jobCreated'),
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error creating job:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      // VALIDATION: If changing status to completed/archived, check for pending time entries
      // Ensure the status is actually changing to avoid unnecessary checks and errors if already completed/archived
      if ((data.status === 'completed' || data.status === 'archived') && data.status !== editingJob?.status) {
        const jobTimeEntries = allTimeEntries.filter(entry => entry.job_id === id);
        const pendingEntries = jobTimeEntries.filter(entry => entry.status === 'pending');

        if (pendingEntries.length > 0) {
          throw new Error(
            `Cannot close job: ${pendingEntries.length} time entries are still pending approval. ` +
            `Please approve or reject all time entries before closing this job.`
          );
        }
      }

      console.log('Updating job:', id, data);
      return base44.entities.Job.update(id, data);
    },
    onSuccess: () => {
      console.log('Job updated successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false); // Changed from setShowDialog to setShowForm for consistency
      setEditingJob(null);
      toast({
        title: t('jobUpdated'),
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

  const deleteMutation = useMutation({
    mutationFn: (id) => {
      console.log('Deleting job:', id);
      return base44.entities.Job.delete(id);
    },
    onSuccess: () => {
      console.log('Job deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: language === 'es' ? 'Trabajo eliminado' : 'Job deleted',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error deleting job:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => {
      console.log('Archiving job:', id);
      // For archive, we could also implement similar validation if needed,
      // but for now, the prompt only specified it for the general updateMutation.
      return base44.entities.Job.update(id, { status: 'archived' });
    },
    onSuccess: () => {
      console.log('Job archived successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast({
        title: language === 'es' ? 'Trabajo archivado' : 'Job archived',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error archiving job:', error);
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
                  className="border-green-200 text-green-600 hover:bg-green-50 min-h-[44px]"
                />
                <Button
                  onClick={() => setShowAIWizard(true)}
                  className="bg-gradient-to-r from-[#1E3A8A] to-[#3B82F6] hover:from-[#1E3A8A]/90 hover:to-[#3B82F6]/90 text-white shadow-md min-h-[44px] sm:min-h-[48px] text-sm sm:text-base px-4 sm:px-5"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  className="border-[#507DB4]/30 dark:border-[#507DB4]/40 text-[#507DB4] dark:text-[#6B9DD8] hover:bg-blue-50/30 dark:hover:bg-blue-900/10 min-h-[44px] sm:min-h-[48px] text-sm sm:text-base px-4 sm:px-5"
                >
                  <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">{language === 'es' ? 'Creación Rápida' : 'Quick Create'}</span>
                  <span className="sm:hidden">{language === 'es' ? 'Rápido' : 'Quick'}</span>
                </Button>
              </div>
            )
          }
        />

        {/* Filter Bar */}
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
          {filteredJobs.map(job => (
            <ModernJobCard key={job.id} job={job} onEdit={handleEdit} />
          ))}
        </div>

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