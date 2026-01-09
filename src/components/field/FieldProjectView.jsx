import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  CheckSquare,
  Camera,
  FileText,
  Loader2,
  ClipboardCheck,
  MapPin,
  AlertCircle,
  Plus,
  Mic,
  X as XIcon,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components
import FieldProjectOverview from '@/components/field/FieldProjectOverview.jsx';
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldDimensionsView from '@/components/field/FieldDimensionsView.jsx';
import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import { OfflineStatusBadge } from '@/components/field/FieldOfflineManager.jsx';
import UniversalSyncIndicator from '@/components/field/UniversalSyncIndicator.jsx';
import PhotoUploadProgress from '@/components/field/PhotoUploadProgress.jsx';
import AccessDenied from '@/components/field/AccessDenied';
import CreateTaskDialog from '@/components/field/CreateTaskDialog.jsx';
import FieldBottomActionRail from './FieldBottomActionRail';
import { updateFieldQueryData } from '@/components/field/config/fieldQueryConfig';
import { useFieldDebugMode } from '@/components/field/hooks/useFieldDebugMode';
import { DebugUI } from '@/components/policies/UIVisibilityWrapper';

// Debug-only imports
import MeasurementIntelligencePanel from '@/components/field/MeasurementIntelligencePanel.jsx';
import MeasurementCompletenessPanel from '@/components/field/MeasurementCompletenessPanel.jsx';
import MeasurementAIQualityPanel from '@/components/field/MeasurementAIQualityPanel.jsx';
import FieldLifecycleValidator from '@/components/field/FieldLifecycleValidator';
import FieldDataLossValidator from '@/components/field/FieldDataLossValidator';
import FieldPerformanceMonitor from '@/components/field/performance/FieldPerformanceMonitor';
import OfflineSyncValidator from '@/components/field/offline/OfflineSyncValidator';



export default function FieldProjectView({
  // Data
  job,
  tasks,
  plans,
  currentUser,
  hasAccess,
  isLoading,
  jobId,
  
  // Handlers
  queryClient,
}) {
  // CENTRAL PANEL MANAGER - ONE ACTIVE PANEL AT A TIME
  const [activePanel, setActivePanel] = React.useState('work');
  const [showCreateTask, setShowCreateTask] = React.useState(false);

  // Panel switcher - closes others automatically
  const switchPanel = (panelId) => {
    setActivePanel(panelId);
  };

  // Close panel - return to work view
  const closePanel = () => {
    setActivePanel('work');
  };
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

  // WORK MODE: Vertical scroll of all sections
  const renderWorkMode = () => (
    <div className="space-y-5 px-3 sm:px-4 md:px-6 pb-32">
      {/* 1. Progress Summary - Compact */}
      <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <FieldProjectOverview job={job} tasks={tasks} plans={plans} compact={true} />
      </section>
      
      {/* 2. Tasks Section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-orange-400" />
            Tasks
          </h2>
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 px-2 py-0.5 text-xs">
            {tasks.filter(t => t.status !== 'completed').length}
          </Badge>
        </div>
        <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} />
      </section>

      {/* 3. Dimensions Section */}
      <section data-section="dimensions">
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-400" />
          Dimensions
        </h2>
        <FieldDimensionsView jobId={jobId} jobName={job?.name || job?.job_name_field} />
      </section>

      {/* 4. Plans Section */}
      {plans.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-400" />
              Plans
            </h2>
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/40 px-2 py-0.5 text-xs">
              {plans.length}
            </Badge>
          </div>
          <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />
        </section>
      )}

      {/* 5. Checklists Section */}
      <section>
        <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-green-400" />
          Checklists
        </h2>
        <FieldChecklistsView jobId={jobId} />
      </section>
    </div>
  );

  // DEBUG MODE: Individual panel rendering
  const renderDebugPanel = () => {
    switch (activePanel) {
      case 'intelligence':
        return <MeasurementIntelligencePanel dimensions={[]} benchmarks={[]} jobId={jobId} />;
      case 'completeness':
        return <MeasurementCompletenessPanel dimensions={[]} benchmarks={[]} photos={[]} jobId={jobId} />;
      case 'ai-quality':
        return <MeasurementAIQualityPanel jobId={jobId} />;
      default:
        return renderWorkMode();
    }
  };

  return (
    <div data-field-scope="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col overflow-hidden dark">
      {/* HEADER FIJO - Simple, Clear */}
      <div className="flex-shrink-0 sticky top-0 z-50 bg-gradient-to-br from-black to-slate-900 border-b border-slate-700 shadow-xl">
        {/* Back Button - Top Left */}
        <Link to={createPageUrl('Field')}>
          <Button 
            className="absolute top-4 left-4 z-10 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-xl backdrop-blur-sm min-h-[48px] px-3 rounded-xl touch-manipulation"
          >
            <ArrowLeft className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Back to MCI Field</span>
          </Button>
        </Link>

        {/* Project Info */}
        <div className="px-3 sm:px-4 md:px-6 py-4 pt-16 sm:pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 sm:ml-32">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate mb-1">
                {job.name || job.job_name_field}
              </h1>
              {job.client_name_field && (
                <p className="text-xs text-slate-400 truncate">
                  {job.client_name_field}
                </p>
              )}
            </div>
            <Badge className={`flex-shrink-0 text-xs px-3 py-1.5 font-bold ${
              job.status === 'active' 
                ? 'bg-green-500/20 text-green-400 border-green-500/40'
                : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
            } border rounded-full`}>
              {job.status === 'active' ? 'TODAY' : job.status?.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Scrollable, ONE VIEW AT A TIME */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {activePanel === 'work' && renderWorkMode()}
        {activePanel === 'intelligence' && isDebugMode && (
          <div className="p-4">
            <Button onClick={closePanel} variant="outline" className="mb-4 bg-slate-800 border-slate-700 text-white">
              <XIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
            <MeasurementIntelligencePanel dimensions={[]} benchmarks={[]} jobId={jobId} />
          </div>
        )}
        {activePanel === 'completeness' && isDebugMode && (
          <div className="p-4">
            <Button onClick={closePanel} variant="outline" className="mb-4 bg-slate-800 border-slate-700 text-white">
              <XIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
            <MeasurementCompletenessPanel dimensions={[]} benchmarks={[]} photos={[]} jobId={jobId} />
          </div>
        )}
        {activePanel === 'ai-quality' && isDebugMode && (
          <div className="p-4">
            <Button onClick={closePanel} variant="outline" className="mb-4 bg-slate-800 border-slate-700 text-white">
              <XIcon className="w-4 h-4 mr-2" />
              Close
            </Button>
            <MeasurementAIQualityPanel jobId={jobId} />
          </div>
        )}
      </div>

      {/* Persistent Bottom Elements - ALWAYS VISIBLE */}
      <div className="flex-shrink-0">
        {/* Offline Badge */}
        <OfflineStatusBadge />
        
        {/* Sync Indicator */}
        <UniversalSyncIndicator jobId={jobId} />

        {/* Upload Progress */}
        <PhotoUploadProgress jobId={jobId} />
      </div>

      {/* Debug UI - Monitoring Only */}
      <DebugUI>
        <div className="fixed top-20 right-4 z-50 space-y-2">
          <div className="bg-slate-900/95 backdrop-blur-sm border border-yellow-500 rounded-lg px-3 py-2 text-xs text-yellow-400 shadow-xl">
            🔧 Debug Mode
          </div>
          <Button
            onClick={() => switchPanel('intelligence')}
            size="sm"
            variant="outline"
            className="w-full bg-slate-900 border-purple-500 text-purple-400 hover:bg-purple-900/20"
          >
            Intelligence
          </Button>
          <Button
            onClick={() => switchPanel('completeness')}
            size="sm"
            variant="outline"
            className="w-full bg-slate-900 border-blue-500 text-blue-400 hover:bg-blue-900/20"
          >
            Completeness
          </Button>
          <Button
            onClick={() => switchPanel('ai-quality')}
            size="sm"
            variant="outline"
            className="w-full bg-slate-900 border-pink-500 text-pink-400 hover:bg-pink-900/20"
          >
            AI Quality
          </Button>
        </div>
        
        {/* Debug Validators - Hidden UI, Log Only */}
        <FieldLifecycleValidator jobId={jobId} />
        <FieldDataLossValidator jobId={jobId} />
        <FieldPerformanceMonitor componentName="FieldProjectView" />
        <OfflineSyncValidator />
      </DebugUI>

      {/* Quick Create Task Dialog - ONE ACTIVE OVERLAY */}
      <CreateTaskDialog
        open={showCreateTask}
        onOpenChange={setShowCreateTask}
        jobId={jobId}
        onCreated={() => {
          setShowCreateTask(false);
          updateFieldQueryData(queryClient, jobId, 'TASKS', (old) => old);
        }}
      />

      {/* BOTTOM ACTION RAIL - Fixed, Always Visible, One-Hand Optimized */}
      <FieldBottomActionRail 
        jobId={jobId}
        jobName={job?.name || job?.job_name_field}
      />
    </div>
  );
}