import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Loader2,
  AlertCircle,
  Plus,
  X as XIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components
import FieldProjectOverview from '@/components/field/FieldProjectOverview.jsx';
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import FieldInstallation from '@/components/field/FieldInstallation.jsx';
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
import FieldDebugDrawer from '@/components/field/FieldDebugDrawer.jsx';



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
  // HOOKS MUST BE FIRST - BEFORE ANY EARLY RETURNS
  const [activePanel, setActivePanel] = React.useState('work');
  const [showCreateTask, setShowCreateTask] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showDebugDrawer, setShowDebugDrawer] = React.useState(false);
  
  // Debug mode detection - MUST BE BEFORE EARLY RETURNS
  const isDebugMode = useFieldDebugMode(currentUser);

  // Panel switcher - closes others automatically
  const switchPanel = (panelId) => {
    setActivePanel(panelId);
  };

  // Close panel - return to work view
  const closePanel = () => {
    setActivePanel('work');
  };

  // Monitor online status
  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Handle safe exit
  const handleSafeExit = () => {
    if (window.confirm('Exit Field? Any unsaved work will be lost.')) {
      window.history.back();
    }
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

  // WORK MODE: Installation view (no measurements)
  const renderWorkMode = () => (
    <FieldInstallation 
      job={job} 
      tasks={tasks} 
      plans={plans} 
      jobId={jobId} 
      currentUser={currentUser}
    />
  );

  // Work mode only - no debug panels in this view
  // Debug panels are accessed via FieldDebugDrawer

  return (
    <div data-field-scope="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 flex flex-col overflow-hidden dark">
      {/* HEADER FIJO - Simple, Clear */}
      <div className="flex-shrink-0 sticky top-0 z-50 bg-gradient-to-br from-black to-slate-900 border-b border-slate-700 shadow-xl">
        {/* Back Button - Top Left - Smart Exit */}
        <Button 
          onClick={handleSafeExit}
          className="absolute top-4 left-4 z-10 bg-slate-800/90 hover:bg-slate-700 text-white border border-slate-600 shadow-xl backdrop-blur-sm min-h-[48px] px-3 rounded-xl touch-manipulation"
        >
          <ArrowLeft className="w-4 h-4 sm:mr-2" />
          <span className="hidden sm:inline">Back to MCI Field</span>
        </Button>

        {/* Debug Toggle - Top Right (Admin/Debug Only) */}
        {isDebugMode && (
          <Button 
            onClick={() => setShowDebugDrawer(!showDebugDrawer)}
            className="absolute top-4 right-4 z-10 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 border border-yellow-500/50 shadow-xl backdrop-blur-sm min-h-[48px] px-3 rounded-xl touch-manipulation text-xs"
          >
            🔧 Debug
          </Button>
        )}

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

      {/* MAIN CONTENT - Installation view only */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {renderWorkMode()}
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

      {/* Debug Drawer - Isolated, non-intrusive */}
      <FieldDebugDrawer 
        isVisible={showDebugDrawer} 
        onClose={() => setShowDebugDrawer(false)}
        currentUser={currentUser}
      />

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
        jobStatus={job?.status}
      />
      

    </div>
  );
}