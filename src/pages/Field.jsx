import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUI } from '@/components/contexts/FieldModeContext';
import { 
  Plus, 
  Search, 
  Briefcase,
  ClipboardList,
  ArrowLeft,
  MapPin,
  RotateCcw
} from 'lucide-react';
import QuickSearchDialog from '@/components/field/QuickSearchDialog.jsx';
import GlobalChecklistsManager from '@/components/field/GlobalChecklistsManager.jsx';
import FieldDimensionView from '@/components/field/FieldDimensionView';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { usePersistentState } from '@/components/field/hooks/usePersistentState';
import { FIELD_STABLE_QUERY_CONFIG } from '@/components/field/config/fieldQueryConfig';
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';
import { useFieldDebugMode } from '@/components/field/hooks/useFieldDebugMode';
import { FieldSessionManager } from '@/components/field/services/FieldSessionManager';
import FieldReentryPrompt from '@/components/field/FieldReentryPrompt';
import { useLanguage } from '@/components/i18n/LanguageContext';
import { SkeletonFieldProject } from '@/components/shared/SkeletonComponents';
import { ExitConfirmation, useExitConfirmation } from '@/components/feedback/ExitConfirmation';

export default function Field() {
  const { setIsFieldMode } = useUI();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showReentryPrompt, setShowReentryPrompt] = useState(false);
  const [previousSession, setPreviousSession] = useState(null);
  
  // Persistent filter state
  const [filter, setFilter, clearFilter] = usePersistentState('field_filter', 'active', { expiryHours: 48 });

  // CRITICAL: Set Field Mode on mount, clear on unmount
  useEffect(() => {
    setIsFieldMode(true);
    
    return () => {
      setIsFieldMode(false);
    };
  }, [setIsFieldMode]);

  // Check for previous Field session on mount
  useEffect(() => {
    const checkPreviousSession = () => {
      try {
        const session = FieldSessionManager.getSession();
        
        // Only show re-entry if session exists and is active
        if (session && session.isActive && session.jobId) {
          setPreviousSession(session);
          setShowReentryPrompt(true);
        }
      } catch (error) {
        console.error('Failed to check previous session:', error);
      }
    };

    checkPreviousSession();
  }, []);
  
  const [showNewProject, setShowNewProject] = useState(false);
  
  // Persistent new project form
  const [newProject, setNewProject, clearNewProject] = usePersistentState(
    'field_new_project',
    { name: '', description: '', address: '', customer_name: '', customer_id: '' },
    { expiryHours: 2 }
  );
  
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  
  // Persistent active tab
  const [activeTab, setActiveTab, clearActiveTab] = usePersistentState('field_active_tab', 'projects', { expiryHours: 48 });
  
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomer, setQuickCustomer] = useState({ first_name: '', last_name: '', company: '', email: '', phone: '' });
  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  
  const queryClient = useQueryClient();

  // Handle resume session
  const handleResumeSession = () => {
    if (!previousSession || !previousSession.jobId) return;
    
    // Build restoration URL
    const params = new URLSearchParams({
      id: previousSession.jobId,
      panel: previousSession.context?.activePanel || 'overview',
    });

    if (previousSession.context?.selectedPlanId) {
      params.append('plan', previousSession.context.selectedPlanId);
    }

    setShowReentryPrompt(false);
    
    // Navigate with full context restoration
    navigate(`${createPageUrl('FieldProject')}?${params.toString()}`);
  };

  // Handle start fresh
  const handleStartFresh = () => {
    // Clear ONLY visual state, keep data intact
    if (previousSession) {
      FieldSessionManager.updateSession({
        context: {
          activePanel: 'overview',
          scrollPositions: {},
          openModals: [],
          currentArea: null,
          currentMode: null,
          selectedPlanId: null,
        },
        activeIntent: null,
      });
    }
    
    setShowReentryPrompt(false);
    setPreviousSession(null);
  };

  // Global keyboard shortcut for quick search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowQuickSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const { data: user } = useQuery({
    queryKey: FIELD_QUERY_KEYS.USER(),
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Debug mode detection
  const isDebugMode = useFieldDebugMode(user);

  const { data: customers = [] } = useQuery({
    queryKey: FIELD_QUERY_KEYS.CUSTOMERS(),
    queryFn: () => base44.entities.Customer.list('first_name'),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: userAssignments = [] } = useQuery({
    queryKey: ['field-user-assignments', user?.email],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: user.email }),
    enabled: !!user?.email && (user?.role === 'customer' || user?.role === 'field_worker'),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: FIELD_QUERY_KEYS.JOBS(),
    queryFn: async () => {
      if (user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'administrator') {
        return await base44.entities.Job.list('-created_date');
      }
      
      if (user?.position === 'manager') {
        return base44.entities.Job.list('-created_date');
      }
      
      if (user?.role === 'customer' || user?.role === 'field_worker') {
        const assignedJobIds = [...new Set(userAssignments.map(a => a.job_id))];
        if (assignedJobIds.length === 0) return [];
        
        const assignedJobs = await Promise.all(
          assignedJobIds.map(jobId => base44.entities.Job.filter({ id: jobId }))
        );
        return assignedJobs.flat();
      }
      
      return base44.entities.Job.list('-created_date');
    },
    enabled: !!user,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-all-tasks', jobs.map(j => j.id).join(',')],
    queryFn: async () => {
      if (jobs.length === 0) return [];
      
      const jobIds = jobs.map(j => j.id);
      const allTasks = await base44.entities.Task.list('-created_date');
      
      return allTasks.filter(task => task.job_id && jobIds.includes(task.job_id));
    },
    enabled: jobs.length > 0,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Fetch job name for re-entry prompt
  const { data: previousJob } = useQuery({
    queryKey: ['previous-field-job', previousSession?.jobId],
    queryFn: () => base44.entities.Job.filter({ id: previousSession.jobId }).then(jobs => jobs[0]),
    enabled: !!previousSession?.jobId && showReentryPrompt,
    staleTime: 300000,
  });

  const createCustomerMutation = useMutation({
    mutationFn: (data) => base44.entities.Customer.create(data),
    onSuccess: (newCustomer) => {
      // ONLY invalidate Field-scoped customer query - strict isolation
      queryClient.invalidateQueries({ 
        queryKey: FIELD_QUERY_KEYS.CUSTOMERS(), 
        exact: true,
        refetchType: 'active' 
      });
      setNewProject({
        ...newProject,
        customer_name: `${newCustomer.first_name} ${newCustomer.last_name}`,
        customer_id: newCustomer.id
      });
      setShowQuickCustomer(false);
      setQuickCustomer({ first_name: '', last_name: '', company: '', email: '', phone: '' });
      toast({
        title: 'Customer created',
        description: 'Customer created successfully',
        variant: 'success'
      });
    },
    onError: (error) => {
      toast({
        title: 'Error creating customer',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const createJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: async () => {
      // ONLY invalidate Field-scoped jobs query - strict isolation
      queryClient.invalidateQueries({ 
        queryKey: FIELD_QUERY_KEYS.JOBS(), 
        exact: true,
        refetchType: 'active'
      });
      setShowNewProject(false);
      
      // Clear persistent form on successful save
      if (clearNewProject) await clearNewProject();
      
      toast({
        title: 'Project created',
        description: 'Your project has been created successfully',
        variant: 'success'
      });
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast({
        title: 'Error creating project',
        description: error?.message || 'Failed to create project. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         job.job_name_field?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || 
                         (filter === 'active' && job.status === 'active') ||
                         (filter === 'completed' && job.status === 'completed');
    return matchesSearch && matchesFilter;
  });

  // Calculate stats
  const activeProjects = jobs.filter(j => j.status === 'active').length;
  const completedProjects = jobs.filter(j => j.status === 'completed').length;
  const tasksInProgress = tasks.filter(t => t.status === 'in_progress').length;
  const tasksCompleted = tasks.filter(t => t.status === 'completed').length;

  const handleCreateProject = async () => {
    if (!newProject.name || !newProject.customer_name) {
      toast.error('Some info is missing — add project name and customer', { duration: 2500 });
      return;
    }
    
    try {
      await createJobMutation.mutateAsync({
        name: newProject.name,
        customer_name: newProject.customer_name,
        description: newProject.description,
        address: newProject.address,
        status: 'active',
      });
      
      // Success feedback with continuity
      toast.success('Project created', { duration: 1500 });
      
      // Clear form - CONTINUITY IS CONFIRMATION
      setNewProject({ name: '', description: '', address: '', customer_name: '', customer_id: '' });
    } catch (error) {
      toast.error("Couldn't create project — try again", { duration: 2500 });
    }
  };

  return (
    <FieldErrorBoundary>
      {/* Re-entry Prompt - Smart Session Restoration */}
      {showReentryPrompt && previousSession && (
        <FieldReentryPrompt
          session={previousSession}
          jobName={previousJob?.name || (language === 'es' ? 'Proyecto activo' : 'Active project')}
          onResume={handleResumeSession}
          onStartFresh={handleStartFresh}
        />
      )}

    <div data-field-mode="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 pb-20 md:pb-0 overflow-y-auto dark">
      {/* Field Exit Control - Intelligent, Non-Blocking */}
      <Button 
        onClick={() => {
          // Check for active session
          const session = FieldSessionManager.getSession();
          if (session?.isActive || previousSession?.isActive) {
            // Show exit confirmation
            setShowExitConfirmation(true);
          } else {
            // Safe to exit immediately
            setIsFieldMode(false);
            navigate(createPageUrl('Dashboard'));
          }
        }}
        className="fixed top-4 left-4 z-[70] bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-2xl backdrop-blur-sm min-h-[44px] px-4 rounded-xl touch-manipulation"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Back to MCI Connect</span>
        <span className="sm:hidden">Back</span>
      </Button>
      
      {/* Exit Confirmation - Only if active work */}
      <ExitConfirmation
        open={showExitConfirmation}
        onOpenChange={setShowExitConfirmation}
        pendingWork={previousSession?.context ? ['Active field session'] : []}
        offlineItems={0}
        unsavedChanges={false}
        onConfirmExit={() => {
          FieldSessionManager.clearSession();
          setIsFieldMode(false);
          navigate(createPageUrl('Dashboard'));
        }}
        onStay={() => {
          setShowExitConfirmation(false);
          if (previousSession) handleResumeSession();
        }}
      />

      <div className="px-3 sm:px-4 md:px-6 pt-0 pb-3 sm:py-4 md:py-6">
      {/* HEADER - Simple, Clear Status */}
      <div className="px-3 sm:px-6 md:px-10 py-6 sm:py-8 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 mb-6 flex flex-col items-center justify-center text-white gap-3" style={{ background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)' }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/62c6ebd3e_Gemini_Generated_Image_r5bq71r5bq71r5bq.png"
          alt="MCI Field"
          className="h-16 sm:h-20 object-contain"
          style={{ imageRendering: '-webkit-optimize-contrast' }}
        />
        <div className="text-center">
          <h1 className="text-2xl sm:text-4xl font-bold tracking-wide text-white mb-1" style={{ letterSpacing: '0.05em' }}>
            MCI FIELD
          </h1>
          <p className="text-sm sm:text-base text-slate-300 font-medium">
            {activeProjects > 0 
              ? (language === 'es' ? `Tienes ${activeProjects} trabajo${activeProjects > 1 ? 's' : ''} activo${activeProjects > 1 ? 's' : ''}` : `You have ${activeProjects} active job${activeProjects > 1 ? 's' : ''}`)
              : (language === 'es' ? 'Sin trabajos activos hoy' : 'No active jobs today')
            }
          </p>
        </div>
      </div>

      {/* PRIMARY ACTION - Dominant, Unmissable */}
      {previousSession && previousSession.isActive ? (
        <Button
          onClick={handleResumeSession}
          className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold shadow-2xl min-h-[64px] rounded-xl mb-6 active:scale-[0.98] transition-all text-lg"
        >
          <RotateCcw className="w-6 h-6 mr-3" strokeWidth={2.5} />
          {language === 'es' ? 'Reanudar Trabajo de Field' : 'Resume Field Work'}
        </Button>
      ) : activeProjects > 0 ? (
        <Button
          onClick={() => {
            const firstActive = jobs.find(j => j.status === 'active');
            if (firstActive) {
              navigate(`${createPageUrl('FieldProject')}?id=${firstActive.id}`);
            }
          }}
          className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black font-bold shadow-2xl min-h-[64px] rounded-xl mb-6 active:scale-[0.98] transition-all text-lg"
        >
          <MapPin className="w-6 h-6 mr-3" strokeWidth={2.5} />
          {language === 'es' ? 'Iniciar Trabajo de Field' : 'Start Field Work'}
        </Button>
      ) : null}

      {/* TODAY'S JOBS - Max 3, Simple */}
      {filteredJobs.slice(0, 3).length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 px-1">
            {language === 'es' ? 'Trabajos de hoy' : "Today's Jobs"}
          </h2>
          <div className="space-y-3">
            {filteredJobs.slice(0, 3).map((job) => (
              <Link key={job.id} to={createPageUrl(`FieldProject?id=${job.id}`)}>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700 active:scale-[0.98] transition-all cursor-pointer shadow-md min-h-[72px]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-white truncate mb-1">
                        {job.name || job.job_name_field}
                      </h3>
                      <p className="text-xs text-slate-400 truncate">
                        {job.customer_name || job.client_name_field || 'No customer'}
                      </p>
                    </div>
                    <Badge className={`${
                      job.status === 'active' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    } border px-2.5 py-1 rounded-full text-[10px] font-bold flex-shrink-0`}>
                      {job.status === 'active' ? 'TODAY' : 'SCHEDULED'}
                    </Badge>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* QUICK SECONDARY ACTIONS - Max 2 */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button
          onClick={() => setActiveTab('checklists')}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 min-h-[56px] rounded-xl active:scale-[0.98] transition-all"
        >
          <ClipboardList className="w-5 h-5 mr-2" />
          {language === 'es' ? 'Checklists' : 'Checklists'}
        </Button>
        <Button
          onClick={() => setShowQuickSearch(true)}
          variant="outline"
          className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 min-h-[56px] rounded-xl active:scale-[0.98] transition-all"
        >
          <Search className="w-5 h-5 mr-2" />
          {language === 'es' ? 'Buscar' : 'Search'}
        </Button>
      </div>

      {/* Hidden Tabs for Navigation Only */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="hidden">
        <TabsContent value="projects" />
        <TabsContent value="dimensions">
          <FieldDimensionView jobId={null} />
        </TabsContent>
        <TabsContent value="checklists">
          <GlobalChecklistsManager />
        </TabsContent>
      </Tabs>

      {/* Show alternative views when tabs change */}
      {activeTab === 'dimensions' && (
        <div className="pb-6">
          <Button
            onClick={() => setActiveTab('projects')}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Volver' : 'Back'}
          </Button>
          <FieldDimensionView jobId={null} />
        </div>
      )}
      {activeTab === 'checklists' && (
        <div className="pb-6">
          <Button
            onClick={() => setActiveTab('projects')}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-white hover:bg-slate-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'es' ? 'Volver' : 'Back'}
          </Button>
          <GlobalChecklistsManager />
        </div>
      )}

      {/* All Jobs Link - Secondary Access */}
      {activeTab === 'projects' && filteredJobs.length > 3 && (
        <div className="text-center mb-6">
          <Button
            onClick={() => setShowQuickSearch(true)}
            variant="outline"
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <Search className="w-4 h-4 mr-2" />
            {language === 'es' ? `Ver todos los ${filteredJobs.length} trabajos` : `View all ${filteredJobs.length} jobs`}
          </Button>
        </div>
      )}

    {/* Mobile Bottom Bar - Create Project Only */}
    {user?.role !== 'customer' && activeTab === 'projects' && (
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-[55] bg-slate-900 border-t-2 border-slate-700 shadow-2xl pb-safe">
        <div className="px-3 py-3">
          <Button 
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setShowNewProject(true);
            }}
            className="w-full bg-slate-800 border-2 border-slate-600 hover:bg-slate-700 text-white shadow-lg min-h-[60px] rounded-xl touch-manipulation active:scale-95 transition-transform font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            {language === 'es' ? 'Crear Proyecto' : 'Create Project'}
          </Button>
        </div>
      </div>
    )}

    {/* Quick Search Dialog */}
    <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />

      {/* Quick Customer Dialog */}
      <Dialog open={showQuickCustomer} onOpenChange={setShowQuickCustomer}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">Quick Create Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-600 dark:text-slate-300">First Name *</Label>
                <Input 
                  value={quickCustomer.first_name}
                  onChange={(e) => setQuickCustomer({...quickCustomer, first_name: e.target.value})}
                  placeholder="John"
                  className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  autoCapitalizeInput={true}
                />
              </div>
              <div>
                <Label className="text-slate-600 dark:text-slate-300">Last Name *</Label>
                <Input 
                  value={quickCustomer.last_name}
                  onChange={(e) => setQuickCustomer({...quickCustomer, last_name: e.target.value})}
                  placeholder="Doe"
                  className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                  autoCapitalizeInput={true}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Company *</Label>
              <Input 
                value={quickCustomer.company}
                onChange={(e) => setQuickCustomer({...quickCustomer, company: e.target.value})}
                placeholder="ABC Company"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                autoCapitalizeInput={true}
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Email</Label>
              <Input 
                type="email"
                value={quickCustomer.email}
                onChange={(e) => setQuickCustomer({...quickCustomer, email: e.target.value})}
                placeholder="customer@email.com"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Phone</Label>
              <Input 
                value={quickCustomer.phone}
                onChange={(e) => setQuickCustomer({...quickCustomer, phone: e.target.value})}
                placeholder="(555) 123-4567"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowQuickCustomer(false)} className="border-slate-200 dark:border-slate-700">
                Cancel
              </Button>
              <Button 
                onClick={() => createCustomerMutation.mutate(quickCustomer)}
                disabled={!quickCustomer.first_name || !quickCustomer.last_name || !quickCustomer.company || createCustomerMutation.isPending}
                className="bg-gradient-to-r from-green-500 to-emerald-500"
              >
                {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Project Name *</Label>
              <Input 
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                placeholder="e.g., Northwestern Mutual Tower"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                required
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Customer *</Label>
              <div className="flex gap-2 mt-1.5">
                <Select
                  value={newProject.customer_name}
                  onValueChange={(value) => {
                    const customer = customers.find(c => `${c.first_name} ${c.last_name}` === value);
                    setNewProject({
                      ...newProject,
                      customer_name: value,
                      customer_id: customer?.id
                    });
                  }}
                >
                  <SelectTrigger className="flex-1 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                    {customers.map(c => (
                      <SelectItem key={c.id} value={`${c.first_name} ${c.last_name}`}>
                        {c.first_name} {c.last_name} {c.company && `- ${c.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={() => setShowQuickCustomer(true)}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Address</Label>
              <Input 
                value={newProject.address}
                onChange={(e) => setNewProject({...newProject, address: e.target.value})}
                placeholder="e.g., 123 Main St, Atlanta GA"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Description</Label>
              <Textarea 
                value={newProject.description}
                onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                placeholder="Project description..."
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowNewProject(false)} className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                Cancel
              </Button>
              <Button 
                onClick={handleCreateProject}
                disabled={!newProject.name || !newProject.customer_name || createJobMutation.isPending}
                className="soft-amber-gradient disabled:opacity-70"
              >
                {createJobMutation.isPending 
                  ? 'Creating...' 
                  : !newProject.name || !newProject.customer_name
                  ? 'Fill required fields'
                  : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
    </FieldErrorBoundary>
  );
}





function EmptyState({ onCreateProject, language }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-md">
      <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8 text-orange-400" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">
        {language === 'es' ? 'No hay proyectos hoy' : 'No projects today'}
      </h3>
      <p className="text-sm text-slate-400 mb-4">
        {language === 'es' ? 'Comienza creando tu primer proyecto' : 'Get started by creating your first project'}
      </p>
    </div>
  );
}