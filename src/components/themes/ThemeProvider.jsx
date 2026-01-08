import React, { createContext, useContext, useEffect, useState } from 'react';
import { themes } from './designSystem';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, appType }) => {
  const [currentTheme, setCurrentTheme] = useState(
    appType === 'field' ? themes.mciField : themes.mciConnect
  );

  useEffect(() => {
    // REMOVED: Global CSS variable injection - causes theme leakage
    // Field uses scoped dark class on its own root div
    // No global mutations allowed - Field is isolated module
  }, [currentTheme]);

  const value = {
    theme: currentTheme,
    appType: appType || 'connect',
    isField: appType === 'field',
    isConnect: appType !== 'field',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};