
import React, { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


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

  const { data: user } = useQuery({ queryKey: ['currentUser'] });
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => base44.entities.Job.list('-created_date'),
    initialData: [],
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list('team_name'),
    initialData: []
  });

  const createMutation = useMutation({
    mutationFn: (data) => {
      console.log('Creating job:', data);
      return base44.entities.Job.create(data);
    },
    onSuccess: () => {
      console.log('Job created successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setShowAIWizard(false); // Ensure AI wizard closes
      setEditingJob(null);
      toast.success(t('jobCreated'));
    },
    onError: (error) => {
      console.error('Error creating job:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => {
      console.log('Updating job:', id, data);
      return base44.entities.Job.update(id, data);
    },
    onSuccess: () => {
      console.log('Job updated successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setShowForm(false);
      setEditingJob(null);
      toast.success(t('jobUpdated'));
    },
    onError: (error) => {
      console.error('Error updating job:', error);
      toast.error(`Error: ${error.message}`);
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
      toast.success(language === 'es' ? 'Trabajo eliminado' : 'Job deleted');
    },
    onError: (error) => {
      console.error('Error deleting job:', error);
      toast.error(`Error: ${error.message}`);
    }
  });

  const archiveMutation = useMutation({
    mutationFn: (id) => {
      console.log('Archiving job:', id);
      return base44.entities.Job.update(id, { status: 'archived' });
    },
    onSuccess: () => {
      console.log('Job archived successfully');
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      toast.success(language === 'es' ? 'Trabajo archivado' : 'Job archived');
    },
    onError: (error) => {
      console.error('Error archiving job:', error);
      toast.error(`Error: ${error.message}`);
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

  const activeJobs = filteredJobs.filter(j => j.status === 'active');
  const completedJobs = filteredJobs.filter(j => j.status === 'completed');

  const statusColors = {
    draft: "bg-slate-100 text-slate-700 border-slate-200",
    sent: "bg-blue-50 text-blue-700 border-blue-200",
    approved: "bg-green-50 text-green-700 border-green-200",
    rejected: "bg-red-50 text-red-700 border-red-200",
    converted_to_invoice: "bg-purple-50 text-purple-700 border-purple-200"
  };

  const isAdmin = user?.role === 'admin';

  // NEW: Helper function to calculate profit margin color
  const getProfitMarginColor = (margin) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  // NEW: Helper function to format currency
  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="p-4 md:p-8 min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto">
        <PageHeader
          title={t('jobs')}
          description={`${activeJobs.length} ${t('active').toLowerCase()}, ${completedJobs.length} ${t('completed').toLowerCase()}`}
          icon={Briefcase}
          actions={
            isAdmin && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowAIWizard(true)}
                  size="lg"
                  className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white shadow-lg"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                </Button>
                <Button
                  onClick={() => setShowForm(true)}
                  variant="outline"
                  size="lg"
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  {language === 'es' ? 'Creación Rápida' : 'Quick Create'}
                </Button>
              </div>
            )
          }
        />

        {/* NEW: Filter Bar */}
        <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200 mb-6">
          <CardContent className="p-6">
            <div className="grid md:grid-cols-3 gap-4">
              {/* Text Search */}
              <div className="space-y-2">
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Buscar' : 'Search'}
                </Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder={language === 'es' ? 'Buscar por nombre, dirección o cliente...' : 'Search by name, address or customer...'}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-50 border-slate-200"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Estado' : 'Status'}
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all">
                      {language === 'es' ? 'Todos los Estados' : 'All Status'}
                    </SelectItem>
                    <SelectItem value="active">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        {t('active')}
                      </div>
                    </SelectItem>
                    <SelectItem value="completed">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        {t('completed')}
                      </div>
                    </SelectItem>
                    <SelectItem value="archived">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-500" />
                        {t('archived')}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Team Filter */}
              <div className="space-y-2">
                <Label className="text-slate-700 text-sm font-medium">
                  {language === 'es' ? 'Equipo' : 'Team'}
                </Label>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="all">
                      {language === 'es' ? 'Todos los Equipos' : 'All Teams'}
                    </SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          {team.team_name} - {team.location}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters button */}
            {(searchTerm || statusFilter !== 'all' || teamFilter !== 'all') && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTeamFilter('all');
                  }}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <X className="w-4 h-4 mr-2" />
                  {language === 'es' ? 'Limpiar Filtros' : 'Clear Filters'}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map(job => {
            // NEW: Calculate profit margin
            const contractAmount = job.contract_amount || 0;
            const estimatedCost = job.estimated_cost || 0;
            const profitMargin = contractAmount > 0
              ? ((contractAmount - estimatedCost) / contractAmount * 100)
              : 0;

            return (
              <Card key={job.id} className="bg-white/90 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 group border-slate-200">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-3 h-3 rounded-full bg-${job.color || 'slate'}-500`}></div>
                        <h3 className="font-bold text-xl text-slate-900">{job.name}</h3>
                      </div>

                      {/* NEW: Customer Name (from Prompt #46) */}
                      {job.customer_name && (
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <Users className="w-3 h-3" />
                          <span className="font-medium">{job.customer_name}</span>
                        </div>
                      )}

                      {/* Status and Team Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={
                          job.status === 'active' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                          job.status === 'completed' ? 'bg-green-50 border-green-200 text-green-700' :
                          'bg-slate-100 border-slate-200 text-slate-600'
                        }>
                          {job.status === 'active' ? t('active') : job.status === 'completed' ? t('completed') : t('archived')}
                        </Badge>

                        {job.team_name && (
                          <Badge className="bg-purple-50 border-purple-200 text-purple-700">
                            <MapPin className="w-3 h-3 mr-1" />
                            {job.team_name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={createPageUrl(`JobDetails?id=${job.id}`)}>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-slate-600 hover:text-[#3B9FF3] hover:bg-blue-50"
                          title={t('viewDetails')}
                        >
                          <Eye className="w-5 h-5" />
                        </Button>
                      </Link>

                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-slate-600 hover:text-slate-900 hover:bg-slate-100">
                              <MoreVertical className="w-5 h-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-white border-slate-200">
                            <DropdownMenuItem onClick={() => handleEdit(job)} className="text-slate-900 hover:bg-slate-100">
                              <Edit className="w-4 h-4 mr-2" />
                              {t('edit')}
                            </DropdownMenuItem>
                            {job.status !== 'archived' && (
                              <DropdownMenuItem onClick={() => archiveMutation.mutate(job.id)} className="text-slate-900 hover:bg-slate-100">
                                <Archive className="w-4 h-4 mr-2" />
                                {t('archive')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => deleteMutation.mutate(job.id)} className="text-slate-900 hover:bg-slate-100 focus:bg-red-50">
                              <Trash2 className="w-4 h-4 mr-2 text-red-500" />
                              <span className="text-red-500">{t('delete')}</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  <Link to={createPageUrl(`JobDetails?id=${job.id}`)}>
                    {job.description && (
                      <p className="text-slate-600 mb-4 line-clamp-2">{job.description}</p>
                    )}

                    {/* NEW: Address with structured fields */}
                    {(job.address || job.city) && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">
                          {job.address}
                          {job.city && `, ${job.city}`}
                          {job.state && `, ${job.state}`}
                          {job.zip && ` ${job.zip}`}
                        </span>
                      </div>
                    )}

                    {/* NEW: Financial KPIs Section (Prompt #46) */}
                    {job.contract_amount && (
                      <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <div className="space-y-2">
                          {/* Contract Amount */}
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600">
                              {language === 'es' ? 'Valor Contratado' : 'Contract Value'}
                            </span>
                            <span className="text-sm font-bold text-[#3B9FF3]">
                              {formatCurrency(contractAmount)}
                            </span>
                          </div>

                          {/* Estimated Cost */}
                          {estimatedCost > 0 && (
                            <>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-600">
                                  {language === 'es' ? 'Costo Estimado' : 'Estimated Cost'}
                                </span>
                                <span className="text-sm font-semibold text-slate-700">
                                  {formatCurrency(estimatedCost)}
                                </span>
                              </div>

                              {/* Profit Margin */}
                              <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                                <span className="text-xs font-medium text-slate-700">
                                  {language === 'es' ? 'Margen de Ganancia' : 'Profit Margin'}
                                </span>
                                <span className={`text-sm font-bold ${getProfitMarginColor(profitMargin)}`}>
                                  {profitMargin.toFixed(1)}%
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredJobs.length === 0 && !isLoading && (
          <Card className="bg-white/90 backdrop-blur-sm shadow-lg border-slate-200">
            <CardContent className="p-12 text-center">
              <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">
                {jobs.length === 0 ? t('noJobs') : (language === 'es' ? 'No se encontraron trabajos' : 'No jobs found')}
              </h3>
              <p className="text-slate-500 mb-6">
                {jobs.length === 0
                  ? t('startByAddingJob')
                  : (language === 'es' ? 'Intenta ajustar los filtros' : 'Try adjusting your filters')
                }
              </p>
              {isAdmin && jobs.length === 0 && ( // Only show create buttons if there are truly no jobs at all
                <div className="flex justify-center gap-4">
                  <Button
                    onClick={() => setShowAIWizard(true)}
                    className="bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {language === 'es' ? 'Crear con IA' : 'Create with AI'}
                  </Button>
                  <Button onClick={() => setShowForm(true)} variant="outline" className="bg-white border-slate-200 text-slate-700 shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createJob')}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Wizard Dialog */}
        <Dialog open={showAIWizard} onOpenChange={setShowAIWizard}>
          <DialogContent className="max-w-4xl bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-500" />
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
          <DialogContent className="max-w-2xl bg-white border-slate-200">
            <DialogHeader>
              <DialogTitle className="text-2xl text-slate-900">{editingJob ? t('editJob') : t('newJob')}</DialogTitle>
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
