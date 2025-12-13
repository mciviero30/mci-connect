import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  LayoutDashboard,
  Map,
  CheckSquare,
  Camera,
  FileText,
  MessageSquare,
  Users,
  BarChart3,
  Settings,
  ClipboardList,
  Loader2,
  DollarSign,
  Flag,
  ClipboardCheck,
  CheckCircle2,
  Activity,
  QrCode,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Lazy load heavy components
const QuickSearchDialog = lazy(() => import('@/components/field/QuickSearchDialog.jsx'));
const FieldProjectOverview = lazy(() => import('@/components/field/FieldProjectOverview.jsx'));
const FieldPlansView = lazy(() => import('@/components/field/FieldPlansView.jsx'));
const FieldTasksView = lazy(() => import('@/components/field/FieldTasksView.jsx'));
const FieldPhotosView = lazy(() => import('@/components/field/FieldPhotosView.jsx'));
const FieldDocumentsView = lazy(() => import('@/components/field/FieldDocumentsView.jsx'));
const FieldChatView = lazy(() => import('@/components/field/FieldChatView.jsx'));
const FieldMembersView = lazy(() => import('@/components/field/FieldMembersView.jsx'));
const FieldAnalyticsView = lazy(() => import('@/components/field/FieldAnalyticsView.jsx'));
const FieldFormsView = lazy(() => import('@/components/field/FieldFormsView.jsx'));
const FieldReportsView = lazy(() => import('@/components/field/FieldReportsView.jsx'));
const FieldBudgetView = lazy(() => import('@/components/field/FieldBudgetView.jsx'));
const FieldMilestonesView = lazy(() => import('@/components/field/FieldMilestonesView.jsx'));
const FieldChecklistsView = lazy(() => import('@/components/field/FieldChecklistsView.jsx'));
const ClientApprovalsView = lazy(() => import('@/components/field/ClientApprovalsView.jsx'));
const FieldActivityLogView = lazy(() => import('@/components/field/FieldActivityLogView.jsx'));
const QRCodeScanner = lazy(() => import('@/components/field/QRCodeScanner.jsx'));
const FieldAIAssistant = lazy(() => import('@/components/field/FieldAIAssistant.jsx'));
const MobileFieldNav = lazy(() => import('@/components/field/MobileFieldNav.jsx'));
const FieldOfflineManager = lazy(() => import('@/components/field/FieldOfflineManager.jsx'));

export default function FieldProject() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showQuickSearch, setShowQuickSearch] = useState(false);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const { data: job, isLoading } = useQuery({
    queryKey: ['field-job', jobId],
    queryFn: async () => {
      const jobs = await base44.entities.Job.filter({ id: jobId });
      return jobs[0] || null;
    },
    enabled: !!jobId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-tasks', jobId],
    queryFn: async () => {
      return await base44.entities.Task.filter({ job_id: jobId }, '-created_date');
    },
    enabled: !!jobId && activeTab !== 'overview',
    staleTime: 2 * 60 * 1000,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-plans', jobId],
    queryFn: async () => {
      return await base44.entities.Plan.filter({ job_id: jobId }, 'order');
    },
    enabled: !!jobId && (activeTab === 'plans' || activeTab === 'overview'),
    staleTime: 5 * 60 * 1000,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId && activeTab === 'members',
    staleTime: 5 * 60 * 1000,
  });

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: Map, count: plans.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'milestones', label: 'Milestones', icon: Flag },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    { id: 'approvals', label: 'Approvals', icon: CheckCircle2 },
    { id: 'chat', label: 'Chat', icon: MessageSquare },
    { id: 'members', label: 'Team', icon: Users },
    { id: 'forms', label: 'Forms', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'activity', label: 'Activity', icon: Activity },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Brain, badge: '✨' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">Project not found</p>
          <Link to={createPageUrl('Field')}>
            <Button className="bg-amber-500 hover:bg-amber-600">Back</Button>
          </Link>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      }>
        {activeTab === 'overview' && <FieldProjectOverview job={job} tasks={tasks} plans={plans} />}
        {activeTab === 'plans' && <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />}
        {activeTab === 'tasks' && <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />}
        {activeTab === 'milestones' && <FieldMilestonesView jobId={jobId} />}
        {activeTab === 'photos' && <FieldPhotosView jobId={jobId} />}
        {activeTab === 'documents' && <FieldDocumentsView jobId={jobId} />}
        {activeTab === 'budget' && <FieldBudgetView jobId={jobId} />}
        {activeTab === 'checklists' && <FieldChecklistsView jobId={jobId} />}
        {activeTab === 'approvals' && <ClientApprovalsView jobId={jobId} />}
        {activeTab === 'materials' && <QRCodeScanner jobId={jobId} />}
        {activeTab === 'chat' && <FieldChatView jobId={jobId} />}
        {activeTab === 'members' && <FieldMembersView jobId={jobId} />}
        {activeTab === 'forms' && <FieldFormsView jobId={jobId} />}
        {activeTab === 'reports' && <FieldReportsView jobId={jobId} />}
        {activeTab === 'activity' && <FieldActivityLogView jobId={jobId} />}
        {activeTab === 'analytics' && <FieldAnalyticsView jobId={jobId} tasks={tasks} />}
        {activeTab === 'ai-assistant' && <FieldAIAssistant jobId={jobId} job={job} tasks={tasks} members={members} />}
      </Suspense>
    );
  };

  const handleBack = () => {
    window.location.href = createPageUrl('Field');
  };

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    }>
      <FieldOfflineProvider jobId={jobId}>
      <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#181818] flex flex-col md:flex-row">
        {showQuickSearch && (
          <Suspense fallback={null}>
            <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />
          </Suspense>
        )}
        
        <Suspense fallback={null}>
          <OfflineStatusBadge />
        </Suspense>
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader job={job} onBack={handleBack} />}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-white dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-700/50 flex-col shadow-sm">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-700/50">
          <Link to={createPageUrl('Field')}>
            <Button variant="ghost" size="sm" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white mb-3">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee5191fb756d843d0561d3/5dcd95f71_Screenshot2025-12-01at21824PM.png"
                alt="MCI Field"
                className="w-10 h-10 object-contain"
              />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-slate-900 dark:text-white truncate">{job.name || job.job_name_field}</h2>
              <Badge className={`text-xs ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
              }`}>
                {job.status === 'active' ? 'Active' : job.status}
              </Badge>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-4 h-4" />
                {item.label}
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  activeTab === item.id
                    ? 'bg-amber-500/30 text-amber-600 dark:text-amber-300'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                }`}>
                  {item.count}
                </span>
              )}
              {item.badge && (
                <span className="text-xs">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto pb-20 md:pb-0">
        {renderContent()}
      </div>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <Suspense fallback={null}>
          <MobileBottomNav 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            taskCount={tasks.length}
            planCount={plans.length}
          />
        </Suspense>
      )}
    </div>
    </FieldOfflineProvider>
    </Suspense>
  );
}