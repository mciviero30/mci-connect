/**
 * Factory Mode Context
 * 
 * Separates Factory mode from Field mode with strict data flow rules
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

const FactoryModeContext = createContext(null);

/**
 * Mode types
 */
export const MODES = {
  FIELD: 'field',
  FACTORY: 'factory'
};

/**
 * Factory Mode Provider
 */
export function FactoryModeProvider({ children, mode = MODES.FIELD }) {
  const [currentMode, setCurrentMode] = useState(mode);
  
  const value = {
    mode: currentMode,
    isFactoryMode: currentMode === MODES.FACTORY,
    isFieldMode: currentMode === MODES.FIELD,
    setMode: setCurrentMode
  };
  
  return (
    <FactoryModeContext.Provider value={value}>
      {children}
    </FactoryModeContext.Provider>
  );
}

/**
 * Hook to access Factory mode state
 */
export function useFactoryMode() {
  const context = useContext(FactoryModeContext);
  
  if (!context) {
    // Default to Field mode if not in provider
    return {
      mode: MODES.FIELD,
      isFactoryMode: false,
      isFieldMode: true,
      setMode: () => {}
    };
  }
  
  return context;
}

/**
 * Detect mode from URL or context
 */
export function detectMode(location) {
  if (location.pathname.includes('/Factory') || location.pathname.includes('/Production')) {
    return MODES.FACTORY;
  }
  
  if (location.pathname.includes('/Field')) {
    return MODES.FIELD;
  }
  
  return MODES.FIELD; // Default
}