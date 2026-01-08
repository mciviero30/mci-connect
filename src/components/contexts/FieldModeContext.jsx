import React, { createContext, useContext, useState, useEffect } from 'react';

/**
 * UI Context - Single source of truth for layout states
 * Manages:
 * - isFieldMode: Automatic fullscreen for MCI Field pages
 * - isFocusMode: User-controlled fullscreen for other pages
 */
const UIContext = createContext();

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within UIProvider');
  }
  return context;
};

// Backward compatibility
export const useFieldMode = useUI;

export const UIProvider = ({ children }) => {
  const [isFieldMode, setIsFieldMode] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(() => {
    // Persist Focus Mode per session
    return sessionStorage.getItem('focusMode') === 'true';
  });

  // Persist Focus Mode to session storage
  useEffect(() => {
    sessionStorage.setItem('focusMode', isFocusMode ? 'true' : 'false');
  }, [isFocusMode]);

  // Computed: sidebar should be hidden if Field OR Focus mode
  const shouldHideSidebar = isFieldMode || isFocusMode;

  const value = {
    isFieldMode,
    setIsFieldMode,
    isFocusMode,
    setIsFocusMode,
    toggleFocusMode: () => setIsFocusMode(prev => !prev),
    shouldHideSidebar,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
};

// Backward compatibility
export const FieldModeProvider = UIProvider;