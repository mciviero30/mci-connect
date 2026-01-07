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
    // CRITICAL: ThemeProvider MUST NOT modify document.documentElement directly
    // Layout controls dark mode based on isFieldMode flag
    // This only applies CSS variables, NOT dark class
    
    const root = document.documentElement;
    const theme = currentTheme;

    // Apply CSS custom properties only
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-bg-${key}`, value);
    });

    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value);
    });

    Object.entries(theme.colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--color-border-${key}`, value);
    });

    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value);
    });

    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // DO NOT apply dark class here - Layout handles it
  }, [currentTheme]);

  const value = {
    theme: currentTheme,
    appType: appType || 'connect',
    isField: appType === 'field',
    isConnect: appType !== 'field',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};