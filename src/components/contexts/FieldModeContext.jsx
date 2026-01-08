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
    const stored = sessionStorage.getItem('focusMode');
    if (!stored || stored === 'false') return false;
    
    try {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object' && parsed.timestamp) {
        const ONE_HOUR = 60 * 60 * 1000;
        
        // Expire after 1 hour
        if (Date.now() - parsed.timestamp > ONE_HOUR) {
          sessionStorage.removeItem('focusMode');
          return false;
        }
        
        return parsed.active === true;
      }
      
      // Legacy boolean format - treat as active
      return stored === 'true';
    } catch {
      return stored === 'true';
    }
  });

  // Persist Focus Mode to session storage with timestamp
  useEffect(() => {
    if (isFocusMode) {
      sessionStorage.setItem('focusMode', JSON.stringify({
        active: true,
        timestamp: Date.now()
      }));
    } else {
      sessionStorage.removeItem('focusMode');
    }
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