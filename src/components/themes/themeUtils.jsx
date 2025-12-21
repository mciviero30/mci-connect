import { themes, components, typography, spacing, borderRadius } from './designSystem';

/**
 * Utilidades para aplicar estilos del design system
 */

// Obtener clase de título según el tema
export const getPageTitle = (appType) => {
  if (appType === 'field') {
    return 'bg-gradient-to-r from-orange-600 to-yellow-500 px-6 py-3 rounded-xl';
  }
  return 'bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 rounded-xl';
};

export const getPageTitleText = (appType) => {
  return 'text-2xl font-bold text-black';
};

// Obtener clase de botón primario
export const getPrimaryButton = (appType) => {
  return components.button.variants[appType === 'field' ? 'mciField' : 'mciConnect'].primary + ' ' + components.button.base + ' ' + components.button.sizes.md;
};

// Obtener clase de botón secundario
export const getSecondaryButton = (appType) => {
  return components.button.variants[appType === 'field' ? 'mciField' : 'mciConnect'].secondary + ' ' + components.button.base + ' ' + components.button.sizes.md;
};

// Obtener clase de card
export const getCard = (appType) => {
  return components.card[appType === 'field' ? 'mciField' : 'mciConnect'];
};

// Obtener clase de input
export const getInput = (appType) => {
  return components.input[appType === 'field' ? 'mciField' : 'mciConnect'];
};

// Obtener clase de badge
export const getBadge = (variant, appType) => {
  return components.badge[appType === 'field' ? 'mciField' : 'mciConnect'][variant || 'default'];
};

// Generar clases para componentes con el tema actual
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

// Obtener color primario del tema
export const getPrimaryColor = (appType) => {
  const theme = appType === 'field' ? themes.mciField : themes.mciConnect;
  return theme.colors.primary[500];
};

// Obtener gradiente primario del tema
export const getPrimaryGradient = (appType) => {
  const theme = appType === 'field' ? themes.mciField : themes.mciConnect;
  return theme.gradients.primary;
};