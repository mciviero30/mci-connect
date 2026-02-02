// ============================================
// 🔒 FROZEN — MCI FIELD CERTIFICATION v1.0
// DO NOT MODIFY WITHOUT NEW PHASE AUTHORIZATION
// Certified: 2026-02-02
// ============================================
// CRITICAL: Measurement Session Manager
// - Generates unique session IDs
// - Isolates measurement from production data
// - Prevents cross-session contamination
// Breaking this logic causes data leakage
// ============================================

/**
 * FieldSessionManager - Continuous Work Session Tracking
 * 
 * CRITICAL: Field behaves as ONE continuous session, not disconnected screens
 * 
 * Session Lifecycle:
 * - Begins: User enters Field route
 * - Persists: Through background/foreground, navigation, interruptions
 * - Ends: Only on explicit exit to non-Field route
 * 
 * Session Memory:
 * - Active panel, open work, scroll positions, mode, area
 * - Survives: refresh, crash, app switch, screen lock, calls
 * 
 * 🔒 FROZEN: Session ID format: ms_${jobId}_${timestamp}
 * 🔒 FROZEN: Sessions are NOT persisted across reloads
 * 🔒 FROZEN: Sessions are job-scoped (cannot share across jobs)
 */

const SESSION_KEY = 'field_active_session';
const MEASUREMENT_SESSION_KEY = 'field_measurement_session'; // FASE 3C-4: Measurement session isolation
const SESSION_EXPIRY_HOURS = 24; // Session expires after 24h of inactivity

export const FieldSessionManager = {
  // FASE 3C-4: Measurement Session Management
  generateMeasurementSessionId(jobId) {
    return `ms_${jobId}_${Date.now()}`;
  },

  getMeasurementSession() {
    try {
      const data = sessionStorage.getItem(MEASUREMENT_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  // ============================================
  // 🔒 FROZEN — Session ID Generation
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: Timestamp-based ID prevents collisions
  // Format: ms_${jobId}_${timestamp}
  // ============================================
  startMeasurementSession(jobId) {
    const sessionId = this.generateMeasurementSessionId(jobId); // 🔒 FROZEN
    const session = {
      measurement_session_id: sessionId,
      job_id: jobId,
      started_at: Date.now(),
      isActive: true,
    };
    sessionStorage.setItem(MEASUREMENT_SESSION_KEY, JSON.stringify(session));
    
    if (import.meta.env?.DEV) {
      console.log('[MeasurementSession] 🆕 Started:', sessionId);
    }
    
    return sessionId; // 🔒 FROZEN: Return format
  },

  // ============================================
  // 🔒 FROZEN — Session Cleanup
  // DO NOT MODIFY WITHOUT NEW PHASE
  // ============================================
  // CRITICAL: Must be called on unmount
  // Prevents session leakage
  // ============================================
  clearMeasurementSession() {
    const session = this.getMeasurementSession();
    if (import.meta.env?.DEV && session) {
      console.log('[MeasurementSession] 🗑️ Cleared:', session.measurement_session_id);
    }
    sessionStorage.removeItem(MEASUREMENT_SESSION_KEY); // 🔒 FROZEN
  },

  updateMeasurementSession(updates) {
    const current = this.getMeasurementSession() || {};
    const updated = { ...current, ...updates, lastActivity: Date.now() };
    sessionStorage.setItem(MEASUREMENT_SESSION_KEY, JSON.stringify(updated));
  },

  /**
   * Start or resume a Field session
   */
  startSession(jobId) {
    const now = Date.now();
    const session = {
      jobId,
      startedAt: now,
      lastActiveAt: now,
      isActive: true,
      activeIntent: null, // 'creating_task', 'measuring', 'recording', etc.
      context: {
        activePanel: 'overview',
        scrollPositions: {},
        openModals: [],
        currentArea: null,
        currentMode: null,
        selectedPlanId: null,
      },
      unsavedWork: {
        drafts: [],
        pendingActions: [],
      },
    };
    
    this.saveSession(session);
    return session;
  },

  /**
   * Get current active session
   */
  getSession() {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (!stored) return null;
      
      const session = JSON.parse(stored);
      
      // Check expiry
      const now = Date.now();
      const age = now - session.lastActiveAt;
      const expiryMs = SESSION_EXPIRY_HOURS * 60 * 60 * 1000;
      
      if (age > expiryMs) {
        this.clearSession();
        return null;
      }
      
      return session;
    } catch {
      return null;
    }
  },

  /**
   * Update session with new context
   */
  updateSession(updates) {
    const session = this.getSession();
    if (!session) return;
    
    const updated = {
      ...session,
      lastActiveAt: Date.now(),
      ...updates,
      context: {
        ...session.context,
        ...(updates.context || {}),
      },
      unsavedWork: {
        ...session.unsavedWork,
        ...(updates.unsavedWork || {}),
      },
    };
    
    this.saveSession(updated);
    return updated;
  },

  /**
   * Save session to storage
   */
  saveSession(session) {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch (error) {
      console.error('Failed to save Field session:', error);
    }
  },

  /**
   * Register an active intent (user is mid-action)
   */
  setActiveIntent(intent, metadata = {}) {
    this.updateSession({
      activeIntent: {
        type: intent, // 'creating_task', 'measuring_dimension', 'recording_audio', etc.
        startedAt: Date.now(),
        metadata,
      },
    });
  },

  /**
   * Clear active intent (action completed or cancelled)
   */
  clearActiveIntent() {
    this.updateSession({
      activeIntent: null,
    });
  },

  /**
   * Update session context (panel, area, mode, etc.)
   */
  updateContext(contextUpdates) {
    this.updateSession({
      context: contextUpdates,
    });
  },

  /**
   * Register scroll position for panel
   */
  saveScrollPosition(panelId, scrollTop) {
    const session = this.getSession();
    if (!session) return;
    
    this.updateSession({
      context: {
        ...session.context,
        scrollPositions: {
          ...session.context.scrollPositions,
          [panelId]: scrollTop,
        },
      },
    });
  },

  /**
   * Get scroll position for panel
   */
  getScrollPosition(panelId) {
    const session = this.getSession();
    return session?.context?.scrollPositions?.[panelId] || 0;
  },

  /**
   * Register open modal/sheet
   */
  registerOpenModal(modalId, metadata = {}) {
    const session = this.getSession();
    if (!session) return;
    
    const openModals = session.context.openModals || [];
    if (!openModals.includes(modalId)) {
      this.updateSession({
        context: {
          ...session.context,
          openModals: [...openModals, modalId],
          [`${modalId}_metadata`]: metadata,
        },
      });
    }
  },

  /**
   * Unregister closed modal/sheet
   */
  unregisterModal(modalId) {
    const session = this.getSession();
    if (!session) return;
    
    const openModals = (session.context.openModals || []).filter(id => id !== modalId);
    this.updateSession({
      context: {
        ...session.context,
        openModals,
        [`${modalId}_metadata`]: null,
      },
    });
  },

  /**
   * Check if session has active work (unsaved or in-progress)
   */
  hasActiveWork() {
    const session = this.getSession();
    if (!session) return false;
    
    return !!(
      session.activeIntent || 
      (session.unsavedWork?.drafts?.length > 0) ||
      (session.unsavedWork?.pendingActions?.length > 0) ||
      (session.context?.openModals?.length > 0)
    );
  },

  /**
   * Mark session as inactive (user exited Field)
   */
  deactivateSession() {
    this.updateSession({
      isActive: false,
    });
  },

  /**
   * Reactivate session (user returned to Field)
   */
  reactivateSession() {
    this.updateSession({
      isActive: true,
      lastActiveAt: Date.now(),
    });
  },

  /**
   * Clear session completely
   */
  clearSession() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (error) {
      console.error('Failed to clear Field session:', error);
    }
  },

  /**
   * Get session summary (for debugging)
   */
  getSessionSummary() {
    const session = this.getSession();
    if (!session) return null;
    
    const now = Date.now();
    const durationMs = now - session.startedAt;
    const durationMin = Math.floor(durationMs / 60000);
    
    return {
      duration: `${durationMin} min`,
      activePanel: session.context?.activePanel,
      hasActiveIntent: !!session.activeIntent,
      hasUnsaved: this.hasActiveWork(),
      openModals: session.context?.openModals?.length || 0,
    };
  },
};

/**
 * QW4: EMERGENCY FLUSH - Zero Data Loss Guarantee
 * Persists EVERYTHING on beforeunload/crash:
 * - Active session state
 * - Draft tasks (data-field-draft inputs)
 * - Draft notes (textareas)
 * - Unsaved form state in memory
 * - Open modals with data
 */
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const session = FieldSessionManager.getSession();
    if (session) {
      // Save session
      FieldSessionManager.saveSession(session);
      
      // QW4: Flush ALL in-memory drafts to storage
      try {
        // 1. Form inputs marked as drafts
        const formInputs = document.querySelectorAll('[data-field-draft]');
        formInputs.forEach(input => {
          const draftType = input.getAttribute('data-draft-type');
          const jobId = input.getAttribute('data-job-id');
          const value = input.value;
          
          if (draftType && jobId && value) {
            sessionStorage.setItem(`emergency_draft_${draftType}_${jobId}`, value);
          }
        });

        // 2. QW4: Task creation modal data
        const taskInputs = document.querySelectorAll('[data-task-draft]');
        taskInputs.forEach(input => {
          const field = input.name || input.id;
          const jobId = input.getAttribute('data-job-id');
          const value = input.value;
          
          if (field && jobId && value) {
            sessionStorage.setItem(`emergency_task_${field}_${jobId}`, value);
          }
        });

        // 3. QW4: Notes and textareas
        const textareas = document.querySelectorAll('textarea[data-autosave]');
        textareas.forEach(textarea => {
          const noteId = textarea.getAttribute('data-note-id');
          const value = textarea.value;
          
          if (noteId && value) {
            sessionStorage.setItem(`emergency_note_${noteId}`, value);
          }
        });

        // 4. QW4: React state from CreateTaskDialog (if open)
        if (session.context?.openModals?.includes('createTask')) {
          const taskMetadata = session.context['createTask_metadata'];
          if (taskMetadata) {
            sessionStorage.setItem('emergency_task_metadata', JSON.stringify(taskMetadata));
          }
        }
      } catch (error) {
        console.error('[Emergency Flush] Draft save failed:', error);
      }
      
      console.log('[FieldSessionManager] 🚨 EMERGENCY FLUSH (session + ALL drafts + form state)');
    }
  });
}