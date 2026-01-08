import React from 'react';
import { Link } from 'react-router-dom';
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
  ClipboardList,
  Loader2,
  ClipboardCheck,
  CheckCircle2,
  Activity,
  Brain,
  MapPin,
  AlertCircle,
  Plus,
  PackageCheck
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
import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import ClientApprovalsView from '@/components/field/ClientApprovalsView.jsx';
import FieldActivityLogView from '@/components/field/FieldActivityLogView.jsx';
import QRCodeScanner from '@/components/field/QRCodeScanner.jsx';
import FieldAIAssistant from '@/components/field/FieldAIAssistant.jsx';
import FieldVoiceNotesView from '@/components/field/FieldVoiceNotesView.jsx';
import FieldDimensionsView from '@/components/field/FieldDimensionsView.jsx';
import MeasurementIntelligencePanel from '@/components/field/MeasurementIntelligencePanel.jsx';
import MeasurementCompletenessPanel from '@/components/field/MeasurementCompletenessPanel.jsx';
import MeasurementAIQualityPanel from '@/components/field/MeasurementAIQualityPanel.jsx';
import MeasurementPackageGenerator from '@/components/field/MeasurementPackageGenerator.jsx';
import { MobileBottomNav, MobileHeader } from '@/components/field/MobileFieldNav.jsx';
import { OfflineStatusBadge } from '@/components/field/FieldOfflineManager.jsx';
import DailyReportGenerator from '@/components/field/DailyReportGenerator.jsx';
import BeforeAfterPhotos from '@/components/field/BeforeAfterPhotos.jsx';
import DailyFieldReportView from '@/components/field/DailyFieldReportView.jsx';
import FieldStatusBar from '@/components/field/FieldStatusBar.jsx';
import UniversalSyncIndicator from '@/components/field/UniversalSyncIndicator.jsx';
import PhotoUploadProgress from '@/components/field/PhotoUploadProgress.jsx';
import FieldQuickActionBar from '@/components/field/FieldQuickActionBar.jsx';
import AccessDenied from '@/components/field/AccessDenied';
import QuickSearchDialog from '@/components/field/QuickSearchDialog.jsx';
import CreateTaskDialog from '@/components/field/CreateTaskDialog.jsx';
import FieldBottomActionRail from '@/pages/FieldBottomActionRail.jsx';
import { updateFieldQueryData } from '@/components/field/config/fieldQueryConfig';

export default function FieldProjectView({
  // State
  activePanel,
  setActivePanel,
  isMobile,
  showQuickSearch,
  setShowQuickSearch,
  showDailyReport,
  setShowDailyReport,
  showCreateTask,
  setShowCreateTask,
  
  // Data
  job,
  tasks,
  plans,
  members,
  currentUser,
  hasAccess,
  isLoading,
  jobId,
  
  // Handlers
  handleBack,
  handleFABClick,
  handleActionComplete,
  queryClient,
}) {
  // Loading state
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

  // Not found state
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

  // Access denied state
  if (currentUser && !hasAccess) {
    return <AccessDenied />;
  }

  // Sidebar items configuration
  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: Map, count: plans.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'dimensions', label: 'Dimensions', icon: FileText },
    { id: 'intelligence', label: 'Intelligence', icon: Brain },
    { id: 'completeness', label: 'Completeness', icon: CheckCircle2 },
    { id: 'ai-quality', label: 'AI Quality', icon: Brain, badge: '✨' },
    { id: 'package', label: 'Package Export', icon: PackageCheck },
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
    { id: 'voice', label: 'Voice Notes', icon: Camera },
    { id: 'ai-assistant', label: 'AI Assistant', icon: Brain, badge: '✨' },
  ];

  // Panel rendering logic
  const renderPanel = () => {
    switch (activePanel) {
      case 'overview':
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} onOpenDailyReport={() => setShowDailyReport(true)} />;
      case 'plans':
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
      case 'tasks':
        return <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />;
      case 'dimensions':
        return <FieldDimensionsView jobId={jobId} jobName={job?.name || job?.job_name_field} />;
      case 'intelligence':
        return <MeasurementIntelligencePanel dimensions={[]} benchmarks={[]} jobId={jobId} />;
      case 'completeness':
        return <MeasurementCompletenessPanel dimensions={[]} benchmarks={[]} photos={[]} jobId={jobId} />;
      case 'ai-quality':
        return <MeasurementAIQualityPanel jobId={jobId} />;
      case 'package':
        return <MeasurementPackageGenerator jobId={jobId} />;
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
      case 'voice':
        return <FieldVoiceNotesView jobId={jobId} />;
      case 'ai-assistant':
        return <FieldAIAssistant jobId={jobId} job={job} tasks={tasks} members={members} />;
      default:
        return <FieldProjectOverview job={job} tasks={tasks} plans={plans} onOpenDailyReport={() => setShowDailyReport(true)} />;
    }
  };

  // FAB configuration
  const getFABConfig = () => {
    if (activePanel === 'tasks') return { show: true, icon: Plus, label: 'Add Task' };
    if (activePanel === 'photos') return { show: true, icon: Camera, label: 'Take Photo' };
    if (activePanel === 'activity') return { show: true, icon: AlertCircle, label: 'New Incident' };
    return { show: false };
  };

  const fabConfig = getFABConfig();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col md:flex-row overflow-y-auto">
      {/* Quick Search Dialog */}
      <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />
      
      {/* Offline Status Indicator */}
      <OfflineStatusBadge />
      
      {/* Mobile Header */}
      {isMobile && <MobileHeader job={job} onBack={handleBack} />}

      {/* Mobile Back Button - Thumb-reachable bottom-left */}
      {isMobile && (
        <button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate(10);
            handleBack();
          }}
          className="fixed bottom-4 left-4 z-[55] w-14 h-14 bg-slate-900 border-2 border-slate-700 rounded-2xl flex items-center justify-center shadow-2xl touch-manipulation active:scale-90 active:bg-slate-800 transition-all"
          style={{ 
            WebkitTapHighlightColor: 'transparent',
            minWidth: '56px',
            minHeight: '56px'
          }}
          aria-label="Back to projects"
        >
          <ArrowLeft className="w-6 h-6 text-white" strokeWidth={2.5} />
        </button>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-72 bg-slate-900 border-r border-slate-700 flex-col shadow-xl overflow-y-auto">
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

        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-base font-bold transition-all min-h-[52px] touch-manipulation active:scale-[0.98] ${
                activePanel === item.id
                  ? 'bg-gradient-to-r from-orange-600 to-yellow-500 text-black border-2 border-orange-300 shadow-2xl shadow-orange-500/30'
                  : 'text-slate-300 active:text-white active:bg-slate-800 border-2 border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <item.icon className="w-6 h-6" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-sm px-3 py-1.5 rounded-full font-bold border-2 ${
                  activePanel === item.id
                    ? 'bg-black/20 text-white border-black/30'
                    : 'bg-slate-700 text-slate-100 border-slate-600'
                }`}>
                  {item.count}
                </span>
              )}
              {item.badge && (
                <span className="text-xl">{item.badge}</span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div data-field-main className="flex-1 overflow-y-auto pb-32 md:pb-0" style={{ height: '100vh', overflowY: 'auto' }}>
        <FieldStatusBar jobId={jobId} />
        {renderPanel()}
      </div>

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

      {/* Quick Create Task Dialog */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        jobId={jobId}
        onCreated={() => {
          setShowCreateTask(false);
          updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => old);
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

      {/* Quick Action Bar - Legacy support */}
      <FieldQuickActionBar
        jobId={jobId}
        jobName={job?.name || job?.job_name_field}
        onActionComplete={handleActionComplete}
      />

      {/* Bottom Action Rail - One-Hand Mode primary actions */}
      <FieldBottomActionRail 
        jobId={jobId}
        jobName={job?.name || job?.job_name_field}
        onActionComplete={(panel) => {
          if (panel === 'dimensions') {
            setActivePanel('dimensions');
          }
          handleActionComplete();
        }}
      />
    </div>
  );
}