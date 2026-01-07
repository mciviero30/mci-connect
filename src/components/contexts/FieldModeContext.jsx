import React, { createContext, useContext, useState } from 'react';

/**
 * Field Mode Context
 * Scoped state to track when user is in MCI Field
 * Prevents theme leakage to global app
 */
const FieldModeContext = createContext();

export const useFieldMode = () => {
  const context = useContext(FieldModeContext);
  if (!context) {
    throw new Error('useFieldMode must be used within FieldModeProvider');
  }
  return context;
};

export const FieldModeProvider = ({ children }) => {
  const [isFieldMode, setIsFieldMode] = useState(false);

  const value = {
    isFieldMode,
    setIsFieldMode,
  };

  return (
    <FieldModeContext.Provider value={value}>
      {children}
    </FieldModeContext.Provider>
  );
};