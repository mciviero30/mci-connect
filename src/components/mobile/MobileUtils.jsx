import { useState, useEffect } from 'react';

/**
 * MOBILE UTILITIES - Enterprise-Grade Responsive System
 * Para pantallas 360px - 430px (iPhone SE, iPhone 12/13/14, Android estándar)
 */

// ====================================
// BREAKPOINTS
// ====================================
export const breakpoints = {
  xs: 360,   // Móviles pequeños (iPhone SE)
  sm: 640,   // Móviles grandes / tabletas pequeñas
  md: 768,   // Tabletas
  lg: 1024,  // Desktop pequeño
  xl: 1280,  // Desktop mediano
  '2xl': 1536, // Desktop grande
};

// ====================================
// HOOKS PARA DETECCIÓN DE PANTALLA
// ====================================
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < breakpoints.md);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < breakpoints.md);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

export const useIsSmallMobile = () => {
  const [isSmallMobile, setIsSmallMobile] = useState(window.innerWidth < breakpoints.sm);

  useEffect(() => {
    const handleResize = () => setIsSmallMobile(window.innerWidth < breakpoints.sm);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isSmallMobile;
};

export const useScreenSize = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    isXs: window.innerWidth < breakpoints.xs,
    isSm: window.innerWidth >= breakpoints.xs && window.innerWidth < breakpoints.md,
    isMd: window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg,
    isLg: window.innerWidth >= breakpoints.lg && window.innerWidth < breakpoints.xl,
    isXl: window.innerWidth >= breakpoints.xl,
    isMobile: window.innerWidth < breakpoints.md,
    isTablet: window.innerWidth >= breakpoints.md && window.innerWidth < breakpoints.lg,
    isDesktop: window.innerWidth >= breakpoints.lg,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setScreenSize({
        width,
        height,
        isXs: width < breakpoints.xs,
        isSm: width >= breakpoints.xs && width < breakpoints.md,
        isMd: width >= breakpoints.md && width < breakpoints.lg,
        isLg: width >= breakpoints.lg && width < breakpoints.xl,
        isXl: width >= breakpoints.xl,
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return screenSize;
};

// ====================================
// MOBILE CLASSES - RESPONSIVE UTILITIES
// ====================================
export const mobileClasses = {
  // Padding responsive
  containerPadding: 'px-3 sm:px-4 md:px-6 lg:px-8',
  sectionPadding: 'py-4 sm:py-6 md:py-8',
  
  // Grid responsive
  grid: {
    one: 'grid grid-cols-1',
    twoToOne: 'grid grid-cols-1 sm:grid-cols-2',
    threeToOne: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    fourToOne: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
    twoToTwo: 'grid grid-cols-2 md:grid-cols-2',
    autoFit: 'grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))]',
  },
  
  // Gaps responsive
  gap: {
    xs: 'gap-2 sm:gap-3',
    sm: 'gap-3 sm:gap-4',
    md: 'gap-4 sm:gap-5 md:gap-6',
    lg: 'gap-6 sm:gap-8',
  },
  
  // Typography responsive
  text: {
    xs: 'text-xs sm:text-sm',
    sm: 'text-sm sm:text-base',
    base: 'text-base sm:text-lg',
    lg: 'text-lg sm:text-xl',
    xl: 'text-xl sm:text-2xl md:text-3xl',
    '2xl': 'text-2xl sm:text-3xl md:text-4xl',
    '3xl': 'text-3xl sm:text-4xl md:text-5xl',
  },
  
  // Buttons responsive
  button: {
    sm: 'px-3 py-1.5 text-xs sm:px-4 sm:py-2 sm:text-sm',
    md: 'px-4 py-2 text-sm sm:px-5 sm:py-2.5 sm:text-base',
    lg: 'px-5 py-2.5 text-base sm:px-6 sm:py-3 sm:text-lg',
  },
  
  // Spacing
  marginBottom: {
    sm: 'mb-3 sm:mb-4',
    md: 'mb-4 sm:mb-6',
    lg: 'mb-6 sm:mb-8',
  },
  
  // Cards
  card: {
    padding: 'p-3 sm:p-4 md:p-5',
    rounded: 'rounded-lg sm:rounded-xl',
  },
  
  // Flex responsive
  flex: {
    colToRow: 'flex flex-col sm:flex-row',
    wrap: 'flex flex-wrap',
    between: 'flex items-center justify-between',
  },
  
  // Safe areas (iOS notch, etc.)
  safe: 'px-safe py-safe',
  
  // Touch targets (minimum 44x44px for mobile)
  touchTarget: 'min-h-[44px] min-w-[44px]',
};

// ====================================
// MOBILE-SPECIFIC STYLES
// ====================================
export const getMobileOptimizedClasses = (baseClasses, mobileOverride) => {
  return `${baseClasses} ${mobileOverride}`;
};

// ====================================
// RESPONSIVE IMAGE
// ====================================
export const getResponsiveImageClasses = () => {
  return 'w-full h-auto object-cover';
};

// ====================================
// MOBILE NAVIGATION HEIGHTS
// ====================================
export const navigationHeights = {
  mobile: {
    header: '56px',
    bottomNav: '64px',
    tabBar: '48px',
  },
  desktop: {
    header: '64px',
    sidebar: '100vh',
  },
};

// ====================================
// MOBILE DIALOG CLASSES
// ====================================
export const mobileDialog = {
  content: 'max-h-[90vh] overflow-y-auto',
  header: 'sticky top-0 bg-white dark:bg-slate-900 z-10 pb-4 border-b',
  footer: 'sticky bottom-0 bg-white dark:bg-slate-900 z-10 pt-4 border-t',
};

// ====================================
// TOUCH OPTIMIZATION
// ====================================
export const touchOptimization = {
  // Prevenir doble-tap zoom en iOS
  preventZoom: 'touch-manipulation',
  // Aumentar área de toque
  expandedTouch: 'relative before:absolute before:inset-[-8px]',
  // Feedback táctil
  activeFeedback: 'active:scale-95 transition-transform',
};

// ====================================
// MOBILE TABLE CLASSES
// ====================================
export const mobileTable = {
  // Tablas que se vuelven cards en móvil
  wrapper: 'overflow-x-auto -mx-4 sm:mx-0',
  table: 'min-w-full',
  // Cards en móvil
  mobileCard: 'flex flex-col gap-2 p-4 bg-white dark:bg-slate-800 rounded-lg border mb-3 md:hidden',
  // Tabla normal en desktop
  desktopTable: 'hidden md:table',
};

// ====================================
// UTILITIES
// ====================================
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};