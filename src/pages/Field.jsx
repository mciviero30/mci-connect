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
    <div className="min-h-screen bg-[#1a1a1a] px-3 md:px-6 py-0">
      <div className="w-screen -mx-3 md:-mx-6 px-4 md:px-10 py-3 md:py-4 mb-3 md:mb-4 flex items-center justify-between" style={{ background: 'linear-gradient(to right, #FFB800 0%, #FF8C00 100%)' }}>
        <svg className="w-20 h-10 md:w-32 md:h-14" viewBox="0 0 140 60" xmlns="http://www.w3.org/2000/svg">
          <text x="10" y="35" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="800" fill="#000000" letterSpacing="2">MCI</text>
          <text x="10" y="52" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="600" fill="#000000" letterSpacing="1">FIELD</text>
        </svg>
        <div className="text-right">
          <h1 className="text-xl md:text-4xl font-bold tracking-wide text-black">DASHBOARD</h1>
          <p className="text-black/70 text-[10px] md:text-sm mt-0.5 md:mt-1 hidden sm:block">Central management for construction projects</p>
        </div>
      </div>
      <div className="pt-1 md:pt-2">
        <div className="flex items-center gap-2 md:gap-3 w-full">
          <button
            onClick={() => setShowQuickSearch(true)}
            className="flex items-center gap-2 px-2 md:px-3 py-1.5 md:py-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="text-xs md:text-sm hidden sm:inline">Quick Search</span>
            <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-black rounded text-[10px] font-medium">
              <Command className="w-3 h-3" />K
            </kbd>
          </button>
          {user?.role !== 'customer' && (
            <Button 
              onClick={() => setShowNewProject(true)}
              className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg text-xs md:text-sm px-3 md:px-4"
            >
              <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              <span className="hidden sm:inline">New Project</span>
              <span className="sm:hidden">New</span>
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-8">
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

        <TabsContent value="projects" className="mt-3 md:mt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-4 mb-3 md:mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-white">My Projects</h2>
          <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-initial">
              <Search className="absolute left-2 md:left-3 top-1/2 -translate-y-1/2 w-3 h-3 md:w-4 md:h-4 text-slate-400" />
              <Input 
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 md:pl-9 bg-slate-800 border-slate-700 text-white placeholder:text-slate-400 w-full md:w-48 lg:w-64 text-sm h-9"
              />
            </div>
            <div className="flex bg-black rounded-lg p-0.5 md:p-1 flex-shrink-0">
              <button
                onClick={() => setFilter('active')}
                className={`px-2 md:px-4 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${
                  filter === 'active' 
                    ? 'bg-slate-700 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-2 md:px-4 py-1 md:py-1.5 rounded-md text-xs md:text-sm font-medium transition-all ${
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
    <div className="bg-[#2a2a2a] border border-slate-700/50 rounded-lg md:rounded-xl p-3 md:p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[9px] md:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-2xl md:text-4xl font-black text-[#FFB800] mt-1 md:mt-2">{value}</p>
        </div>
        <div className="p-2 md:p-3 rounded-full bg-slate-700/50 flex-shrink-0">
          <Icon className="w-4 h-4 md:w-6 md:h-6 text-white" />
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
        <div className="bg-[#3a4556] border-2 border-orange-500 rounded-lg md:rounded-xl p-3 md:p-5 hover:border-orange-400 transition-all cursor-pointer group shadow-lg">
          <div className="flex items-start justify-between mb-2 md:mb-3">
            <div className="p-1.5 md:p-2 bg-[#FFB800]/20 rounded-lg">
              <FolderOpen className="w-4 h-4 md:w-5 md:h-5 text-[#FFB800]" />
            </div>
            <Badge className={`${statusColors[job.status] || statusColors.active} text-[10px] md:text-xs px-1.5 md:px-2`}>
              {job.status === 'active' ? 'Active' : 
               job.status === 'completed' ? 'Completed' : 
               job.status === 'on_hold' ? 'On Hold' : 'Archived'}
            </Badge>
          </div>
          <h3 className="font-semibold text-white group-hover:text-orange-400 transition-colors mb-1 text-sm md:text-base">
            {jobName}
          </h3>
          <p className="text-xs md:text-sm text-slate-400 line-clamp-1">
            {job.address || job.description || 'No address'}
          </p>
          {/* Hide sensitive data for customers */}
          {!isCustomer && job.client_name_field && (
            <p className="text-[10px] md:text-xs text-slate-500 mt-1.5 md:mt-2">
              Client: {job.client_name_field}
            </p>
          )}
          {!isCustomer && job.contract_amount && (
            <p className="text-[10px] md:text-xs text-slate-500 mt-0.5 md:mt-1">
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
    <div className="bg-[#3a4556] border-2 border-orange-500 rounded-2xl p-12 text-center shadow-lg">
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