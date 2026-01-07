import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import CreateTaskDialog from '@/components/field/CreateTaskDialog.jsx';
import ClientInviteManager from '@/components/client/ClientInviteManager.jsx';
import { Link } from 'react-router-dom';
import QuickSearchDialog from '@/components/field/QuickSearchDialog.jsx';
import AccessDenied from '@/components/field/AccessDenied';
import { createPageUrl } from '@/utils';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
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
  Brain,
  MapPin,
  AlertCircle,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components
import FieldProjectOverview from '@/components/field/FieldProjectOverview.jsx';
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldPhotosView from '@/components/field/FieldPhotosView.jsx';
import FieldDocumentsView from '@/components/field/FieldDocumentsView.jsx';
import FieldChatView from '@/components/field/FieldChatView.jsx';
import FieldMembersView from '@/components/field/FieldMembersView.jsx';
import FieldAnalyticsView from '@/components/field/FieldAnalyticsView.jsx';
import FieldFormsView from '@/components/field/FieldFormsView.jsx';
import FieldReportsView from '@/components/field/FieldReportsView.jsx';
import FieldBudgetView from '@/components/field/FieldBudgetView.jsx';
import FieldDimensionView from '@/components/field/FieldDimensionView';

import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import ClientApprovalsView from '@/components/field/ClientApprovalsView.jsx';
import FieldActivityLogView from '@/components/field/FieldActivityLogView.jsx';
import QRCodeScanner from '@/components/field/QRCodeScanner.jsx';
import FieldAIAssistant from '@/components/field/FieldAIAssistant.jsx';
import { MobileBottomNav, MobileHeader } from '@/components/field/MobileFieldNav.jsx';
import { FieldOfflineProvider, OfflineStatusBadge, saveOfflineData } from '@/components/field/FieldOfflineManager.jsx';
import DailyReportGenerator from '@/components/field/DailyReportGenerator.jsx';
import BeforeAfterPhotos from '@/components/field/BeforeAfterPhotos.jsx';
import MobileActionBar from '@/components/field/MobileActionBar.jsx';
import DailyFieldReportView from '@/components/field/DailyFieldReportView.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import FieldStatusBar from '@/components/field/FieldStatusBar.jsx';
import UniversalSyncIndicator from '@/components/field/UniversalSyncIndicator.jsx';
import PhotoUploadProgress from '@/components/field/PhotoUploadProgress.jsx';

export default function FieldProject() {
  // Extract jobId from URL params (read-only)
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  // SINGLE STATEFUL CONTAINER - All state lives here
  const queryClient = useQueryClient();
  
  // Restore persisted state
  const getPersistedState = () => {
    try {
      const key = `fieldProject_${jobId}`;
      const saved = sessionStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  };
  
  const [activePanel, setActivePanel] = useState(() => getPersistedState().activePanel || 'overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showDailyReport, setShowDailyReport] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);

  // Security check: verify user has access to this job
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: userAssignments = [] } = useQuery({
    queryKey: ['user-job-access', currentUser?.email, jobId],
    queryFn: () => base44.entities.JobAssignment.filter({ 
      employee_email: currentUser.email,
      job_id: jobId 
    }),
    enabled: !!currentUser?.email && !!jobId && (currentUser?.role === 'customer' || currentUser?.role === 'field_worker'),
  });

  const hasAccess = !currentUser || currentUser.role === 'admin' || 
                     currentUser.position === 'CEO' || 
                     currentUser.position === 'manager' ||
                     (currentUser.role !== 'customer' && currentUser.role !== 'field_worker') ||
                     userAssignments.length > 0;

  // Persist state changes
  useEffect(() => {
    if (!jobId) return;
    try {
      const key = `fieldProject_${jobId}`;
      const state = { activePanel };
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }, [jobId, activePanel]);

  // Restore scroll position
  useEffect(() => {
    if (!jobId) return;
    const key = `fieldProject_scroll_${jobId}`;
    const savedScroll = sessionStorage.getItem(key);
    if (savedScroll) {
      requestAnimationFrame(() => {
        const mainContent = document.querySelector('.field-main-content');
        if (mainContent) mainContent.scrollTop = parseInt(savedScroll, 10);
      });
    }
  }, [jobId, activePanel]);

  // Save scroll position on scroll
  useEffect(() => {
    if (!jobId) return;
    const mainContent = document.querySelector('.field-main-content');
    if (!mainContent) return;

    const handleScroll = () => {
      try {
        const key = `fieldProject_scroll_${jobId}`;
        sessionStorage.setItem(key, mainContent.scrollTop.toString());
      } catch (error) {
        console.error('Failed to save scroll position:', error);
      }
    };

    mainContent.addEventListener('scroll', handleScroll);
    return () => mainContent.removeEventListener('scroll', handleScroll);
  }, [jobId, activePanel]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Swipe gestures for panel navigation (mobile only)
  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const panelOrder = ['overview', 'tasks', 'photos', 'activity', 'plans'];

    const handleTouchStart = (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e) => {
      touchEndX = e.touches[0].clientX;
      touchEndY = e.touches[0].clientY;
    };

    const handleTouchEnd = () => {
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Only recognize horizontal swipes (prevent interference with scroll)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        const currentIndex = panelOrder.indexOf(activePanel);
        
        if (deltaX > 0 && currentIndex > 0) {
          // Swipe right - go to previous panel
          setActivePanel(panelOrder[currentIndex - 1]);
        } else if (deltaX < 0 && currentIndex < panelOrder.length - 1) {
          // Swipe left - go to next panel
          setActivePanel(panelOrder[currentIndex + 1]);
        }
      }
    };

    const mainContent = document.querySelector('.field-main-content');
    if (mainContent) {
      mainContent.addEventListener('touchstart', handleTouchStart, { passive: true });
      mainContent.addEventListener('touchmove', handleTouchMove, { passive: true });
      mainContent.addEventListener('touchend', handleTouchEnd, { passive: true });

      return () => {
        mainContent.removeEventListener('touchstart', handleTouchStart);
        mainContent.removeEventListener('touchmove', handleTouchMove);
        mainContent.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isMobile, activePanel]);

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
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-tasks', jobId],
    queryFn: async () => {
      const data = await base44.entities.Task.filter({ job_id: jobId }, '-created_date');
      // Cache for offline use
      saveOfflineData('tasks', data);
      return data;
    },
    enabled: !!jobId,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['field-plans', jobId],
    queryFn: async () => {
      const data = await base44.entities.Plan.filter({ job_id: jobId }, 'order');
      // Cache for offline use
      saveOfflineData('plans', data);
      return data;
    },
    enabled: !!jobId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['field-members', jobId],
    queryFn: () => base44.entities.ProjectMember.filter({ project_id: jobId }),
    enabled: !!jobId,
  });

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: Map, count: plans.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'dimensions', label: 'Site Dims', icon: FileText },
    { id: 'photos', label: 'Photos', icon: Camera },
    { id: 'before-after', label: 'Before/After', icon: Camera },
    { id: 'daily-reports', label: 'Daily Reports', icon: ClipboardList },
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
      <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-4" />
          <p className="text-slate-300 text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Project Not Found</h3>
          <p className="text-slate-400 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <Link to={createPageUrl('Field')}>
            <Button className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-white shadow-lg min-h-[48px] px-6 rounded-xl">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Security: Block access if user doesn't have permission
  if (currentUser && !hasAccess) {
    return <AccessDenied />;
  }

  // CONDITIONAL PANEL RENDERING - No routing, pure state-driven UI
  const renderPanel = () => {
    switch (activePanel) {
      case 'overview':
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} onOpenDailyReport={() => setShowDailyReport(true)} />;
      case 'plans':
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
      case 'tasks':
        return <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />;
      case 'dimensions':
        return <FieldDimensionView jobId={jobId} />;
      case 'photos':
        return <FieldPhotosView jobId={jobId} />;
      case 'before-after':
        return <BeforeAfterPhotos jobId={jobId} />;
      case 'daily-reports':
        return <DailyFieldReportView jobId={jobId} />;
      case 'documents':
        return <FieldDocumentsView jobId={jobId} />;
      case 'budget':
        return <FieldBudgetView jobId={jobId} />;
      case 'checklists':
        return <FieldChecklistsView jobId={jobId} />;
      case 'approvals':
        return <ClientApprovalsView jobId={jobId} />;
      case 'materials':
        return <QRCodeScanner jobId={jobId} />;
      case 'chat':
        return <FieldChatView jobId={jobId} />;
      case 'members':
        return <FieldMembersView jobId={jobId} />;
      case 'forms':
        return <FieldFormsView jobId={jobId} />;
      case 'reports':
        return <FieldReportsView jobId={jobId} />;
      case 'activity':
        return <FieldActivityLogView jobId={jobId} />;
      case 'analytics':
        return <FieldAnalyticsView jobId={jobId} tasks={tasks} />;
      case 'ai-assistant':
        return <FieldAIAssistant jobId={jobId} job={job} tasks={tasks} members={members} />;
      default:
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} onOpenDailyReport={() => setShowDailyReport(true)} />;
    }
  };

  const handleBack = () => {
    window.location.href = createPageUrl('Field');
  };

  // FAB action handler
  const handleFABClick = () => {
    if (activePanel === 'tasks') {
      setShowCreateTask(true);
    } else if (activePanel === 'photos') {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = 'image/*';
      fileInput.capture = 'environment';
      fileInput.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          try {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await base44.entities.Photo.create({
              job_id: jobId,
              photo_url: file_url,
              uploaded_by: currentUser?.email,
              uploaded_by_name: currentUser?.full_name,
            });
            queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] });
          } catch (error) {
            console.error('Photo upload failed:', error);
          }
        }
      };
      fileInput.click();
    } else if (activePanel === 'activity') {
      window.location.href = `${createPageUrl('CrearIncidente')}?job_id=${jobId}`;
    }
  };

  // Determine FAB visibility and icon
  const getFABConfig = () => {
    if (activePanel === 'tasks') return { show: true, icon: Plus, label: 'Add Task' };
    if (activePanel === 'photos') return { show: true, icon: Camera, label: 'Take Photo' };
    if (activePanel === 'activity') return { show: true, icon: AlertCircle, label: 'New Incident' };
    return { show: false };
  };

  const fabConfig = getFABConfig();

  return (
    <FieldErrorBoundary>
    <ThemeProvider appType="field">
    <FieldOfflineProvider jobId={jobId}>
    <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col md:flex-row overflow-y-auto">
      {/* Quick Search Dialog */}
      <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />
      
      {/* Offline Status Indicator */}
      <OfflineStatusBadge />
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader job={job} onBack={handleBack} />}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 bg-slate-900 border-r border-slate-700 flex-col shadow-xl overflow-y-auto">
        {/* Header - Fixed job info with Maps link */}
        <div className="p-5 border-b border-slate-700 bg-gradient-to-br from-black to-slate-900 flex-shrink-0 sticky top-0 z-10">
          <Link to={createPageUrl('Field')}>
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white mb-4 min-h-[40px] hover:bg-slate-800 rounded-lg transition-all w-full justify-start">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
          <div className="space-y-3">
            <div>
              <h2 className="font-bold text-white text-lg leading-tight mb-3">{job.name || job.job_name_field}</h2>
              {job.address && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-2 text-slate-300 hover:text-[#FFB800] transition-colors text-sm mb-3 p-2 bg-slate-800/50 rounded-lg hover:bg-slate-800 group"
                >
                  <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 group-hover:text-[#FFB800]" />
                  <span className="line-clamp-2 leading-relaxed">{job.address}</span>
                </a>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <Badge className={`text-xs px-3 py-1.5 font-bold ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : job.status === 'completed'
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              }`}>
                {job.status === 'active' ? '🟢 Active' : 
                 job.status === 'completed' ? '✅ Completed' : 
                 job.status}
              </Badge>
              {job.client_name_field && (
                <p className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  {job.client_name_field}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Navigation - Enhanced touch targets and visual hierarchy */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all min-h-[48px] ${
                activePanel === item.id
                  ? 'bg-gradient-to-r from-orange-600/20 to-yellow-500/20 text-orange-400 border border-orange-500/40 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                  activePanel === item.id
                    ? 'bg-orange-500/40 text-orange-200'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {item.count}
                </span>
              )}
              {item.badge && (
                <span className="text-lg">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto pb-32 md:pb-0 field-main-content" style={{ height: '100vh', overflowY: 'auto' }}>
        <FieldStatusBar jobId={jobId} />
        {renderPanel()}
      </div>

      {/* Mobile Action Bar */}
      {isMobile && (
        <MobileActionBar
          jobId={jobId}
          onPhotoAdded={() => queryClient.invalidateQueries({ queryKey: ['field-photos', jobId] })}
          onTaskCreated={() => setShowCreateTask(true)}
          onNoteAdded={() => setActiveTab('activity')}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <MobileBottomNav 
          activeTab={activePanel}
          onTabChange={setActivePanel}
          taskCount={tasks.length}
          planCount={plans.length}
        />
      )}

      {/* Daily Report Dialog */}
      <DailyReportGenerator 
        open={showDailyReport}
        onOpenChange={setShowDailyReport}
        jobId={jobId}
        jobName={job?.name || job?.job_name_field}
      />

      {/* Quick Create Task Dialog (Mobile) */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        jobId={jobId}
        onCreated={() => {
          setShowCreateTask(false);
          queryClient.invalidateQueries({ queryKey: ['field-tasks', jobId] });
        }}
      />

      {/* Context-Aware FAB */}
      {fabConfig.show && (
        <button
          onClick={handleFABClick}
          className="fixed bottom-24 right-6 md:bottom-8 z-50 w-16 h-16 bg-gradient-to-br from-orange-600 to-yellow-500 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-transform"
          aria-label={fabConfig.label}
        >
          <fabConfig.icon className="w-7 h-7" />
        </button>
      )}

      {/* Universal Sync Indicator */}
      <UniversalSyncIndicator jobId={jobId} />

      {/* Photo Upload Progress */}
      <PhotoUploadProgress jobId={jobId} />
    </div>
    </FieldOfflineProvider>
    </ThemeProvider>
    </FieldErrorBoundary>
  );
}