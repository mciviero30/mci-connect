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
  PackageCheck,
  Mic
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
import SiteNotesRecorder from '@/components/field/SiteNotesRecorder.jsx';
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
import FieldBottomActionRail from './FieldBottomActionRail';
import FieldContextBar from './FieldContextBar';
import SafeBackButton from './SafeBackButton';
import SessionRestorationIndicator from './SessionRestorationIndicator';
import { updateFieldQueryData } from '@/components/field/config/fieldQueryConfig';
import { useFieldDebugMode, filterFieldPanels } from '@/components/field/hooks/useFieldDebugMode';
import { DebugUI, AdminOnlyUI } from '@/components/policies/UIVisibilityWrapper';

/**
 * SMART RE-ENTRY: Restore panel from URL params
 */
const useSmartReentry = (setActivePanel) => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const panelParam = urlParams.get('panel');
    
    if (panelParam && ['overview', 'tasks', 'photos', 'plans', 'dimensions', 'reports', 'chat', 'members', 'documents', 'forms', 'budget', 'analytics'].includes(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [setActivePanel]);
};

export default function FieldProjectView({
  // State
  activePanel,
  setActivePanel,
  currentMode,
  setCurrentMode,
  currentArea,
  setCurrentArea,
  isMobile,
  showQuickSearch,
  setShowQuickSearch,
  showDailyReport,
  setShowDailyReport,
  showCreateTask,
  setShowCreateTask,
  hasUnsaved,
  
  // Session awareness
  isRestoringSession,
  restoredContext,
  session,
  
  // Panel management
  panelManager,
  
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

  // Debug mode detection
  const isDebugMode = useFieldDebugMode(currentUser);

  // Sidebar items configuration - ALL items
  const allSidebarItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'plans', label: 'Plans', icon: Map, count: plans.length },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare, count: tasks.length },
    { id: 'dimensions', label: 'Dimensions', icon: FileText },
    { id: 'site-notes', label: 'Site Notes', icon: Mic },
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

  // Filter panels based on debug mode
  const sidebarItems = filterFieldPanels(allSidebarItems, isDebugMode);

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
      case 'site-notes':
        return <SiteNotesRecorder jobId={jobId} area={null} />;
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

  // Render main sections in vertical scroll (Work Mode)
  const renderWorkContent = () => (
    <div className="space-y-6 px-3 sm:px-4 md:px-6 pb-32">
      {/* Progress Summary */}
      <FieldProjectOverview job={job} tasks={tasks} plans={plans} onOpenDailyReport={() => setShowDailyReport(true)} />
      
      {/* Tasks Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <CheckSquare className="w-5 h-5 text-orange-400" />
          Tasks
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 ml-2">
            {tasks.length}
          </Badge>
        </h2>
        <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />
      </section>

      {/* Dimensions Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Dimensions
        </h2>
        <FieldDimensionsView jobId={jobId} jobName={job?.name || job?.job_name_field} />
      </section>

      {/* Plans Section */}
      {plans.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Map className="w-5 h-5 text-blue-400" />
            Plans
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 ml-2">
              {plans.length}
            </Badge>
          </h2>
          <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />
        </section>
      )}

      {/* Checklists Section */}
      <section>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-green-400" />
          Checklists
        </h2>
        <FieldChecklistsView jobId={jobId} />
      </section>
    </div>
  );

  return (
    <div data-field-scope="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col overflow-hidden dark">
      {/* Field Exit Control - Persistent, Always Visible */}
      <Link to={createPageUrl('Dashboard')}>
        <Button 
          className="fixed top-4 left-4 z-[70] bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-2xl backdrop-blur-sm min-h-[44px] px-4 rounded-xl touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Back to MCI Connect</span>
          <span className="sm:hidden">Back</span>
        </Button>
      </Link>

      {/* Quick Search Dialog */}
      <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />
      
      {/* Offline Status Indicator */}
      <OfflineStatusBadge />
      
      {/* Session Restoration Indicator */}
      <SessionRestorationIndicator 
        isRestoring={isRestoringSession}
        restoredContext={restoredContext}
      />

      {/* Fixed Header - Project Name + Status */}
      <div className="flex-shrink-0 sticky top-0 z-50 bg-gradient-to-br from-black to-slate-900 border-b border-slate-700 shadow-xl">
        <div className="px-3 sm:px-4 md:px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate mb-1">
                {job.name || job.job_name_field}
              </h1>
              {job.address && (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-slate-300 hover:text-orange-400 transition-colors text-sm group"
                >
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0 group-hover:text-orange-400" />
                  <span className="truncate">{job.address}</span>
                </a>
              )}
            </div>
            <Badge className={`flex-shrink-0 text-xs px-3 py-1.5 font-bold ${
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
          </div>
          {job.client_name_field && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-2">
              <Users className="w-3.5 h-3.5" />
              {job.client_name_field}
            </p>
          )}
        </div>
        <FieldStatusBar jobId={jobId} />
      </div>

      {/* Main Content - Scrollable Vertical Flow */}
      <div data-field-main className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {isDebugMode ? renderPanel() : renderWorkContent()}
      </div>

      {/* Universal Sync Indicator - Production UI */}
      <UniversalSyncIndicator jobId={jobId} />

      {/* Photo Upload Progress - Production UI */}
      <PhotoUploadProgress jobId={jobId} />

      {/* Debug UI - Only visible in debug mode */}
      <DebugUI>
        <div className="fixed bottom-4 left-4 z-50 bg-slate-900/90 backdrop-blur-sm border border-yellow-500 rounded-lg px-3 py-2 text-xs text-yellow-400">
          🔧 Debug Mode Active
        </div>
      </DebugUI>

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

      {/* Bottom Action Rail - Fixed, Always Visible */}
      <FieldBottomActionRail 
        jobId={jobId}
        jobName={job?.name || job?.job_name_field}
        currentPanel={activePanel}
        isRecording={currentMode === 'recording'}
        isCapturing={currentMode === 'capturing'}
        isMeasuring={currentMode === 'measuring'}
        panelManager={panelManager}
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