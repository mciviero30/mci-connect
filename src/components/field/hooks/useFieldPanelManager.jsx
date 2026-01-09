import { useState, useCallback, useEffect } from 'react';

/**
 * CENTRAL PANEL MANAGER
 * Ensures ONLY ONE PANEL ACTIVE AT A TIME
 * Prevents visual chaos and overlays
 */
export const useFieldPanelManager = (initialPanel = 'work') => {
  const [activePanel, setActivePanel] = useState(initialPanel);
  const [previousPanel, setPreviousPanel] = useState(null);

  // Switch panel - ALWAYS close others
  const switchPanel = useCallback((panelId) => {
    setPreviousPanel(activePanel);
    setActivePanel(panelId);
  }, [activePanel]);

  // Close current panel - return to work view
  const closePanel = useCallback(() => {
    setActivePanel('work');
    setPreviousPanel(null);
  }, []);

  // Check if specific panel is active
  const isPanelActive = useCallback((panelId) => {
    return activePanel === panelId;
  }, [activePanel]);

  return {
    activePanel,
    previousPanel,
    switchPanel,
    closePanel,
    isPanelActive,
  };
};