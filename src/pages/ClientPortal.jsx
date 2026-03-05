import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { 
  Building2, 
  CheckCircle2, 
  Clock, 
  Camera, 
  FileText, 
  BarChart3,
  MapPin,
  Calendar,
  TrendingUp,
  AlertCircle,
  Download,
  ChevronRight,
  LogOut,
  MessageSquare,
  Activity,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import AvatarCreator from '@/components/avatar/AvatarCreator';
import ClientComments from '@/components/client/ClientComments';
import PhotoGalleryEnhanced from '@/components/client/PhotoGalleryEnhanced';
import ClientDriveViewer from '@/components/client/ClientDriveViewer';
import ProgressTimeline from '@/components/client/ProgressTimeline';
import WeeklySummary from '@/components/client/WeeklySummary';
import ClientTasksView from '@/components/client/ClientTasksView';
import JobChatView from '@/components/client/JobChatView';
import BlueprintViewer from '@/components/field/BlueprintViewer';
import DailyFieldReportView from '@/components/field/DailyFieldReportView';
import ClientApprovalsView from '@/components/client/ClientApprovalsView';

export default function ClientPortal() {
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if client_access_token is set on the job (used later for expiry warning)
  const tokenExpiryDays = (() => {
    if (!selectedJob?.client_token_expires_at) return null;
    const diff = Math.ceil((new Date(selectedJob.client_token_expires_at) - new Date()) / (1000 * 60 * 60 * 24));
    return diff;
  })();

  // Get projects where user is a client member
  const { data: memberships = [] } = useQuery({
    queryKey: ['client-memberships', user?.email],
    queryFn: () => base44.entities.ProjectMember.filter({ 
      user_email: user?.email,
      role: 'client'
    }),
    enabled: !!user?.email,
  });

  const projectIds = memberships.map(m => m.project_id);

  // CLI-I2 FIX: filter server-side instead of loading all jobs
  const { data: jobs = [], isLoading } = useQuery({
    queryKey: ['client-jobs', projectIds],
    queryFn: async () => {
      if (projectIds.length === 0) return [];
      // Fetch each project's job by ID in parallel (client only has a few)
      const results = await Promise.all(
        projectIds.map(id => base44.entities.Job.filter({ id }).catch(() => []))
      );
      return results.flat().filter(Boolean);
    },
    enabled: projectIds.length > 0,
  });

  // For single project view
  const [selectedJobId, setSelectedJobId] = useState(null);
  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];

  const { data: tasks = [] } = useQuery({
    queryKey: ['client-tasks', selectedJob?.id],
    queryFn: () => base44.entities.Task.filter({ job_id: selectedJob.id }),
    enabled: !!selectedJob?.id,
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['client-photos', selectedJob?.id],
    queryFn: () => base44.entities.Photo.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ['client-documents', selectedJob?.id],
    queryFn: () => base44.entities.Document.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['client-reports', selectedJob?.id],
    queryFn: () => base44.entities.Report.filter({ job_id: selectedJob.id }, '-created_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: dailyReports = [] } = useQuery({
    queryKey: ['client-daily-reports', selectedJob?.id],
    queryFn: () => base44.entities.DailyFieldReport.filter({ 
      job_id: selectedJob.id,
      client_visible: true 
    }, '-report_date', 30),
    enabled: !!selectedJob?.id,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['client-invoices', selectedJob?.id],
    queryFn: () => base44.entities.Invoice.filter({ job_id: selectedJob.id }, '-invoice_date'),
    enabled: !!selectedJob?.id,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['client-plans', selectedJob?.id],
    queryFn: () => base44.entities.Plan.filter({ job_id: selectedJob.id }, 'order'),
    enabled: !!selectedJob?.id,
  });

  const { data: activityLog = [] } = useQuery({
    queryKey: ['client-activity', selectedJob?.id],
    queryFn: () => base44.entities.FieldActivityLog.filter({ job_id: selectedJob.id }, '-created_at', 20),
    enabled: !!selectedJob?.id,
  });

  // Calculate progress
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const pendingTasks = tasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#507DB4] border-t-transparent rounded-full animate-spin mb-4 mx-auto" />
          <p className="text-slate-600 text-sm">Loading your projects...</p>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-blue-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">No Projects Assigned</h2>
          <p className="text-slate-600 mb-6 leading-relaxed">
            You don't have any projects assigned yet. Please contact your contractor to request access to your project.
          </p>
          <Button onClick={() => base44.auth.logout()} variant="outline" className="border-slate-300 hover:bg-slate-50 min-h-[44px]">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header - Enhanced visual hierarchy */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowAvatarCreator(true)}
                className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-blue-200 dark:ring-blue-800 hover:ring-blue-400 dark:hover:ring-blue-600 transition-all shadow-md touch-manipulation active:scale-95"
              >
                {user?.avatar_image_url ? (
                  <img src={user.avatar_image_url} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#507DB4] to-[#6B9DD8] flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                )}
              </button>
              <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">Client Portal</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">Welcome, {user?.full_name}</p>
              </div>
            </div>
            <Button onClick={() => base44.auth.logout()} variant="ghost" size="sm" className="min-h-[44px] hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Token expiry warning banner */}
        {tokenExpiryDays !== null && tokenExpiryDays <= 7 && tokenExpiryDays >= 0 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              {tokenExpiryDays === 0
                ? 'Your portal access expires today. Please contact your contractor to renew access.'
                : `Your portal access expires in ${tokenExpiryDays} day${tokenExpiryDays === 1 ? '' : 's'}. Contact your contractor to renew.`}
            </p>
          </div>
        )}

        {/* Project Selector - Enhanced styling */}
        {jobs.length > 1 && (
          <div className="mb-6 flex gap-3 overflow-x-auto pb-3 scrollbar-hide">
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`flex-shrink-0 px-5 py-3 rounded-xl border-2 font-medium transition-all min-h-[48px] touch-manipulation active:scale-95 ${
                  selectedJob?.id === job.id
                    ? 'bg-gradient-to-r from-[#507DB4] to-[#6B9DD8] text-white border-[#507DB4] shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#507DB4] dark:hover:border-[#6B9DD8]'
                }`}
              >
                {job.name}
              </button>
            ))}
          </div>
        )}

        {/* Project Header - Enhanced visual design */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6 sm:p-8 mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-2">{selectedJob?.name}</h2>
              {selectedJob?.address && (
                <div className="flex items-start gap-2 text-slate-500 dark:text-slate-400 mt-2">
                  <MapPin className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span className="text-sm leading-relaxed">{selectedJob.address}</span>
                </div>
              )}
            </div>
            <Badge className={`${
              selectedJob?.status === 'active' 
                ? 'soft-green-gradient' 
                : 'soft-blue-gradient'
            } text-sm px-4 py-2 h-auto shadow-sm`}>
              {selectedJob?.status === 'active' ? 'In Progress' : 'Completed'}
            </Badge>
          </div>

          {/* Progress Bar - Enhanced visibility */}
          <div className="mb-6 p-4 bg-gradient-to-r from-slate-50 to-blue-50 dark:from-slate-900/50 dark:to-blue-900/30 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Overall Progress</span>
              <span className="text-lg font-bold text-[#507DB4] dark:text-[#6B9DD8]">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-3 bg-slate-200 dark:bg-slate-700" />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {completedTasks} of {totalTasks} tasks completed
            </p>
          </div>

          {/* Quick Stats - Enhanced cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="soft-green-gradient rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-500" />
                <span className="text-xs font-semibold text-green-700 dark:text-green-600 uppercase tracking-wide">Completed</span>
              </div>
              <p className="text-3xl font-bold text-green-800 dark:text-green-700">{completedTasks}</p>
            </div>
            <div className="soft-blue-gradient rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-600 uppercase tracking-wide">In Progress</span>
              </div>
              <p className="text-3xl font-bold text-blue-800 dark:text-blue-700">{inProgressTasks}</p>
            </div>
            <div className="soft-amber-gradient rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                <span className="text-xs font-semibold text-amber-700 dark:text-amber-600 uppercase tracking-wide">Pending</span>
              </div>
              <p className="text-3xl font-bold text-amber-800 dark:text-amber-700">{pendingTasks}</p>
            </div>
            <div className="soft-purple-gradient rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                <span className="text-xs font-semibold text-purple-700 dark:text-purple-600 uppercase tracking-wide">Photos</span>
              </div>
              <p className="text-3xl font-bold text-purple-800 dark:text-purple-700">{photos.length}</p>
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        <WeeklySummary tasks={tasks} photos={photos} activityLog={activityLog} />

        {/* Tabs - Enhanced mobile-friendly design */}
        <Tabs defaultValue="timeline" className="space-y-6">
          <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1.5 rounded-xl flex-wrap h-auto gap-1.5 shadow-sm">
            <TabsTrigger value="approvals" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Approvals</span>
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Timeline</span>
            </TabsTrigger>
            <TabsTrigger value="tasks" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Tasks</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Status</span>
            </TabsTrigger>
            <TabsTrigger value="photos" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <Camera className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Photos</span>
              <Badge className="ml-1 sm:ml-2 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 text-xs px-1.5 py-0.5">
                {photos.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <Activity className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Activity</span>
            </TabsTrigger>
            <TabsTrigger value="drawings" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <MapPin className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Drawings</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="comments" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <MessageSquare className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Comments</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
            <TabsTrigger value="drive" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Drive</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <BarChart3 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="daily-reports" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <FileText className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Daily Reports</span>
              {dailyReports.length > 0 && (
                <Badge className="ml-2 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs px-1.5 py-0.5">
                  {dailyReports.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="invoices" className="rounded-lg min-h-[44px] data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#507DB4] data-[state=active]:to-[#6B9DD8] data-[state=active]:text-white">
              <DollarSign className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Invoices</span>
              {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length > 0 && (
                <Badge className="ml-2 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs px-1.5 py-0.5">
                  {invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <ClientApprovalsView customerEmail={user?.email} />
            </div>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <ProgressTimeline tasks={tasks} />
            </div>
          </TabsContent>

          {/* Tasks Tab - NEW */}
          <TabsContent value="tasks">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <ClientTasksView 
                jobId={selectedJob?.id} 
                clientEmail={user?.email}
                clientName={user?.full_name}
              />
            </div>
          </TabsContent>

          {/* Messages Tab - NEW */}
          <TabsContent value="messages">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Project Messages</h3>
              <JobChatView jobId={selectedJob?.id} currentUser={user} />
            </div>
          </TabsContent>

          {/* Progress Tab - Enhanced task list */}
          <TabsContent value="progress">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Project Tasks</h3>
              {tasks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">No tasks registered yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => (
                    <div 
                      key={task.id}
                      className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 shadow-sm ${
                          task.status === 'completed' ? 'bg-green-500' :
                          task.status === 'in_progress' ? 'bg-blue-500' :
                          task.status === 'blocked' ? 'bg-red-500' :
                          'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">{task.title}</p>
                          {task.category && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{task.category}</p>
                          )}
                        </div>
                      </div>
                      <Badge className={`flex-shrink-0 px-3 py-1 text-xs font-bold ${
                        task.status === 'completed' ? 'soft-green-gradient' :
                        task.status === 'in_progress' ? 'soft-blue-gradient' :
                        task.status === 'blocked' ? 'soft-red-gradient' :
                        'soft-amber-gradient'
                      }`}>
                        {task.status === 'completed' ? 'Done' :
                         task.status === 'in_progress' ? 'Active' :
                         task.status === 'blocked' ? 'Blocked' : 'Pending'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Photos Tab - Enhanced */}
          <TabsContent value="photos">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl">
                  <Camera className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                Project Photo Gallery
              </h3>
              <PhotoGalleryEnhanced photos={photos} />
            </div>
          </TabsContent>

          {/* Activity Tab - Enhanced */}
          <TabsContent value="activity">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                  <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                Recent Activity
              </h3>
              {activityLog.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Activity className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">No activity recorded yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {activityLog.map((activity) => (
                    <div key={activity.id} className="flex gap-4 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-3 h-3 bg-blue-500 rounded-full mt-1.5 flex-shrink-0 shadow-sm" />
                      <div className="flex-1">
                        <p className="text-slate-900 dark:text-white font-semibold text-sm">{activity.action}</p>
                        {activity.details && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{activity.details}</p>
                        )}
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                          {format(new Date(activity.created_at), 'MMM dd, yyyy • HH:mm')} • {activity.user_name}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Comments Tab */}
          <TabsContent value="comments">
            <ClientComments jobId={selectedJob?.id} />
          </TabsContent>

          {/* Google Drive Tab */}
          <TabsContent value="drive">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-6 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Archivos en Google Drive
              </h3>
              <ClientDriveViewer job={selectedJob} />
            </div>
          </TabsContent>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Documentos Compartidos</h3>
              {documents.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay documentos disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <a 
                      key={doc.id}
                      href={doc.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{doc.name}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(doc.created_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Download className="w-5 h-5 text-slate-400" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-900 mb-4">Reportes Generados</h3>
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No hay reportes disponibles</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <div 
                      key={report.id}
                      className="flex items-center justify-between p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          report.type === 'excel' ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <FileText className={`w-5 h-5 ${
                            report.type === 'excel' ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{report.name}</p>
                          <p className="text-sm text-slate-500">
                            {report.type === 'excel' ? 'Excel' : 'PDF'} • {format(new Date(report.created_date), 'dd MMM yyyy')}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Descargar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Daily Reports Tab */}
          <TabsContent value="daily-reports">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <DailyFieldReportView jobId={selectedJob?.id} isClientView={true} />
            </div>
          </TabsContent>

          {/* Invoices & Payments Tab */}
          <TabsContent value="invoices">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700 p-6">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-xl">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                Invoices & Payments
              </h3>
              
              {invoices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-10 h-10 text-slate-300 dark:text-slate-500" />
                  </div>
                  <p className="text-slate-500 dark:text-slate-400">No invoices yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoices.map((invoice) => {
                    const balance = invoice.balance || (invoice.total - (invoice.amount_paid || 0));
                    const isPaid = invoice.status === 'paid';
                    const isCancelled = invoice.status === 'cancelled';
                    const canPay = !isPaid && !isCancelled && balance > 0;

                    const handlePayNow = async () => {
                      try {
                        if (window.self !== window.top) {
                          alert('Payments only work in published app. Please open the app in a new browser tab.');
                          return;
                        }

                        const response = await base44.functions.invoke('stripe-checkout', { invoiceId: invoice.id });
                        
                        if (response?.data?.url) {
                          window.location.href = response.data.url;
                        } else {
                          throw new Error('No checkout URL returned');
                        }
                      } catch (error) {
                        console.error('Payment error:', error);
                        alert('Payment error: ' + (error.message || 'Unknown error'));
                      }
                    };

                    return (
                      <div 
                        key={invoice.id}
                        className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700"
                      >
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-lg font-bold text-slate-900 dark:text-white">
                                {invoice.invoice_number}
                              </h4>
                              <Badge className={`${
                                isPaid ? 'soft-green-gradient' :
                                isCancelled ? 'soft-red-gradient' :
                                invoice.status === 'partial' ? 'soft-amber-gradient' :
                                'soft-blue-gradient'
                              }`}>
                                {isPaid ? 'Paid' : 
                                 isCancelled ? 'Cancelled' :
                                 invoice.status === 'partial' ? 'Partial Payment' :
                                 invoice.status === 'overdue' ? 'Overdue' : 'Pending'}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-3">
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Invoice Date</p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {invoice.invoice_date ? format(new Date(invoice.invoice_date), 'MMM dd, yyyy') : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Due Date</p>
                                <p className="font-semibold text-slate-900 dark:text-white">
                                  {invoice.due_date ? format(new Date(invoice.due_date), 'MMM dd, yyyy') : '-'}
                                </p>
                              </div>
                              <div>
                                <p className="text-slate-500 dark:text-slate-400 text-xs">Total Amount</p>
                                <p className="font-bold text-green-600 dark:text-green-400 text-lg">
                                  ${(invoice.total || 0).toLocaleString()}
                                </p>
                              </div>
                            </div>

                            {invoice.amount_paid > 0 && (
                              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-3">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-green-700 dark:text-green-400">Amount Paid:</span>
                                  <span className="font-bold text-green-700 dark:text-green-400">
                                    ${invoice.amount_paid.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}

                            {balance > 0 && !isCancelled && (
                              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-amber-700 dark:text-amber-400">Balance Due:</span>
                                  <span className="font-bold text-amber-700 dark:text-amber-400 text-lg">
                                    ${balance.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col gap-2">
                            {canPay && (
                              <Button
                                onClick={handlePayNow}
                                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg min-h-[48px]"
                              >
                                <CreditCard className="w-4 h-4 mr-2" />
                                Pay ${balance.toLocaleString()}
                              </Button>
                            )}
                            {isPaid && (
                              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
                                <CheckCircle2 className="w-5 h-5" />
                                Paid in Full
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] relative">
            <img 
              src={selectedPhoto.file_url}
              alt={selectedPhoto.caption || 'Foto'}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            {selectedPhoto.caption && (
              <p className="text-white text-center mt-4">{selectedPhoto.caption}</p>
            )}
          </div>
        </div>
      )}

      {/* Avatar Creator Modal */}
      {showAvatarCreator && (
        <AvatarCreator 
          open={showAvatarCreator}
          onClose={() => setShowAvatarCreator(false)}
          readOnly={true}
        />
      )}
    </div>
  );
}