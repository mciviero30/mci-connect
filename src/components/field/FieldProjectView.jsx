import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Ruler,
  Camera,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components - FASE 4 (UX): Simplified imports
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldPhotosView from '@/components/field/FieldPhotosView.jsx';
import FieldCaptureView from '@/components/field/FieldCaptureView.jsx';
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
import FieldDebugDrawer from '@/components/field/FieldDebugDrawer.jsx';



// ============================================
// 🔒 FROZEN — MCI FIELD CERTIFICATION v1.0
// DO NOT MODIFY WITHOUT NEW PHASE AUTHORIZATION
// Certified: 2026-02-02
// ============================================
// CRITICAL: 3-tab navigation structure
// - Plans (default)
// - Measure (session-isolated)
// - Capture (photos/reports)
// Breaking this structure requires new phase
// ============================================

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
  // PASO 2: Removed panel state — vertical sections, no tabs
  const [showCreateTask, setShowCreateTask] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showDebugDrawer, setShowDebugDrawer] = React.useState(false);
  const [language] = React.useState('en');
  
  // Debug mode detection
  const isDebugMode = useFieldDebugMode(currentUser);

  // FASE 5 PERF: Stable online status monitoring
  React.useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // Cleanup guaranteed
    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // PASO 2: Removed panel navigation listener (no tabs)

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

  // PASO 2: Removed panel switching — all sections render vertically

  // Work mode only - no debug panels in this view
  // Debug panels are accessed via FieldDebugDrawer

  return (
    <div data-field-scope="true" className="min-h-screen bg-slate-900 flex flex-col overflow-hidden dark">
      {/* FASE 4 POLISH: Cleaner header */}
      <div className="flex-shrink-0 sticky top-0 z-50 bg-slate-900 border-b-2 border-slate-700 shadow-2xl">
        {/* FASE 4 POLISH: Larger, clearer back button */}
        <Button 
          onClick={handleSafeExit}
          className="absolute top-4 left-4 z-10 bg-slate-800 hover:bg-slate-700 text-white border-2 border-slate-600 shadow-2xl min-h-[52px] min-w-[52px] rounded-xl touch-manipulation active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        {/* FASE 4 POLISH: Professional header with clear status */}
        <div className="px-4 sm:px-6 py-5 pt-16 sm:pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 sm:ml-14">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate mb-2">
                {job.name || job.job_name_field}
              </h1>
              {job.client_name_field && (
                <p className="text-sm text-slate-300 truncate mb-1">
                  {job.client_name_field}
                </p>
              )}
              {job.address && (
                <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {job.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* FASE 4 POLISH: Larger status indicators */}
              <div className="flex items-center gap-2 bg-slate-800 px-3 py-2 rounded-full border border-slate-700">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} shadow-lg`} />
                <span className="text-xs font-bold text-slate-400">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <Badge className={`text-xs px-4 py-2 font-bold ${
                job.status === 'active' 
                  ? 'bg-green-500 text-black'
                  : 'bg-slate-700 text-slate-300'
              } rounded-full shadow-lg`}>
                {job.status === 'active' ? '● ACTIVE' : job.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* PASO 2: Vertical sections — scroll through all content */}
      <div className="flex-1 overflow-y-auto pb-6" style={{ WebkitOverflowScrolling: 'touch' }}>
        {/* Section 1: Plans */}
        <section className="mb-8">
          <div className="px-4 py-3 bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">Plans & Drawings</h2>
            <p className="text-xs text-slate-400 mt-0.5">Final approved drawings</p>
          </div>
          <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />
        </section>

        {/* Section 2: Tasks */}
        <section className="mb-8">
          <div className="px-4 py-3 bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">Tasks</h2>
            <p className="text-xs text-slate-400 mt-0.5">Work items & progress</p>
          </div>
          <FieldTasksView jobId={jobId} tasks={tasks} plans={plans} currentUser={currentUser} />
        </section>

        {/* Section 3: Photos */}
        <section className="mb-8">
          <div className="px-4 py-3 bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">Photos</h2>
            <p className="text-xs text-slate-400 mt-0.5">Progress documentation</p>
          </div>
          <FieldPhotosView jobId={jobId} plans={plans} />
        </section>

        {/* Section 4: Reports (from FieldCaptureView temporarily) */}
        <section className="mb-8">
          <div className="px-4 py-3 bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">Reports & Issues</h2>
            <p className="text-xs text-slate-400 mt-0.5">Daily logs, incidents, voice notes</p>
          </div>
          <FieldCaptureView jobId={jobId} jobName={job?.name || job?.job_name_field} plans={plans} />
        </section>

        {/* Section 5: Forms */}
        <section className="mb-8">
          <div className="px-4 py-3 bg-slate-800/50 border-b-2 border-slate-700 sticky top-0 z-30 backdrop-blur-sm">
            <h2 className="text-lg font-bold text-white">Forms & Checklists</h2>
            <p className="text-xs text-slate-400 mt-0.5">Quality control & inspections</p>
          </div>
          <FieldChecklistsView jobId={jobId} />
        </section>
      </div>

      {/* Persistent status indicators */}
      <div className="flex-shrink-0">
        <UniversalSyncIndicator jobId={jobId} />
        <PhotoUploadProgress jobId={jobId} />
      </div>

      {/* Debug drawer - Admin only */}
      {isDebugMode && (
        <FieldDebugDrawer 
          isVisible={showDebugDrawer} 
          onClose={() => setShowDebugDrawer(false)}
          currentUser={currentUser}
        />
      )}

      {/* PASO 2: Bottom action rail — Quick Capture, Add Task, Start Measure */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black via-slate-900 to-slate-900 border-t-2 border-slate-700 shadow-2xl pb-safe backdrop-blur-sm">
        <div className="flex items-center justify-around px-3 py-3 gap-2">
          <Button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              // Quick photo capture logic here
            }}
            className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
          >
            <Camera className="w-5 h-5" />
            <span className="text-xs font-bold">Capture</span>
          </Button>
          
          <Button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              setShowCreateTask(true);
            }}
            className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] rounded-xl bg-gradient-to-br from-orange-600 to-yellow-500 text-black shadow-2xl"
          >
            <Plus className="w-6 h-6" />
            <span className="text-xs font-extrabold">Add Task</span>
          </Button>
          
          <Button
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(10);
              window.location.href = createPageUrl('FieldMeasurements') + `?id=${jobId}`;
            }}
            className="flex flex-col items-center justify-center gap-1 flex-1 min-h-[64px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600"
          >
            <Ruler className="w-5 h-5" />
            <span className="text-xs font-bold">Measure</span>
          </Button>
        </div>
      </div>
      

    </div>
  );
}