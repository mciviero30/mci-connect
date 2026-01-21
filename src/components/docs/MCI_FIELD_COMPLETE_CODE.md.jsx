# MCI FIELD - CÓDIGO COMPLETO Y DOCUMENTACIÓN

---

## 📱 QUÉ ES MCI FIELD

**MCI Field** es la aplicación móvil-first para trabajo de campo dentro del ecosistema MCI Connect.

### **Características Principales**
- ✅ **Offline-First**: Funciona sin internet, sincroniza después
- ✅ **Mobile-Optimized**: Touch targets 44px+, gestos, una mano
- ✅ **Session Persistence**: Continúa donde lo dejaste
- ✅ **Dark Theme**: Legibilidad en exteriores
- ✅ **Real-Time Sync**: Cambios instantáneos entre dispositivos
- ✅ **Geolocation Aware**: GPS tracking automático

### **Conexión con MCI Connect**
```
MCI FIELD es una VISTA dentro de MCI Connect
├─ NO es app separada
├─ Comparte mismo database
├─ Embedded en Layout de Connect
└─ Data sync instantáneo vía base44.entities
```

### **Flujo de Datos**
```
FIELD → Entity (Task/Photo/Dimension) → DB → CONNECT
  ↓                                              ↓
IndexedDB (offline)                      Real-time update
```

---

## 📂 ARQUITECTURA DE ARCHIVOS

### **PÁGINAS PRINCIPALES (3)**
```
pages/Field.jsx              → Landing page (lista de proyectos)
pages/FieldProject.jsx       → Vista individual de proyecto
pages/FieldMeasurements.jsx  → Sistema de mediciones (dimensiones)
```

### **NAVEGACIÓN & ESTADO**
```
components/field/FieldNav.jsx                  → Tabs navigation
components/field/FieldReentryPrompt.jsx        → Session restoration UI
components/field/QuickSearchDialog.jsx         → Cmd+K search
components/field/GlobalChecklistsManager.jsx   → Templates globales
components/field/FieldErrorBoundary.jsx        → Error handling
```

### **GESTIÓN DE SESIÓN**
```
components/field/services/FieldSessionManager.jsx → Session tracking
components/field/FieldProjectState.jsx            → State management hook
components/field/FieldOfflineManager.jsx          → Offline sync
components/field/hooks/usePersistentState.jsx     → localStorage with expiry
components/field/config/fieldQueryConfig.jsx      → React Query settings
components/field/fieldQueryKeys.jsx               → Query key factory
```

### **CONTEXTOS**
```
components/contexts/FieldModeContext.jsx   → Dark mode + fullscreen
components/field/FieldContextProvider.jsx  → Field-specific context
components/field/FieldOfflineManager.jsx   → Offline context
```

### **VISTAS DE CONTENIDO**
```
components/field/FieldProjectView.jsx      → Router de panels
components/field/FieldProjectOverview.jsx  → Overview cards
components/field/FieldInstallation.jsx     → Vista de trabajo principal
components/field/FieldTasksView.jsx        → Lista de tareas
components/field/FieldPlansView.jsx        → Blueprint viewer
components/field/FieldPhotosView.jsx       → Galería de fotos
components/field/FieldChecklistsView.jsx   → Checklists view
components/field/FieldDimensionsView.jsx   → Measurement system
```

### **COMPONENTES DE DIMENSIONES**
```
components/field/dimensions/DimensionCanvas.jsx            → Canvas overlay
components/field/dimensions/DimensionDialog.jsx            → Input form
components/field/dimensions/DimensionLegend.jsx            → Legend display
components/field/dimensions/ProductionConfirmationDialog.jsx → Export validation
components/field/dimensions/DimensionValidation.jsx        → Business rules
```

### **UTILIDADES & HOOKS**
```
components/field/hooks/useFieldLifecycle.jsx     → Mobile lifecycle protection
components/field/hooks/useUnsavedChanges.jsx     → Exit confirmation
components/field/hooks/useFieldSession.jsx       → Session awareness
components/field/hooks/useFieldDebugMode.jsx     → Debug mode detection
components/field/hooks/useFieldPanelManager.jsx  → Panel state manager
```

---

## 💻 CÓDIGO PRINCIPAL

### **1. LANDING PAGE - Field.jsx**

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useUI } from '@/components/contexts/FieldModeContext';
import { usePersistentState } from '@/components/field/hooks/usePersistentState';
import { FIELD_STABLE_QUERY_CONFIG, FIELD_QUERY_KEYS } from '@/components/field/config/fieldQueryConfig';
import { FieldSessionManager } from '@/components/field/services/FieldSessionManager';

// Icons
import { Plus, Search, ArrowLeft, MapPin, RotateCcw, Ruler } from 'lucide-react';

// Components
import FieldNav from '@/components/field/FieldNav.jsx';
import QuickSearchDialog from '@/components/field/QuickSearchDialog.jsx';
import FieldReentryPrompt from '@/components/field/FieldReentryPrompt.jsx';
import GlobalChecklistsManager from '@/components/field/GlobalChecklistsManager.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary.jsx';

export default function Field() {
  const { setIsFieldMode } = useUI();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Persistent state
  const [filter, setFilter] = usePersistentState('field_filter', 'active');
  const [activeTab, setActiveTab] = usePersistentState('field_active_tab', 'jobs');
  const [newProject, setNewProject, clearNewProject] = usePersistentState(
    'field_new_project',
    { name: '', description: '', address: '', customer_name: '' }
  );
  
  // UI state
  const [showNewProject, setShowNewProject] = useState(false);
  const [showQuickSearch, setShowQuickSearch] = useState(false);
  const [showReentryPrompt, setShowReentryPrompt] = useState(false);
  const [previousSession, setPreviousSession] = useState(null);

  // Set Field Mode
  useEffect(() => {
    setIsFieldMode(true);
    return () => setIsFieldMode(false);
  }, [setIsFieldMode]);

  // Check previous session
  useEffect(() => {
    const session = FieldSessionManager.getSession();
    if (session?.isActive && session?.jobId) {
      setPreviousSession(session);
      setShowReentryPrompt(true);
    }
  }, []);

  // Fetch data
  const { data: user } = useQuery({
    queryKey: FIELD_QUERY_KEYS.USER(),
    queryFn: () => base44.auth.me(),
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: jobs = [], isLoading } = useQuery({
    queryKey: FIELD_QUERY_KEYS.JOBS(),
    queryFn: () => base44.entities.Job.list('-created_date'),
    enabled: !!user,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['field-all-tasks'],
    queryFn: () => base44.entities.Task.list('-created_date'),
    enabled: jobs.length > 0,
    ...FIELD_STABLE_QUERY_CONFIG,
  });

  // Mutations
  const createJobMutation = useMutation({
    mutationFn: (data) => base44.entities.Job.create(data),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: FIELD_QUERY_KEYS.JOBS() });
      setShowNewProject(false);
      if (clearNewProject) await clearNewProject();
      toast.success('Project created');
    },
  });

  // Handlers
  const handleResumeSession = () => {
    if (!previousSession?.jobId) return;
    const params = new URLSearchParams({ 
      id: previousSession.jobId,
      panel: previousSession.context?.activePanel || 'overview'
    });
    navigate(`${createPageUrl('FieldProject')}?${params.toString()}`);
  };

  const handleStartFresh = () => {
    FieldSessionManager.updateSession({
      context: { activePanel: 'overview' }
    });
    setShowReentryPrompt(false);
  };

  // Filter jobs
  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || job.status === filter;
    return matchesSearch && matchesFilter;
  });

  const activeProjects = jobs.filter(j => j.status === 'active').length;

  return (
    <FieldErrorBoundary>
      {/* Re-entry Prompt */}
      {showReentryPrompt && previousSession && (
        <FieldReentryPrompt
          session={previousSession}
          jobName={previousJob?.name}
          onResume={handleResumeSession}
          onStartFresh={handleStartFresh}
        />
      )}

      <div data-field-mode="true" className="min-h-screen bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 dark">
        {/* HEADER */}
        <div className="px-6 py-8 bg-gradient-to-r from-black to-slate-900">
          <Button 
            onClick={() => {
              const session = FieldSessionManager.getSession();
              if (session?.isActive) {
                // Show exit confirmation
              } else {
                setIsFieldMode(false);
                navigate(createPageUrl('Dashboard'));
              }
            }}
            className="absolute top-4 left-4 bg-slate-700/80 hover:bg-slate-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to MCI Connect
          </Button>

          <div className="flex flex-col items-center text-white">
            <img src="[MCI_FIELD_LOGO]" alt="MCI Field" className="h-20" />
            <h1 className="text-4xl font-bold">MCI FIELD</h1>
            <p className="text-slate-300">
              {activeProjects > 0 
                ? `You have ${activeProjects} active job${activeProjects > 1 ? 's' : ''}`
                : 'No active jobs today'}
            </p>
          </div>
        </div>

        {/* PRIMARY ACTION */}
        {previousSession?.isActive ? (
          <Button onClick={handleResumeSession} className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-black font-bold min-h-[64px]">
            <RotateCcw className="w-6 h-6 mr-3" />
            Resume Field Work
          </Button>
        ) : activeProjects > 0 ? (
          <Button className="w-full bg-gradient-to-r from-orange-600 to-yellow-500 text-black font-bold min-h-[64px]">
            <MapPin className="w-6 h-6 mr-3" />
            Start Field Work
          </Button>
        ) : null}

        {/* NAVIGATION */}
        <FieldNav 
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onNewTask={() => setShowNewProject(true)}
        />

        {/* CONTENT */}
        {activeTab === 'jobs' && (
          <div className="space-y-3">
            {filteredJobs.slice(0, 3).map(job => (
              <Link key={job.id} to={createPageUrl(`FieldProject?id=${job.id}`)}>
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 hover:bg-slate-700">
                  <h3 className="text-base font-bold text-white">{job.name}</h3>
                  <p className="text-xs text-slate-400">{job.customer_name}</p>
                  <Badge className="bg-green-500/20 text-green-400">TODAY</Badge>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'measurements' && (
          <div className="space-y-3">
            {filteredJobs.slice(0, 5).map(job => (
              <Link key={job.id} to={createPageUrl(`FieldMeasurements?id=${job.id}`)}>
                <div className="bg-slate-800 border border-purple-600/30 rounded-xl p-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-purple-400" />
                    {job.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        )}

        {activeTab === 'checklists' && (
          <GlobalChecklistsManager />
        )}

        {/* DIALOGS */}
        <QuickSearchDialog open={showQuickSearch} onOpenChange={setShowQuickSearch} />
      </div>
    </FieldErrorBoundary>
  );
}
```

---

### **2. PROYECTO INDIVIDUAL - FieldProject.jsx**

```javascript
import React, { useEffect } from 'react';
import { ThemeProvider } from '@/components/themes/ThemeProvider';
import { FieldOfflineProvider } from '@/components/field/FieldOfflineManager.jsx';
import { FieldContextProvider } from '@/components/field/FieldContextProvider.jsx';
import FieldErrorBoundary from '@/components/field/FieldErrorBoundary';
import { useFieldProjectState } from '@/components/field/FieldProjectState.jsx';
import FieldProjectView from '@/components/field/FieldProjectView.jsx';
import { useUI } from '@/components/contexts/FieldModeContext';

export default function FieldProject() {
  const { setIsFieldMode } = useUI();
  
  // Get jobId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get('id');
  
  // Centralized state hook
  const state = useFieldProjectState(jobId);

  // Set Field Mode
  useEffect(() => {
    setIsFieldMode(true);
    return () => setIsFieldMode(false);
  }, [setIsFieldMode]);

  return (
    <FieldErrorBoundary>
      <div data-field-mode="true" className="dark">
        <ThemeProvider appType="field">
          <FieldOfflineProvider jobId={jobId}>
            <FieldContextProvider jobId={jobId}>
              <FieldProjectView {...state} jobId={jobId} />
            </FieldContextProvider>
          </FieldOfflineProvider>
        </ThemeProvider>
      </div>
    </FieldErrorBoundary>
  );
}
```

---

### **3. VISTA DE PROYECTO - FieldProjectView.jsx**

```javascript
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Panels
import FieldProjectOverview from '@/components/field/FieldProjectOverview.jsx';
import FieldPlansView from '@/components/field/FieldPlansView.jsx';
import FieldTasksView from '@/components/field/FieldTasksView.jsx';
import FieldChecklistsView from '@/components/field/FieldChecklistsView.jsx';
import FieldInstallation from '@/components/field/FieldInstallation.jsx';

// UI Components
import { OfflineStatusBadge } from '@/components/field/FieldOfflineManager.jsx';
import UniversalSyncIndicator from '@/components/field/UniversalSyncIndicator.jsx';
import PhotoUploadProgress from '@/components/field/PhotoUploadProgress.jsx';
import FieldBottomActionRail from './FieldBottomActionRail';
import AccessDenied from '@/components/field/AccessDenied';

export default function FieldProjectView({
  job, tasks, plans, currentUser, hasAccess, isLoading, jobId, queryClient
}) {
  const [activePanel, setActivePanel] = React.useState('work');
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  // Switch panel (closes others automatically)
  const switchPanel = (panelId) => setActivePanel(panelId);
  const closePanel = () => setActivePanel('work');

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

  // EARLY RETURNS - Loading & Errors
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl p-12 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">Project Not Found</h3>
          <Link to={createPageUrl('Field')}>
            <Button className="bg-orange-600 mt-6">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return <AccessDenied />;
  }

  // Render active panel
  const renderActivePanel = () => {
    switch (activePanel) {
      case 'plans':
        return <FieldPlansView jobId={jobId} plans={plans} tasks={tasks} />;
      case 'tasks':
        return <FieldTasksView jobId={jobId} tasks={tasks} currentUser={currentUser} />;
      case 'checklists':
        return <FieldChecklistsView jobId={jobId} tasks={tasks} />;
      case 'work':
      default:
        return <FieldInstallation job={job} tasks={tasks} jobId={jobId} />;
    }
  };

  return (
    <div data-field-scope="true" className="min-h-screen bg-gradient-to-b from-slate-700 to-slate-900 flex flex-col dark">
      {/* HEADER */}
      <div className="sticky top-0 z-50 bg-gradient-to-br from-black to-slate-900 border-b border-slate-700">
        <Button onClick={() => window.history.back()} className="absolute top-4 left-4 bg-slate-800/90">
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div className="px-6 py-4 pt-16 sm:pt-4">
          <div className="sm:ml-32">
            <h1 className="text-2xl font-bold text-white">{job.name}</h1>
            {job.client_name_field && (
              <p className="text-xs text-slate-400">{job.client_name_field}</p>
            )}
            <Badge className="bg-green-500/20 text-green-400">
              {job.status?.toUpperCase()}
            </Badge>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 overflow-y-auto">
        {renderActivePanel()}
      </div>

      {/* PERSISTENT BOTTOM ELEMENTS */}
      <OfflineStatusBadge />
      <UniversalSyncIndicator jobId={jobId} />
      <PhotoUploadProgress jobId={jobId} />

      {/* BOTTOM ACTION RAIL */}
      <FieldBottomActionRail 
        jobId={jobId}
        jobName={job?.name}
        jobStatus={job?.status}
      />
    </div>
  );
}
```

---

### **4. SESSION MANAGER - FieldSessionManager.jsx**

```javascript
/**
 * FieldSessionManager - Continuous Work Session Tracking
 * Session persists through: refresh, crash, app switch, calls
 */

const SESSION_KEY = 'field_active_session';
const SESSION_EXPIRY_HOURS = 24;

export const FieldSessionManager = {
  // Start session
  startSession(jobId) {
    const session = {
      jobId,
      startedAt: Date.now(),
      lastActiveAt: Date.now(),
      isActive: true,
      activeIntent: null,
      context: {
        activePanel: 'overview',
        scrollPositions: {},
        openModals: [],
      },
      unsavedWork: {
        drafts: [],
        pendingActions: [],
      },
    };
    
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  // Get session
  getSession() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      
      // Check expiry
      const age = Date.now() - session.lastActiveAt;
      if (age > SESSION_EXPIRY_HOURS * 60 * 60 * 1000) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch {
      return null;
    }
  },

  // Update session
  updateSession(updates) {
    const session = this.getSession();
    if (!session) return;
    
    const updated = {
      ...session,
      lastActiveAt: Date.now(),
      ...updates,
      context: { ...session.context, ...(updates.context || {}) },
    };
    
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return updated;
  },

  // Active intent (mid-action)
  setActiveIntent(intent, metadata = {}) {
    this.updateSession({
      activeIntent: { type: intent, startedAt: Date.now(), metadata }
    });
  },

  clearActiveIntent() {
    this.updateSession({ activeIntent: null });
  },

  // Scroll positions
  saveScrollPosition(panelId, scrollTop) {
    const session = this.getSession();
    if (!session) return;
    
    this.updateSession({
      context: {
        scrollPositions: {
          ...session.context.scrollPositions,
          [panelId]: scrollTop,
        },
      },
    });
  },

  getScrollPosition(panelId) {
    return this.getSession()?.context?.scrollPositions?.[panelId] || 0;
  },

  // Check if session has active work
  hasActiveWork() {
    const session = this.getSession();
    return !!(
      session?.activeIntent || 
      session?.unsavedWork?.drafts?.length > 0 ||
      session?.context?.openModals?.length > 0
    );
  },

  // Clear session
  clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  },
};
```

---

### **5. OFFLINE MANAGER - FieldOfflineManager.jsx**

```javascript
import React, { useState, useEffect, createContext, useContext } from 'react';
import { base44 } from '@/api/base44Client';

// IndexedDB
const DB_NAME = 'mci_field_offline';
const DB_VERSION = 1;

const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('tasks')) {
        db.createObjectStore('tasks', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('plans')) {
        db.createObjectStore('plans', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('pendingActions')) {
        db.createObjectStore('pendingActions', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Save data offline
export const saveOfflineData = async (storeName, data) => {
  try {
    const db = await openDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    
    if (Array.isArray(data)) {
      await store.clear();
      for (const item of data) {
        await store.put(item);
      }
    } else {
      await store.put(data);
    }
    
    db.close();
    return true;
  } catch (error) {
    console.error('Error saving offline:', error);
    return false;
  }
};

// Queue action for later sync
export const queueOfflineAction = async (action) => {
  try {
    const db = await openDB();
    const tx = db.transaction('pendingActions', 'readwrite');
    const store = tx.objectStore('pendingActions');
    
    await store.add({
      ...action,
      timestamp: new Date().toISOString(),
      synced: false
    });
    
    db.close();
    return true;
  } catch (error) {
    console.error('Error queuing action:', error);
    return false;
  }
};

// Offline Context
const OfflineContext = createContext();
export const useOffline = () => useContext(OfflineContext);

export function FieldOfflineProvider({ children, jobId }) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncNow(); // Auto-sync
    };
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncNow = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      const pending = await getPendingActions();
      const syncedIds = [];
      
      for (const action of pending) {
        try {
          if (action.type === 'createTask') {
            await base44.entities.Task.create(action.data);
          }
          syncedIds.push(action.id);
        } catch (err) {
          console.error('Sync failed:', err);
        }
      }
      
      if (syncedIds.length > 0) {
        await clearSyncedActions(syncedIds);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <OfflineContext.Provider value={{ isOnline, pendingCount, syncNow, isSyncing }}>
      {children}
    </OfflineContext.Provider>
  );
}
```

---

### **6. PERSISTENT STATE HOOK - usePersistentState.jsx**

```javascript
import { useState, useEffect, useRef } from 'react';

/**
 * Hook for persistent state with auto-expiry
 * Survives: refresh, app switch, background
 */
export function usePersistentState(key, initialValue, options = {}) {
  const { expiryHours = 24 } = options;

  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        
        // Check expiry
        if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
          localStorage.removeItem(key);
          return initialValue;
        }
        
        return parsed.value;
      }
    } catch (error) {
      console.error('Failed to restore state:', error);
    }
    return initialValue;
  });

  const saveTimeoutRef = useRef(null);

  // Auto-save on state change (debounced)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const data = {
          value: state,
          timestamp: Date.now(),
          expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
        };
        localStorage.setItem(key, JSON.stringify(data));
      } catch (error) {
        console.error('Failed to save state:', error);
      }
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state, key, expiryHours]);

  // Immediate save on lifecycle events
  useEffect(() => {
    const persistState = () => {
      const data = {
        value: state,
        timestamp: Date.now(),
        expiresAt: Date.now() + (expiryHours * 60 * 60 * 1000),
      };
      localStorage.setItem(key, JSON.stringify(data));
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        persistState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', persistState);
    document.addEventListener('pagehide', persistState);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', persistState);
      document.removeEventListener('pagehide', persistState);
    };
  }, [key, state, expiryHours]);

  const clearState = () => {
    localStorage.removeItem(key);
    setState(initialValue);
  };

  return [state, setState, clearState];
}
```

---

### **7. FIELD MODE CONTEXT - FieldModeContext.jsx**

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * UI Context - Manages fullscreen modes
 * - isFieldMode: Automatic fullscreen for Field pages
 * - isFocusMode: User-controlled fullscreen
 */
const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within UIProvider');
  return context;
};

export const UIProvider = ({ children }) => {
  const [isFieldMode, setIsFieldMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(() => {
    const stored = sessionStorage.getItem('focusMode');
    return stored === 'true';
  });

  // Persist Focus Mode
  useEffect(() => {
    if (isFocusMode) {
      sessionStorage.setItem('focusMode', 'true');
    } else {
      sessionStorage.removeItem('focusMode');
    }
  }, [isFocusMode]);

  // Hide sidebar if Field OR Focus mode
  const shouldHideSidebar = isFieldMode || isFocusMode;

  const toggleFocusMode = React.useCallback(() => {
    setIsFocusMode(prev => !prev);
  }, []);

  const value = React.useMemo(() => ({
    isFieldMode,
    setIsFieldMode,
    isFocusMode,
    setIsFocusMode,
    toggleFocusMode,
    shouldHideSidebar,
  }), [isFieldMode, isFocusMode, shouldHideSidebar, toggleFocusMode]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};
```

---

### **8. QUERY CONFIGURATION - fieldQueryConfig.jsx**

```javascript
/**
 * MCI Field Query Configuration
 * Prevents all auto-refetches - essential for mobile stability
 */

import { FIELD_QUERY_KEYS } from '@/components/field/fieldQueryKeys';

export { FIELD_QUERY_KEYS };

// Standard stable config - NO REFETCHES
export const FIELD_STABLE_QUERY_CONFIG = {
  staleTime: Infinity,
  gcTime: Infinity,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: false,
  retry: false,
};

// Invalidate Field queries only (isolated)
export function invalidateFieldQueries(queryClient, jobId, queryTypes = []) {
  if (queryTypes.length === 0) {
    Object.values(FIELD_QUERY_KEYS).forEach(keyFn => {
      const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
      queryClient.invalidateQueries({ queryKey: key, exact: true });
    });
  } else {
    queryTypes.forEach(type => {
      const keyFn = FIELD_QUERY_KEYS[type];
      if (keyFn) {
        const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
        queryClient.invalidateQueries({ queryKey: key, exact: true });
      }
    });
  }
}

// Optimistic updates (no invalidation)
export function updateFieldQueryData(queryClient, jobId, queryType, updater) {
  const keyFn = FIELD_QUERY_KEYS[queryType];
  if (!keyFn) return;
  
  const key = typeof keyFn === 'function' ? keyFn(jobId) : keyFn();
  queryClient.setQueryData(key, updater);
}
```

---

### **9. QUERY KEYS - fieldQueryKeys.jsx**

```javascript
/**
 * MCI Field Query Keys - Single Source of Truth
 */

export const FIELD_QUERY_KEYS = {
  FIELD_DIMENSIONS: (jobId) => ['field-dimensions', jobId],
  VERTICAL_MEASUREMENTS: (jobId) => ['vertical-measurements', jobId],
  BENCHMARKS: (jobId) => ['benchmarks', jobId],
  USER: (jobId) => ['field-currentUser', jobId],
  JOB: (jobId) => ['field-job', jobId],
  TASKS: (jobId) => ['field-tasks', jobId],
  WORK_UNITS: (jobId) => ['work-units', jobId],
  PLANS: (jobId) => ['field-plans', jobId],
  PHOTOS: (jobId) => ['field-photos', jobId],
  DOCUMENTS: (jobId) => ['field-documents', jobId],
  MEMBERS: (jobId) => ['field-members', jobId],
  CHAT: (jobId) => ['chat-messages', jobId],
  ASSIGNMENTS: (jobId) => ['user-job-access', jobId],
  CUSTOMERS: () => ['field-customers'],
  JOBS: () => ['field-jobs'],
};
```

---

### **10. ERROR BOUNDARY - FieldErrorBoundary.jsx**

```javascript
import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

class FieldErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('MCI Field Error (contained):', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Persist for debugging
    sessionStorage.setItem('field_last_error', JSON.stringify({
      message: error.toString(),
      timestamp: Date.now(),
    }));
  }

  handleReset = () => {
    // Clear error without reload - preserve data
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-slate-700 to-slate-900 flex items-center justify-center dark">
          <div className="bg-slate-800 border-2 border-red-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-3">MCI Field Error</h1>
            <p className="text-slate-300 mb-6">Something went wrong. Your data is safe.</p>

            <div className="flex gap-3">
              <Button onClick={this.handleReset} className="bg-orange-600">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Link to={createPageUrl('Dashboard')}>
                <Button variant="outline" className="border-slate-600">
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FieldErrorBoundary;
```

---

## 🎯 FLUJOS CRÍTICOS

### **FLOW 1: Entrar a Field**
```
1. User clicks "MCI Field" en navigation
2. Layout.js → setIsFieldMode(true) → hide sidebar
3. Field.jsx mounts
4. FieldSessionManager checks previous session
5. If session exists → show FieldReentryPrompt
6. User chooses: Resume (restore context) OR Start Fresh
```

### **FLOW 2: Trabajar en Proyecto**
```
1. User selects project → navigate to FieldProject?id=123
2. FieldProject → FieldProjectView (wrapper + providers)
3. useFieldProjectState hook fetches:
   - Job data
   - Tasks
   - Plans
   - Photos
   - Members
4. FieldSessionManager.startSession(jobId)
5. Data persisted to IndexedDB (offline backup)
```

### **FLOW 3: Crear Tarea Offline**
```
1. User creates task (no internet)
2. queueOfflineAction({ type: 'createTask', data: {...} })
3. Task saved to IndexedDB
4. UI shows optimistic update
5. OfflineStatusBadge displays "1 pending"
6. When online → syncNow() executes action
7. DB updated, IndexedDB cleared
```

### **FLOW 4: Session Restoration**
```
1. User switches apps or locks screen
2. usePersistentState saves:
   - activePanel
   - scrollPositions
   - openModals
   - currentMode
3. User returns to Field
4. FieldSessionManager.getSession()
5. Context restored:
   - Scroll to saved position
   - Reopen active panel
   - Resume active intent
```

---

## 🔑 COMPONENTES CLAVE

### **Navigation**
- `FieldNav.jsx` - Tab switcher (jobs, measurements, checklists, search)
- `QuickSearchDialog.jsx` - Cmd+K instant search
- `FieldBottomActionRail.jsx` - Fixed bottom buttons

### **Panels**
- `TasksPanel.jsx` - Task list view
- `PhotosPanel.jsx` - Photo gallery
- `BlueprintPanel.jsx` - Plan viewer
- `ProgressPanel.jsx` - Job progress
- `IncidentsPanel.jsx` - Safety incidents

### **Utilities**
- `FieldSessionManager.jsx` - Session lifecycle
- `FieldOfflineManager.jsx` - Offline sync
- `usePersistentState.jsx` - Auto-save state
- `FieldErrorBoundary.jsx` - Graceful errors

---

## 📊 ESTADÍSTICAS DEL CÓDIGO

**Páginas:** 3 principales
**Componentes:** ~100+ (field subfolder)
**Hooks:** ~15 custom hooks
**Services:** ~30 servicios especializados
**Contexts:** 3 providers
**Líneas de código:** ~15,000+ (solo Field)

---

## 🔗 INTEGRACIONES

### **Con MCI Connect**
- **Jobs** - Shared entity (Job)
- **Tasks** - Shared entity (Task)
- **Photos** - Shared entity (Photo)
- **Plans** - Shared entity (Plan)
- **Documents** - Shared entity (Document)
- **Chat** - Shared entity (ChatMessage)

### **Con Servicios Externos**
- **Google Drive** - Upload photos/plans
- **Google Maps** - Geocoding addresses
- **SendGrid** - Notifications
- **Base44 Core** - UploadFile, InvokeLLM

---

## 🎨 DESIGN SYSTEM

### **Colores Field**
```css
Primary: Orange (#FF8C00) - Action buttons
Secondary: Yellow (#FFB800) - Highlights
Success: Green (#22C55E) - Confirmations
Danger: Red (#EF4444) - Errors
Background: Slate-900 (#0F172A) - Dark theme
```

### **Typography**
```css
Headings: font-bold text-xl-2xl
Body: font-medium text-sm
Labels: font-semibold text-xs uppercase
```

### **Spacing**
```css
Touch targets: min-h-[44px] (Apple guideline)
Padding: p-4 to p-6 (generous)
Gaps: gap-3 to gap-4
```

---

## 🚀 PRINCIPIOS DE DISEÑO

### **Mobile-First**
- Touch targets ≥ 44px
- One-hand operation
- Bottom-heavy UI
- Swipe gestures

### **Offline-First**
- IndexedDB cache
- Queue pending actions
- Optimistic UI
- Auto-sync on reconnect

### **Session-Aware**
- Persistent across interruptions
- Context restoration
- Unsaved work protection
- Smart re-entry prompts

### **Performance**
- No auto-refetch
- Infinite cache (staleTime: Infinity)
- Lazy loading images
- Debounced saves

---

## ⚠️ REGLAS CRÍTICAS

### **1. NO AUTO-REFETCH**
```javascript
// ALWAYS use FIELD_STABLE_QUERY_CONFIG
const { data } = useQuery({
  queryKey: FIELD_QUERY_KEYS.TASKS(jobId),
  queryFn: () => base44.entities.Task.filter({ job_id: jobId }),
  ...FIELD_STABLE_QUERY_CONFIG, // ← CRITICAL
});
```

### **2. Invalidate Scoped Queries Only**
```javascript
// ✅ CORRECT - Field-scoped
queryClient.invalidateQueries({ 
  queryKey: FIELD_QUERY_KEYS.TASKS(jobId), 
  exact: true 
});

// ❌ WRONG - Global invalidation
queryClient.invalidateQueries({ queryKey: ['tasks'] });
```

### **3. Always Check Session Before Exit**
```javascript
const handleExit = () => {
  const session = FieldSessionManager.getSession();
  if (session?.isActive) {
    // Show exit confirmation
  } else {
    navigate(createPageUrl('Dashboard'));
  }
};
```

### **4. Persist State on Lifecycle Events**
```javascript
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Save everything NOW
      saveState();
    }
  };
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

---

## 🔧 CONFIGURACIÓN

### **Dark Mode Scoping**
```css
/* globals.css */
[data-field-mode="true"],
[data-field-scope="true"],
[data-field-error="true"] {
  @apply dark;
}
```

### **Layout Integration**
```javascript
// Layout.js
const isFieldPage = location.pathname.includes('/Field');

{!shouldHideSidebar && !isFieldPage && (
  <Sidebar>...</Sidebar>
)}
```

---

## 📈 PRÓXIMAS MEJORAS

### **Pendientes**
- [ ] Voice-to-text dimensions
- [ ] AI task suggestions
- [ ] OCR plan recognition
- [ ] Offline PDF export
- [ ] Multi-device sync

### **Deuda Técnica**
- Multiple offline managers (unificar)
- Session expiry edge cases
- Photo compression pre-upload
- Better error recovery UX

---

## 🎓 CÓMO USAR ESTE CÓDIGO

### **Para Developers**
1. Lee `FieldProject.jsx` primero (entry point)
2. Luego `useFieldProjectState.jsx` (state logic)
3. Después `FieldSessionManager.jsx` (session tracking)
4. Finalmente componentes individuales según necesites

### **Para Debugging**
1. Abre `FieldDebugDrawer` (solo en dev mode)
2. Revisa `sessionStorage` → `field_active_session`
3. Revisa `IndexedDB` → `mci_field_offline`
4. Busca console logs: `[Field]`, `[FieldSession]`

### **Para Testing**
1. Activa airplane mode
2. Crea tareas/fotos
3. Verifica IndexedDB tiene pending actions
4. Desactiva airplane mode
5. Observa auto-sync

---

**RESUMEN EJECUTIVO:**

MCI Field es un **subsistema mobile-optimized** dentro de MCI Connect, diseñado para captura de datos en sitio con capacidades offline-first, session persistence y UI dark optimizada para exteriores. Utiliza arquitectura de providers anidados (Offline → Context → Theme) con state management centralizado vía custom hooks y localStorage/sessionStorage para persistencia cross-session.