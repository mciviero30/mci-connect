import { useEffect, useCallback, useRef } from 'react';
import { FieldSessionManager } from '../services/FieldSessionManager';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

/**
 * useFieldSession - Session-aware Field navigation and state
 * 
 * CRITICAL: Ensures Field behaves as continuous work session
 * - Restores context on mount
 * - Saves context on navigation
 * - Warns on exit with active work
 */
export function useFieldSession({ 
  jobId, 
  activePanel, 
  currentMode, 
  currentArea,
  hasUnsaved,
  onContextRestore,
}) {
  const navigate = useNavigate();
  const sessionInitialized = useRef(false);
  const panelRef = useRef(activePanel);

  // Initialize or resume session on mount
  useEffect(() => {
    if (sessionInitialized.current) return;
    
    let session = FieldSessionManager.getSession();
    
    // Resume existing session if jobId matches
    if (session && session.jobId === jobId && session.isActive) {
      // Restore context
      if (onContextRestore && session.context) {
        onContextRestore(session.context);
      }
      
      FieldSessionManager.reactivateSession();
    } else {
      // Start new session
      session = FieldSessionManager.startSession(jobId);
    }
    
    sessionInitialized.current = true;
  }, [jobId, onContextRestore]);

  // Update session context on changes
  useEffect(() => {
    if (!sessionInitialized.current) return;
    
    FieldSessionManager.updateContext({
      activePanel,
      currentMode,
      currentArea,
    });
    
    panelRef.current = activePanel;
  }, [activePanel, currentMode, currentArea]);

  // Track active intent when mode changes
  useEffect(() => {
    if (!currentMode || currentMode === 'viewing') {
      FieldSessionManager.clearActiveIntent();
      return;
    }
    
    // Map mode to intent
    const intentMap = {
      editing: 'editing_data',
      recording: 'recording_audio',
      capturing: 'capturing_photo',
      measuring: 'measuring_dimension',
      reporting: 'reporting_incident',
    };
    
    const intent = intentMap[currentMode];
    if (intent) {
      FieldSessionManager.setActiveIntent(intent, {
        panel: activePanel,
        area: currentArea,
        startedAt: Date.now(),
      });
    }
  }, [currentMode, activePanel, currentArea]);

  // Save scroll position on panel change
  const saveScrollForPanel = useCallback((panelId, scrollTop) => {
    FieldSessionManager.saveScrollPosition(panelId, scrollTop);
  }, []);

  // Get scroll position for panel
  const getScrollForPanel = useCallback((panelId) => {
    return FieldSessionManager.getScrollPosition(panelId);
  }, []);

  // Safe exit handler
  const handleSafeExit = useCallback((destination = 'Dashboard') => {
    const hasActiveWork = FieldSessionManager.hasActiveWork();
    
    if (hasActiveWork || hasUnsaved) {
      // Return false to trigger warning dialog
      return false;
    }
    
    // Safe to exit - deactivate session
    FieldSessionManager.deactivateSession();
    navigate(createPageUrl(destination));
    return true;
  }, [hasUnsaved, navigate]);

  // Deactivate session on unmount (explicit exit)
  useEffect(() => {
    return () => {
      // Only deactivate if not navigating within Field
      const isFieldRoute = window.location.pathname.includes('/Field');
      if (!isFieldRoute) {
        FieldSessionManager.deactivateSession();
      }
    };
  }, []);

  return {
    saveScrollForPanel,
    getScrollForPanel,
    handleSafeExit,
    sessionSummary: FieldSessionManager.getSessionSummary(),
  };
}