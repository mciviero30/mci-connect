import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft,
  Loader2,
  AlertCircle,
  MapPin,
  Ruler,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import Field Components - FASE 4 (UX): Simplified imports
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldDimensionsView from '@/components/field/FieldDimensionsView.jsx';
import FieldCaptureView from '@/components/field/FieldCaptureView.jsx';
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
  // FASE 4 (UX): Default to 'plans' instead of 'work' - Plans-first approach
  const [activePanel, setActivePanel] = React.useState('plans');
  const [showCreateTask, setShowCreateTask] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const [showDebugDrawer, setShowDebugDrawer] = React.useState(false);
  
  // Debug mode detection - MUST BE BEFORE EARLY RETURNS
  const isDebugMode = useFieldDebugMode(currentUser);

  // Panel switcher - closes others automatically
  const switchPanel = (panelId) => {
    setActivePanel(panelId);
  };

  // FASE 4 (UX): Close panel - return to plans (new default)
  const closePanel = () => {
    setActivePanel('plans');
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

  // Listen for navigation events from overview cards
  React.useEffect(() => {
    const handleFieldNavigate = (event) => {
      const { panel } = event.detail;
      if (panel) {
        switchPanel(panel);
      }
    };
    window.addEventListener('field:navigate', handleFieldNavigate);
    return () => window.removeEventListener('field:navigate', handleFieldNavigate);
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

  // FASE 4 (UX): Render active panel - Simplified 3-panel structure
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'plans':
        // FASE 4: Plans is now the DEFAULT view (no back button needed)
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
      
      case 'measurements':
        // FASE 4: Dedicated measurement workspace
        return <FieldDimensionsView jobId={jobId} jobName={job?.name || job?.job_name_field} />;
      
      case 'capture':
        // FASE 4: Unified capture section (photos + reports + incidents)
        return <FieldCaptureView jobId={jobId} jobName={job?.name || job?.job_name_field} plans={plans} />;
      
      default:
        // Fallback to Plans
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
    }
  };

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
          <ArrowLeft className="w-5 h-5" />
        </Button>

        {/* Project Info - FASE 4: Simplified header, always visible */}
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
              {job.address && (
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  📍 {job.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Online/Offline Status - FASE 4: Always visible */}
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} shadow-lg`} />
              <Badge className={`flex-shrink-0 text-xs px-3 py-1.5 font-bold ${
                job.status === 'active' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/40'
                  : 'bg-slate-500/20 text-slate-400 border-slate-500/40'
              } border rounded-full`}>
                {job.status === 'active' ? 'ACTIVE' : job.status?.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT - Dynamic panel based on navigation */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {renderActivePanel()}
      </div>

      {/* FASE 4 (UX): Persistent status indicators - Moved to header area */}
      <div className="flex-shrink-0">
        <UniversalSyncIndicator jobId={jobId} />
        <PhotoUploadProgress jobId={jobId} />
      </div>

      {/* FASE 4 (UX): Debug drawer - Hidden, admin-only */}
      {isDebugMode && (
        <FieldDebugDrawer 
          isVisible={showDebugDrawer} 
          onClose={() => setShowDebugDrawer(false)}
          currentUser={currentUser}
        />
      )}

      {/* FASE 4 (UX): SIMPLIFIED BOTTOM NAV - 3 Tabs Only */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t-2 border-slate-700 shadow-2xl pb-safe">
        <div className="flex items-center justify-around px-2 py-2">
          {[
            { id: 'plans', label: language === 'es' ? 'Planos' : 'Plans', icon: MapPin },
            { id: 'measurements', label: language === 'es' ? 'Medir' : 'Measure', icon: Ruler },
            { id: 'capture', label: language === 'es' ? 'Capturar' : 'Capture', icon: Camera },
          ].map(tab => {
            const isActive = activePanel === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActivePanel(tab.id)}
                className={`flex flex-col items-center justify-center gap-1.5 flex-1 min-h-[68px] rounded-xl touch-manipulation transition-all ${
                  isActive 
                    ? 'bg-gradient-to-br from-orange-600 to-yellow-500 text-black scale-105 shadow-xl' 
                    : 'text-slate-300 active:bg-slate-800'
                }`}
                style={{ minWidth: '80px' }}
              >
                <Icon className={`w-6 h-6 ${isActive ? 'text-black' : 'text-white'}`} strokeWidth={2.5} />
                <span className={`text-xs font-bold uppercase ${isActive ? 'text-black' : 'text-slate-300'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      

    </div>
  );
}