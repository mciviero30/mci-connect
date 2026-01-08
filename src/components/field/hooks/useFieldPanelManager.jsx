import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * FIELD PANEL MANAGER - Strict Single Panel Rule
 * 
 * Enforces that only ONE secondary panel can be open at a time
 * Prevents visual chaos from overlapping modals/sheets
 * 
 * Panel types:
 * - 'dialog' - Full modals (Task, Photo, etc.)
 * - 'sheet' - Bottom sheets (Dimension, Incident)
 * - 'inline' - Sidebar panels (no conflict)
 */

export function useFieldPanelManager() {
  const [openPanel, setOpenPanel] = useState(null);
  const panelTypeRef = useRef(null);

  // Open a panel - automatically closes any other open panel
  const openPanelExclusive = useCallback((panelId, panelType = 'dialog') => {
    // If same panel, do nothing
    if (openPanel === panelId) return;

    // Close current panel first
    if (openPanel) {
      setOpenPanel(null);
      panelTypeRef.current = null;
      
      // Brief delay before opening new panel for smooth transition
      setTimeout(() => {
        setOpenPanel(panelId);
        panelTypeRef.current = panelType;
      }, 150);
    } else {
      setOpenPanel(panelId);
      panelTypeRef.current = panelType;
    }
  }, [openPanel]);

  // Close current panel
  const closePanel = useCallback(() => {
    setOpenPanel(null);
    panelTypeRef.current = null;
  }, []);

  // Check if specific panel is open
  const isPanelOpen = useCallback((panelId) => {
    return openPanel === panelId;
  }, [openPanel]);

  // Get current panel type
  const getCurrentPanelType = useCallback(() => {
    return panelTypeRef.current;
  }, []);

  return {
    openPanel,
    openPanelExclusive,
    closePanel,
    isPanelOpen,
    getCurrentPanelType,
  };
}