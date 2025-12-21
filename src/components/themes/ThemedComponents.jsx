import React from 'react';
import { useTheme } from './ThemeProvider';
import { getPrimaryButton, getSecondaryButton, getCard, getInput, getBadge, getPageTitle, getPageTitleText } from './themeUtils';
import { cn } from '@/lib/utils';

/**
 * Componentes temáticos que automáticamente usan el tema correcto
 */

export const ThemedPageTitle = ({ children, className }) => {
  const { appType } = useTheme();
  return (
    <div className={cn(getPageTitle(appType), className)}>
      <h1 className={getPageTitleText(appType)} style={{ fontSize: '1.575rem' }}>
        {children}
      </h1>
    </div>
  );
};

export const ThemedButton = ({ children, variant = 'primary', size = 'md', className, ...props }) => {
  const { appType } = useTheme();
  const buttonClass = variant === 'primary' ? getPrimaryButton(appType) : getSecondaryButton(appType);
  
  return (
    <button className={cn(buttonClass, className)} {...props}>
      {children}
    </button>
  );
};

export const ThemedCard = ({ children, className, ...props }) => {
  const { appType } = useTheme();
  return (
    <div className={cn(getCard(appType), className)} {...props}>
      {children}
    </div>
  );
};

export const ThemedInput = ({ className, ...props }) => {
  const { appType } = useTheme();
  return (
    <input className={cn(getInput(appType), className)} {...props} />
  );
};

export const ThemedBadge = ({ children, variant = 'default', className }) => {
  const { appType } = useTheme();
  return (
    <span className={cn(getBadge(variant, appType), className)}>
      {children}
    </span>
  );
};