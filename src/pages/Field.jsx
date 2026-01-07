import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUI } from '@/components/contexts/FieldModeContext';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  CheckCheck,
  Briefcase,
  FolderOpen,
  Command,
  ClipboardList,
  FileText,
  ArrowLeft,
  MapPin
} from 'lucide-react';
import QuickSearchDialog from '@/components/field/QuickSearchDialog.jsx';
import GlobalChecklistsManager from '@/components/field/GlobalChecklistsManager.jsx';
import FieldDimensionView from '@/components/field/FieldDimensionView';
import FieldBottomActionRail from '@/components/field/FieldBottomActionRail';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { usePersistentState } from '@/components/field/hooks/usePersistentState';
import { FIELD_STABLE_QUERY_CONFIG } from '@/components/field/config/fieldQueryConfig';
import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';

export default function Field() {
  const { setIsFieldMode } = useUI();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Persistent filter state
  const [filter, setFilter, clearFilter] = usePersistentState('field_filter', 'active', { expiryHours: 48 });

  // CRITICAL: Set Field Mode on mount, clear on unmount
  useEffect(() => {
    setIsFieldMode(true);
    
    return () => {
      setIsFieldMode(false);
    };
  }, [setIsFieldMode]);
  
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
  
  const queryClient = useQueryClient();

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

  const handleCreateProject = () => {
    if (!newProject.name || !newProject.customer_name) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in Project Name and Customer Name',
        variant: 'destructive'
      });
      return;
    }
    
    createJobMutation.mutate({
      name: newProject.name,
      customer_name: newProject.customer_name,
      description: newProject.description,
      address: newProject.address,
      status: 'active',
    });
  };

  return (
    <FieldErrorBoundary>
    <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 pb-20 md:pb-0 overflow-y-auto">
      <div className="px-3 sm:px-4 md:px-6 pt-0 pb-3 sm:py-4 md:py-6">
      {/* Header - One-Hand Mode: Simplified, no top actions */}
      <div className="px-3 sm:px-6 md:px-10 py-5 sm:py-6 md:py-8 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 mb-5 sm:mb-6 md:mb-8 flex flex-col items-center justify-center text-white gap-2 relative" style={{ background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)' }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/62c6ebd3e_Gemini_Generated_Image_r5bq71r5bq71r5bq.png"
          alt="MCI Field"
          className="h-12 sm:h-16 md:h-20 object-contain"
          style={{ 
            imageRendering: '-webkit-optimize-contrast'
          }}
        />
        <div className="text-center">
          <h1 className="text-xl sm:text-3xl md:text-4xl font-bold tracking-wide text-white" style={{ letterSpacing: '0.05em' }}>FIELD DASHBOARD</h1>
        </div>
      </div>
      {/* One-Hand Mode: Bottom actions only, no top search */}

      {/* Stats Cards - Enhanced spacing */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatsCard 
          label="ACTIVE PROJECTS"
          value={activeProjects}
          icon={TrendingUp}
          color="orange"
        />
        <StatsCard 
          label="COMPLETED PROJECTS"
          value={completedProjects}
          icon={CheckCircle2}
          color="yellow"
        />
        <StatsCard 
          label="TASKS IN PROGRESS"
          value={tasksInProgress}
          icon={Clock}
          color="orange"
        />
        <StatsCard 
          label="COMPLETED TASKS"
          value={tasksCompleted}
          icon={CheckCheck}
          color="yellow"
        />
      </div>

      {/* Tabs - One-Hand Mode: Bottom-aligned on mobile */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-slate-800 dark:bg-slate-800/50 border border-slate-700 dark:border-slate-700 w-full grid grid-cols-3 gap-1 p-1 rounded-xl">
          <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white text-slate-300 text-xs md:text-sm min-h-[52px] rounded-lg touch-manipulation transition-all active:scale-95">
            <Briefcase className="w-5 h-5 md:mr-2" />
            <span className="hidden sm:inline">Projects</span>
          </TabsTrigger>
          <TabsTrigger value="dimensions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white text-slate-300 text-xs md:text-sm min-h-[52px] rounded-lg touch-manipulation transition-all active:scale-95">
            <FileText className="w-5 h-5 md:mr-2" />
            <span className="hidden sm:inline">Dimensions</span>
          </TabsTrigger>
          <TabsTrigger value="checklists" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white text-slate-300 text-xs md:text-sm min-h-[52px] rounded-lg touch-manipulation transition-all active:scale-95">
            <ClipboardList className="w-5 h-5 md:mr-2" />
            <span className="hidden sm:inline">Checklists</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6 pb-24">
          {/* One-Hand Mode: No top search/filter - moved to bottom FAB */}
          <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Projects</h2>

          {/* Projects Grid - Improved spacing */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FFB800] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job, idx) => (
              <ProjectCard key={job.id} job={job} index={idx} userRole={user?.role} />
            ))}
          </div>
        ) : (
          <EmptyState onCreateProject={() => setShowNewProject(true)} />
        )}
      </TabsContent>

      <TabsContent value="dimensions" className="mt-6">
        <FieldDimensionView jobId={null} />
      </TabsContent>

      <TabsContent value="checklists" className="mt-6">
        <GlobalChecklistsManager />
      </TabsContent>
    </Tabs>

    {/* One-Hand Mode: Simplified Bottom Bar - Essential navigation only */}
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[55] bg-slate-900 border-t-2 border-slate-700 shadow-2xl pb-safe">
      <div className="px-3 py-3">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => setShowQuickSearch(true)}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 bg-slate-800 border border-slate-600 rounded-xl text-slate-300 active:bg-slate-700 transition-all min-h-[56px] shadow-md touch-manipulation active:scale-95 font-semibold"
          >
            <Search className="w-5 h-5" />
            <span>Search</span>
          </button>
          {user?.role !== 'customer' && (
            <Button 
              onClick={() => setShowNewProject(true)}
              className="flex-1 bg-gradient-to-r from-orange-600 to-yellow-500 active:from-orange-700 active:to-yellow-600 text-black shadow-lg min-h-[56px] rounded-xl touch-manipulation active:scale-95 transition-transform font-bold"
            >
              <Plus className="w-5 h-5 mr-2" />
              Project
            </Button>
          )}
        </div>

        {/* Filter Toggle - Conditional display */}
        {activeTab === 'projects' && (
          <div className="flex bg-black rounded-xl p-1 shadow-md mb-2">
            <button
              onClick={() => setFilter('active')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all min-h-[52px] touch-manipulation active:scale-95 ${
                filter === 'active' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 px-4 py-3 rounded-lg text-sm font-bold transition-all min-h-[52px] touch-manipulation active:scale-95 ${
                filter === 'all' 
                  ? 'bg-slate-700 text-white shadow-sm' 
                  : 'text-slate-400'
              }`}
            >
              All
            </button>
          </div>
        )}

        {/* Back Navigation */}
        <Link to={createPageUrl('Dashboard')}>
          <Button variant="ghost" className="w-full text-slate-400 hover:text-white min-h-[52px] touch-manipulation active:scale-95 font-medium">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Dashboard
          </Button>
        </Link>
      </div>
    </div>

    {/* Quick Search Dialog */}
    <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />

    {/* Bottom Action Rail - Persistent for quick actions */}
    <FieldBottomActionRail 
      jobId={null}
      jobName="Field Dashboard"
      onActionComplete={(panel) => {
        if (panel === 'dimensions') {
          setActiveTab('dimensions');
        }
      }}
    />

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
                className="soft-amber-gradient"
              >
                {createJobMutation.isPending ? 'Creating...' : 'Create Project'}
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

function StatsCard({ label, value, icon, color }) {
  const Icon = icon;
  return (
    <div className="bg-[#1e293b] border border-slate-700/50 rounded-xl p-3 md:p-4 shadow-lg hover:shadow-xl transition-shadow">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <p className="text-2xl md:text-3xl font-bold text-white leading-tight">{value}</p>
          <div className="p-2 rounded-xl bg-white shadow-sm">
            <Icon className="w-4 h-4 md:w-5 md:h-5 text-black" />
          </div>
        </div>
        <p className="text-[9px] md:text-xs font-bold text-slate-300 uppercase tracking-wider leading-tight">
          {label.split(' ').map((word, i) => (
            <span key={i}>
              {word}
              {i < label.split(' ').length - 1 && <br className="md:hidden" />}
              {i < label.split(' ').length - 1 && ' '}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}

function ProjectCard({ job, index, userRole }) {
  const jobName = job.name || job.job_name_field || 'Untitled';
  const statusColors = {
    active: 'bg-green-500/20 text-green-400 border-green-500/30',
    completed: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    archived: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  };

  const isCustomer = userRole === 'customer';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link to={createPageUrl(`FieldProject?id=${job.id}`)}>
        <div className="bg-[#1e293b] border border-slate-700/50 rounded-xl p-5 hover:bg-slate-700/50 hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer group shadow-lg touch-manipulation">
          <div className="flex items-start justify-between mb-4">
            <div className="p-2.5 bg-gradient-to-br from-[#FFB800]/20 to-[#FF8C00]/20 rounded-xl shadow-sm">
              <FolderOpen className="w-5 h-5 text-[#FFB800]" />
            </div>
            <Badge className={`${statusColors[job.status] || statusColors.active} px-2.5 py-1 rounded-full text-xs font-bold`}>
              {job.status === 'active' ? 'Active' : 
               job.status === 'completed' ? 'Completed' : 
               job.status === 'on_hold' ? 'On Hold' : 'Archived'}
            </Badge>
          </div>
          <h3 className="text-base font-bold text-white group-hover:text-[#FFB800] transition-colors mb-2 line-clamp-2 leading-snug">
            {jobName}
          </h3>
          <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">
            {job.address || job.description || 'No address'}
          </p>
          {/* Hide sensitive data for customers */}
          {!isCustomer && job.client_name_field && (
            <p className="text-xs text-slate-500 mt-3 pt-3 border-t border-slate-700/50">
              Client: <span className="text-slate-400">{job.client_name_field}</span>
            </p>
          )}
          {!isCustomer && job.contract_amount && (
            <p className="text-xs text-slate-500 mt-1.5">
              Budget: <span className="text-[#FFB800] font-semibold">${job.contract_amount.toLocaleString()}</span>
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState({ onCreateProject }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-12 text-center shadow-lg">
      <div className="w-20 h-20 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <FolderOpen className="w-10 h-10 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No projects assigned</h3>
      <p className="text-slate-300 mb-6 max-w-md mx-auto">
        Start by creating your first project or request access to an existing one
      </p>
      <Button 
        onClick={onCreateProject}
        className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg min-h-[48px] px-6 rounded-xl"
      >
        <Plus className="w-5 h-5 mr-2" />
        Create Project
      </Button>
    </div>
  );
}