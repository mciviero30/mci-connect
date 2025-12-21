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
    // Aplicar variables CSS al root
    const root = document.documentElement;
    const theme = currentTheme;

    // Aplicar colores primarios
    Object.entries(theme.colors.primary).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    // Aplicar colores de fondo
    Object.entries(theme.colors.background).forEach(([key, value]) => {
      root.style.setProperty(`--color-bg-${key}`, value);
    });

    // Aplicar colores de texto
    Object.entries(theme.colors.text).forEach(([key, value]) => {
      root.style.setProperty(`--color-text-${key}`, value);
    });

    // Aplicar bordes
    Object.entries(theme.colors.border).forEach(([key, value]) => {
      root.style.setProperty(`--color-border-${key}`, value);
    });

    // Aplicar gradientes
    Object.entries(theme.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value);
    });

    // Aplicar sombras
    Object.entries(theme.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Aplicar modo (light/dark)
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [currentTheme]);

  const value = {
    theme: currentTheme,
    appType: appType || 'connect',
    isField: appType === 'field',
    isConnect: appType !== 'field',
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};