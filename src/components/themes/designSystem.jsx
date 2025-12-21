/**
 * DESIGN SYSTEM CENTRALIZADO
 * MCI Connect (Claro/Azul) vs MCI Field (Oscuro/Naranja)
 * 
 * Este archivo controla TODOS los estilos visuales del proyecto.
 * Para cambiar colores, tipografía o espaciados → edita AQUÍ.
 */

export const themes = {
  // ====================================
  // MCI CONNECT - Tema Claro Corporativo
  // ====================================
  mciConnect: {
    name: 'MCI Connect',
    mode: 'light',
    
    colors: {
      // Colores primarios (azul corporativo del logo)
      primary: {
        50: '#EBF5FF',
        100: '#E1EFFE',
        200: '#C3DDFD',
        300: '#A4CAFE',
        400: '#60A5FA',
        500: '#3B82F6',  // Color principal
        600: '#2563EB',
        700: '#1D4ED8',
        800: '#1E40AF',
        900: '#1E3A8A',
      },
      
      // Colores de fondo
      background: {
        primary: '#F8FAFC',    // Fondo principal claro
        secondary: '#F1F5F9',  // Fondo secundario
        card: '#FFFFFF',       // Cards y contenedores
        hover: '#F8FAFC',      // Hover states
      },
      
      // Colores de texto
      text: {
        primary: '#0F172A',    // Texto principal oscuro
        secondary: '#475569',  // Texto secundario
        muted: '#94A3B8',      // Texto desactivado
        inverse: '#FFFFFF',    // Texto sobre fondos oscuros
      },
      
      // Bordes
      border: {
        primary: '#E2E8F0',
        secondary: '#CBD5E1',
        focus: '#3B82F6',
      },
      
      // Estados
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      info: '#3B82F6',
    },
    
    gradients: {
      primary: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
      card: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
      header: 'linear-gradient(90deg, #1E3A8A 0%, #3B82F6 100%)',
    },
    
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
    },
  },
  
  // ====================================
  // MCI FIELD - Tema Oscuro con Naranja
  // ====================================
  mciField: {
    name: 'MCI Field',
    mode: 'dark',
    
    colors: {
      // Colores primarios (naranja-amarillo del logo)
      primary: {
        50: '#FFF7ED',
        100: '#FFEDD5',
        200: '#FED7AA',
        300: '#FDBA74',
        400: '#FB923C',
        500: '#FF8C00',  // Naranja principal
        600: '#EA580C',
        700: '#C2410C',
        800: '#9A3412',
        900: '#7C2D12',
      },
      
      secondary: {
        500: '#FFB800',  // Amarillo acento
      },
      
      // Colores de fondo (oscuros)
      background: {
        primary: '#0F172A',    // Fondo principal oscuro
        secondary: '#1E293B',  // Fondo secundario
        card: '#334155',       // Cards y contenedores
        cardDark: '#1E293B',   // Cards más oscuros
        hover: '#475569',      // Hover states
      },
      
      // Colores de texto
      text: {
        primary: '#F8FAFC',    // Texto principal claro
        secondary: '#CBD5E1',  // Texto secundario
        muted: '#64748B',      // Texto desactivado
        inverse: '#0F172A',    // Texto sobre fondos claros
      },
      
      // Bordes
      border: {
        primary: '#475569',
        secondary: '#334155',
        focus: '#FF8C00',
      },
      
      // Estados
      success: '#10B981',
      warning: '#FFB800',
      error: '#EF4444',
      info: '#3B82F6',
    },
    
    gradients: {
      primary: 'linear-gradient(135deg, #FF8C00 0%, #FFB800 100%)',
      card: 'linear-gradient(135deg, #334155 0%, #1E293B 100%)',
      header: 'linear-gradient(90deg, #FF8C00 0%, #FFB800 100%)',
      accent: 'linear-gradient(to right, #FF8C00, #FFB800)',
    },
    
    shadows: {
      sm: '0 1px 2px 0 rgba(0, 0, 0, 0.3)',
      md: '0 4px 6px -1px rgba(0, 0, 0, 0.4)',
      lg: '0 10px 15px -3px rgba(255, 140, 0, 0.2)',
      xl: '0 20px 25px -5px rgba(255, 140, 0, 0.3)',
      glow: '0 0 20px rgba(255, 140, 0, 0.4)',
    },
  },
};

// ====================================
// TIPOGRAFÍA COMPARTIDA
// ====================================
export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
    mono: "'Fira Code', 'Courier New', monospace",
  },
  
  fontSize: {
    xs: '0.75rem',      // 12px
    sm: '0.875rem',     // 14px
    base: '1rem',       // 16px
    lg: '1.125rem',     // 18px
    xl: '1.25rem',      // 20px
    '2xl': '1.5rem',    // 24px
    '3xl': '1.875rem',  // 30px
    '4xl': '2.25rem',   // 36px
    '5xl': '3rem',      // 48px
  },
  
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
    black: 900,
  },
  
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// ====================================
// ESPACIADO COMPARTIDO
// ====================================
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
};

// ====================================
// BORDER RADIUS COMPARTIDO
// ====================================
export const borderRadius = {
  none: '0',
  sm: '0.375rem',   // 6px
  md: '0.5rem',     // 8px
  lg: '0.75rem',    // 12px
  xl: '1rem',       // 16px
  '2xl': '1.5rem',  // 24px
  full: '9999px',
};

// ====================================
// ESTILOS DE COMPONENTES COMPARTIDOS
// ====================================
export const components = {
  button: {
    base: 'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    sizes: {
      sm: 'px-3 py-1.5 text-sm rounded-lg',
      md: 'px-4 py-2 text-base rounded-xl',
      lg: 'px-6 py-3 text-lg rounded-xl',
    },
    
    variants: {
      mciConnect: {
        primary: 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/30',
        secondary: 'bg-slate-200 hover:bg-slate-300 text-slate-900',
        outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50',
      },
      mciField: {
        primary: 'bg-gradient-to-r from-orange-600 to-yellow-500 hover:from-orange-700 hover:to-yellow-600 text-black shadow-lg shadow-orange-500/30',
        secondary: 'bg-slate-700 hover:bg-slate-600 text-white',
        outline: 'border-2 border-orange-500 text-orange-500 hover:bg-orange-500/10',
      },
    },
  },
  
  card: {
    mciConnect: 'bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow',
    mciField: 'bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600 rounded-xl shadow-lg hover:border-orange-500 transition-all',
  },
  
  input: {
    mciConnect: 'w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
    mciField: 'w-full px-4 py-2 bg-slate-800 border border-slate-700 text-white rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
  },
  
  badge: {
    mciConnect: {
      default: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800',
      success: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800',
      warning: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-800',
      error: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800',
    },
    mciField: {
      default: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30',
      success: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-green-500/20 text-green-400 border border-green-500/30',
      warning: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30',
      error: 'px-2.5 py-0.5 text-xs font-medium rounded-full bg-red-500/20 text-red-400 border border-red-500/30',
    },
  },
};

// ====================================
// HELPERS PARA APLICAR TEMAS
// ====================================
export const getTheme = (appType) => {
  return appType === 'field' ? themes.mciField : themes.mciConnect;
};

export const getComponentStyles = (component, variant, appType) => {
  const theme = appType === 'field' ? 'mciField' : 'mciConnect';
  return components[component]?.[theme]?.[variant] || components[component]?.[theme] || '';
};