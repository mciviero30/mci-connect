import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  Plus, 
  Search, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  CheckCheck,
  Briefcase,
  AlertCircle,
  FolderOpen,
  Command,
  ClipboardList,
  FileText
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

export default function Field() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('active');
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', address: '' });
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [activeTab, setActiveTab] = useState('projects');
  
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
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch job assignments for restricted users
  const { data: userAssignments = [] } = useQuery({
    queryKey: ['user-job-assignments', user?.email],
    queryFn: () => base44.entities.JobAssignment.filter({ employee_email: user.email }),
    enabled: !!user?.email && (user?.role === 'customer' || user?.role === 'field_worker'),
  });

  // ADMIN BYPASS: Admins see ALL jobs, others see assigned jobs only
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['field-jobs'],
    queryFn: async () => {
      console.log('🔍 Field: Fetching jobs for user:', user?.email, 'role:', user?.role);
      
      // ✅ ADMIN BYPASS - Show all jobs for admins
      if (user?.role === 'admin' || user?.position === 'CEO' || user?.position === 'administrator') {
        const allJobs = await base44.entities.Job.list('-created_date');
        console.log('✅ Admin access: Showing', allJobs.length, 'total jobs');
        return allJobs;
      }
      
      // Managers see all jobs
      if (user?.position === 'manager') {
        return base44.entities.Job.list('-created_date');
      }
      
      // Customers and field workers see only assigned jobs
      if (user?.role === 'customer' || user?.role === 'field_worker') {
        const assignedJobIds = [...new Set(userAssignments.map(a => a.job_id))];
        if (assignedJobIds.length === 0) return [];
        
        const assignedJobs = await Promise.all(
          assignedJobIds.map(jobId => base44.entities.Job.filter({ id: jobId }))
        );
        return assignedJobs.flat();
      }
      
      // Default: all jobs
      return base44.entities.Job.list('-created_date');
    },
    enabled: !!user,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
  });

  const createJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['field-jobs'] });
      setShowNewProject(false);
      setNewProject({ name: '', description: '', address: '' });
    },
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
    createJobMutation.mutate({
      name: newProject.name,
      description: newProject.description,
      address: newProject.address,
      status: 'active',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 pb-safe overflow-y-auto">
      <div className="px-3 sm:px-6 md:px-10 py-4 sm:py-5 md:py-6 -mx-3 sm:-mx-4 md:-mx-6 -mt-3 sm:-mt-4 md:-mt-6 mb-4 sm:mb-5 md:mb-6 flex flex-col sm:flex-row items-center justify-between text-white gap-3 sm:gap-0" style={{ background: 'linear-gradient(to right, #000000 0%, #000000 35%, #4a4a4a 100%)' }}>
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/62c6ebd3e_Gemini_Generated_Image_r5bq71r5bq71r5bq.png"
          alt="MCI Field"
          className="h-12 sm:h-16 md:h-20 object-contain"
          style={{ 
            imageRendering: 'crisp-edges',
            imageRendering: '-webkit-optimize-contrast',
            imageRendering: 'high-quality'
          }}
        />
        <div className="text-center sm:text-right">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-wide text-slate-300" style={{ letterSpacing: '0.05em' }}>DASHBOARD</h1>
          <p className="text-slate-300 text-xs sm:text-sm mt-0.5 sm:mt-1">Central management for construction projects</p>
        </div>
      </div>
      <div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <button
            onClick={() => setShowQuickSearch(true)}
            className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors min-h-[44px]"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Quick Search</span>
            <kbd className="hidden md:flex items-center gap-0.5 px-1.5 py-0.5 bg-black rounded text-[10px] font-medium">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
          {user?.role !== 'customer' && (
            <Button 
              onClick={() => setShowNewProject(true)}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg min-h-[44px] text-sm sm:text-base px-4 sm:px-5 w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="bg-slate-800 dark:bg-slate-800/50 border border-slate-700 dark:border-slate-700">
          <TabsTrigger value="projects" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
            <Briefcase className="w-4 h-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="dimensions" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
            <FileText className="w-4 h-4 mr-2" />
            Field Dimensions
          </TabsTrigger>
          <TabsTrigger value="checklists" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-yellow-500 data-[state=active]:text-white">
            <ClipboardList className="w-4 h-4 mr-2" />
            Checklists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold text-white">My Projects</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 w-64"
              />
            </div>
            <div className="flex bg-black rounded-lg p-1">
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === 'active' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  filter === 'all' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-[#FFB800] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredJobs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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

    {/* Quick Search Dialog */}
      <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />

      {/* New Project Dialog */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label className="text-slate-600 dark:text-slate-300">Project Name</Label>
              <Input 
                value={newProject.name}
                onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                placeholder="e.g., Northwestern Mutual Tower"
                className="mt-1.5 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
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
                disabled={!newProject.name || createJobMutation.isPending}
                className="soft-amber-gradient"
              >
                {createJobMutation.isPending ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatsCard({ label, value, icon: Icon, color }) {
  const colorClasses = {
    orange: 'from-orange-500/20 to-orange-600/20 border-orange-500/30',
    yellow: 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30',
  };

  const iconColors = {
    orange: 'bg-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
  };

  return (
    <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] sm:text-xs font-bold text-white uppercase tracking-wider">{label}</p>
          <p className="text-xl sm:text-2xl md:text-3xl font-bold text-white mt-1 sm:mt-2">{value}</p>
        </div>
        <div className="p-2 sm:p-2.5 md:p-3 rounded-full bg-white">
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-black" />
        </div>
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
        <div className="bg-[#1e293b] border border-slate-700/50 rounded-xl p-5 hover:bg-slate-700/50 transition-all cursor-pointer group shadow-lg">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-[#FFB800]/20 rounded-lg">
              <FolderOpen className="w-5 h-5 text-[#FFB800]" />
            </div>
            <Badge className={statusColors[job.status] || statusColors.active}>
              {job.status === 'active' ? 'Active' : 
               job.status === 'completed' ? 'Completed' : 
               job.status === 'on_hold' ? 'On Hold' : 'Archived'}
            </Badge>
          </div>
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors mb-1">
            {jobName}
          </h3>
          <p className="text-sm text-slate-400 line-clamp-1">
            {job.address || job.description || 'No address'}
          </p>
          {/* Hide sensitive data for customers */}
          {!isCustomer && job.client_name_field && (
            <p className="text-xs text-slate-500 mt-2">
              Client: {job.client_name_field}
            </p>
          )}
          {!isCustomer && job.contract_amount && (
            <p className="text-xs text-slate-500 mt-1">
              Budget: ${job.contract_amount.toLocaleString()}
            </p>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

function EmptyState({ onCreateProject }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-2xl p-12 text-center shadow-sm">
      <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-orange-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">No projects assigned</h3>
      <p className="text-slate-400 mb-6">
        Start by creating your first project or request access to an existing one
      </p>
      <Button 
        onClick={onCreateProject}
        className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white"
      >
        <Plus className="w-4 h-4 mr-2" />
        Create Project
      </Button>
    </div>
  );
}